import { NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  findGroupConversation,
  getOrCreateGroupConversation,
  isGroupMember,
  markConversationRead,
} from '@/lib/conversations'
import { getNotificationPreferences } from '@/lib/notification-prefs'
import { sendGroupMentionEmail, sendGroupActivityEmail } from '@/lib/send-email'

export const dynamic = 'force-dynamic'

// Don't email the same person about mentions in the same group more than once
// per this window (in-app notifications are still created every time).
const MENTION_EMAIL_THROTTLE_MS = 30 * 60 * 1000

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// GET /api/messages/g/[groupId] — the group's thread (flat, chronological).
// Access is members-only.
export async function GET(_req: Request, { params }: { params: { groupId: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await isGroupMember(params.groupId, userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const convId = await findGroupConversation(params.groupId)
  if (!convId) return NextResponse.json({ messages: [] })

  const { data: msgs, error } = await supabaseAdmin
    .from('messages')
    .select('id, sender_clerk_id, body, created_at, sender_name, parent_message_id')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ messages: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Resolve sender display name + avatar from current profiles, falling back to the
  // snapshot name so messages from departed members stay readable.
  const senderIds = Array.from(new Set((msgs ?? []).map(m => m.sender_clerk_id)))
  const { data: profiles } = senderIds.length
    ? await supabaseAdmin
        // Phase 5: identity resolution reads the canonical `members` table.
        .from('members')
        .select('clerk_user_id, first_name, preferred_name, avatar_url')
        .in('clerk_user_id', senderIds)
    : { data: [] }
  const profMap = new Map((profiles ?? []).map(p => [p.clerk_user_id, p]))

  const messages = (msgs ?? []).map(m => {
    const p = profMap.get(m.sender_clerk_id)
    return {
      id: m.id,
      sender_clerk_id: m.sender_clerk_id,
      sender_name: p?.preferred_name || p?.first_name || m.sender_name || 'Member',
      avatar_url: p?.avatar_url ?? null,
      body: m.body,
      created_at: m.created_at,
      parent_message_id: m.parent_message_id ?? null,
    }
  })

  return NextResponse.json({ messages }, { headers: { 'Cache-Control': 'no-store' } })
}

// POST /api/messages/g/[groupId] — post a message to the group thread.
// Quiet by default: ordinary posts create no emails or notification rows — the
// unread badge (last_read_at) is the in-app signal. @mentions are the exception:
// they notify (in-app) and email the mentioned member (see notifyMentions).
export async function POST(req: Request, { params }: { params: { groupId: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await isGroupMember(params.groupId, userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { body, parentMessageId } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'body is required' }, { status: 400 })
  if (body.trim().length > 2000) return NextResponse.json({ error: 'Message too long' }, { status: 400 })

  const convId = await getOrCreateGroupConversation(params.groupId)

  // Replies are one level deep: a parent must be a top-level message in this
  // conversation (you can't reply to a reply).
  let parent_message_id: string | null = null
  if (parentMessageId) {
    const { data: parent } = await supabaseAdmin
      .from('messages')
      .select('id, conversation_id, parent_message_id')
      .eq('id', parentMessageId)
      .maybeSingle()
    if (!parent || parent.conversation_id !== convId || parent.parent_message_id !== null) {
      return NextResponse.json({ error: 'Invalid parent message' }, { status: 400 })
    }
    parent_message_id = parentMessageId
  }

  // Snapshot the sender's display name (the messages table has no FK to applications).
  const { data: senderApp } = await supabaseAdmin
    .from('members')
    .select('preferred_name, first_name')
    .eq('clerk_user_id', userId)
    .maybeSingle()
  const user = await currentUser()
  const senderName = senderApp?.preferred_name || senderApp?.first_name || user?.firstName || 'A member'

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({ conversation_id: convId, sender_clerk_id: userId, sender_name: senderName, body: body.trim(), parent_message_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // I've seen everything up to my own post.
  await markConversationRead(convId, userId)

  // @mentions pierce the quiet default: notify (in-app) + email the mentioned
  // members. Opted-in members get a throttled activity email. Best-effort — never
  // block the post on notifications.
  try {
    const mentionedIds = await notifyMentions({
      groupId: params.groupId,
      messageId: message.id,
      senderId: userId,
      senderName,
      body: body.trim(),
    })
    await notifyOptedIn({
      groupId: params.groupId,
      conversationId: convId,
      messageCreatedAt: message.created_at,
      senderId: userId,
      senderName,
      body: body.trim(),
      excludeIds: mentionedIds,
    })
  } catch (err) {
    console.error('[group message] notify failed:', err)
  }

  return NextResponse.json({ message })
}

// Parse @mentions of group members out of the body and notify them. Mentions are
// matched against current member display names (the autocomplete inserts the exact
// name), so this also catches mentions typed in replies (which have no autocomplete).
async function notifyMentions(opts: {
  groupId: string
  messageId: string
  senderId: string
  senderName: string
  body: string
}): Promise<string[]> {
  const { groupId, messageId, senderId, senderName, body } = opts
  if (!body.includes('@')) return [] // fast path: no mentions possible

  // Group members other than the sender.
  const { data: memberRows } = await supabaseAdmin
    .from('group_members')
    .select('clerk_user_id')
    .eq('group_id', groupId)
  const memberIds = (memberRows ?? []).map(r => r.clerk_user_id).filter(id => id && id !== senderId)
  if (!memberIds.length) return []

  const { data: apps } = await supabaseAdmin
    .from('members')
    .select('clerk_user_id, first_name, preferred_name')
    .in('clerk_user_id', memberIds)

  // Which members are mentioned (whole-token match on "@Name").
  const mentioned = (apps ?? []).filter(a => {
    const name = a.preferred_name || a.first_name
    if (!name) return false
    return new RegExp(`@${escapeRegExp(name)}(?![\\w])`, 'i').test(body)
  })
  if (!mentioned.length) return []

  const { data: group } = await supabaseAdmin.from('groups').select('name').eq('id', groupId).maybeSingle()
  const groupName = group?.name || 'a group'
  const client = await clerkClient()
  const since = new Date(Date.now() - MENTION_EMAIL_THROTTLE_MS).toISOString()

  for (const a of mentioned) {
    const recipientId = a.clerk_user_id
    const recipientName = a.preferred_name || a.first_name || 'there'

    // Throttle email (look for a prior mention notification before creating this one).
    const { data: recent } = await supabaseAdmin
      .from('user_notifications')
      .select('id')
      .eq('clerk_user_id', recipientId)
      .eq('event_type', 'group_mention')
      .eq('details->>groupId', groupId)
      .gte('created_at', since)
      .limit(1)
    const throttled = !!(recent && recent.length)

    // In-app notification — always.
    await supabaseAdmin.from('user_notifications').insert({
      clerk_user_id: recipientId,
      event_type: 'group_mention',
      message: `${senderName} mentioned you in ${groupName}`,
      details: { groupId, messageId },
    })

    if (throttled) continue

    // Email — gated by the recipient's message-email preference.
    try {
      const prefs = await getNotificationPreferences(recipientId)
      if (!prefs.email_new_message) continue
      const recipientUser = await client.users.getUser(recipientId)
      const email = recipientUser.emailAddresses[0]?.emailAddress
      if (!email) continue
      await sendGroupMentionEmail({ to: email, recipientName, senderName, groupName, groupId, preview: body })
    } catch (err) {
      console.error('[group message] mention email failed:', err)
    }
  }

  return mentioned.map(a => a.clerk_user_id)
}

// Email members who opted into this thread's emails. Throttled per *conversation*:
// only fires when the thread was quiet (no prior message within the window), so a
// burst of messages yields one nudge rather than per-message spam. `excludeIds` are
// the just-mentioned members (already emailed).
async function notifyOptedIn(opts: {
  groupId: string
  conversationId: string
  messageCreatedAt: string
  senderId: string
  senderName: string
  body: string
  excludeIds: string[]
}) {
  const { groupId, conversationId, messageCreatedAt, senderId, senderName, body, excludeIds } = opts

  // Opted-in participants other than the sender (and not already mentioned).
  const { data: optedIn } = await supabaseAdmin
    .from('conversation_participants')
    .select('clerk_user_id')
    .eq('conversation_id', conversationId)
    .eq('email_opt_in', true)
    .neq('clerk_user_id', senderId)
  const exclude = new Set([...excludeIds, senderId])
  const recipientIds = (optedIn ?? []).map(p => p.clerk_user_id).filter(id => id && !exclude.has(id))
  if (!recipientIds.length) return

  // Per-conversation throttle: skip if there was another message in the window.
  const since = new Date(Date.now() - MENTION_EMAIL_THROTTLE_MS).toISOString()
  const { data: priorBurst } = await supabaseAdmin
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .lt('created_at', messageCreatedAt)
    .gte('created_at', since)
    .limit(1)
  if (priorBurst && priorBurst.length) return

  const { data: group } = await supabaseAdmin.from('groups').select('name').eq('id', groupId).maybeSingle()
  const groupName = group?.name || 'a group'
  const { data: apps } = await supabaseAdmin
    .from('members')
    .select('clerk_user_id, first_name, preferred_name')
    .in('clerk_user_id', recipientIds)
  const nameById = new Map((apps ?? []).map(a => [a.clerk_user_id, a.preferred_name || a.first_name || 'there']))
  const client = await clerkClient()

  for (const recipientId of recipientIds) {
    try {
      const prefs = await getNotificationPreferences(recipientId)
      if (!prefs.email_new_message) continue
      const recipientUser = await client.users.getUser(recipientId)
      const email = recipientUser.emailAddresses[0]?.emailAddress
      if (!email) continue
      await sendGroupActivityEmail({ to: email, recipientName: nameById.get(recipientId) || 'there', senderName, groupName, groupId, preview: body })
    } catch (err) {
      console.error('[group message] opt-in email failed:', err)
    }
  }
}
