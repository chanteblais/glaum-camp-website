import { NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getNotificationPreferences } from '@/lib/notification-prefs'
import { getMyConversations, getOrCreateDirectConversation } from '@/lib/conversations'
import { sendNewMessageEmail } from '@/lib/send-email'

export const dynamic = 'force-dynamic'

// Don't email more than once per this window for an ongoing conversation.
const EMAIL_THROTTLE_MS = 30 * 60 * 1000 // 30 minutes

// GET /api/messages — inbox: one row per conversation, most recent message.
// Backed by the conversations model. Direct conversations appear only once they
// have messages (legacy behavior); group conversations always appear for groups
// the member belongs to, so an empty group still has an entry point.
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let convs
  try {
    convs = await getMyConversations(userId)
  } catch {
    return NextResponse.json({ conversations: [] })
  }
  if (!convs.length) return NextResponse.json({ conversations: [] })

  const convById = new Map(convs.map(c => [c.conversationId, c]))

  // All messages across my conversations, newest first.
  const { data: msgs } = await supabaseAdmin
    .from('messages')
    .select('conversation_id, sender_clerk_id, body, created_at, sender_name')
    .in('conversation_id', convs.map(c => c.conversationId))
    .order('created_at', { ascending: false })

  // Per-conversation summary (last message + unread + other-party snapshot name).
  type Summary = { lastBody: string; lastAt: string; lastFromMe: boolean; unread: number; otherName: string | null }
  const sumByConv = new Map<string, Summary>()
  for (const m of msgs ?? []) {
    const conv = convById.get(m.conversation_id)
    if (!conv) continue
    let s = sumByConv.get(m.conversation_id)
    if (!s) {
      // Newest-first, so the first message seen is the conversation's last.
      s = { lastBody: m.body, lastAt: m.created_at, lastFromMe: m.sender_clerk_id === userId, unread: 0, otherName: null }
      sumByConv.set(m.conversation_id, s)
    }
    if (conv.type === 'direct' && m.sender_clerk_id === conv.otherUserId && !s.otherName) {
      s.otherName = m.sender_name ?? null
    }
    if (m.sender_clerk_id !== userId) {
      if (!conv.lastReadAt || new Date(m.created_at) > new Date(conv.lastReadAt)) s.unread++
    }
  }

  // Group names/icons.
  const groupIds = convs.filter(c => c.type === 'group' && c.groupId).map(c => c.groupId as string)
  const { data: groupRows } = groupIds.length
    ? await supabaseAdmin.from('groups').select('id, name, icon').in('id', groupIds)
    : { data: [] }
  const groupById = new Map((groupRows ?? []).map(g => [g.id, g]))

  // Profiles for the other party in each direct conversation.
  const otherIds = convs.filter(c => c.type === 'direct' && c.otherUserId).map(c => c.otherUserId as string)
  const { data: profiles } = otherIds.length
    ? await supabaseAdmin
        .from('applications')
        .select('clerk_user_id, first_name, preferred_name, avatar_url')
        .in('clerk_user_id', otherIds)
        .eq('status', 'approved')
    : { data: [] }
  const profileMap = new Map((profiles ?? []).map(p => [p.clerk_user_id, p]))

  const rows = convs.map(conv => {
    const s = sumByConv.get(conv.conversationId)
    const unreadCount = conv.muted ? 0 : (s?.unread ?? 0) // muted threads don't badge
    if (conv.type === 'group') {
      const g = conv.groupId ? groupById.get(conv.groupId) : null
      return {
        kind: 'group' as const,
        groupId: conv.groupId,
        displayName: g?.name ?? 'Group',
        icon: g?.icon ?? null,
        avatarUrl: null,
        muted: conv.muted,
        lastMessage: s?.lastBody ?? null,
        lastMessageAt: s?.lastAt ?? null,
        lastMessageFromMe: s?.lastFromMe ?? false,
        unreadCount,
      }
    }
    const prof = conv.otherUserId ? profileMap.get(conv.otherUserId) : null
    return {
      kind: 'direct' as const,
      otherUserId: conv.otherUserId,
      displayName: prof?.preferred_name || prof?.first_name || s?.otherName || 'Member',
      avatarUrl: prof?.avatar_url ?? null,
      icon: null,
      muted: conv.muted,
      lastMessage: s?.lastBody ?? null,
      lastMessageAt: s?.lastAt ?? null,
      lastMessageFromMe: s?.lastFromMe ?? false,
      unreadCount,
    }
  })

  // Direct conversations with no messages don't show; groups always do.
  const result = rows
    .filter(r => r.kind === 'group' || r.lastMessageAt != null)
    .sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      if (a.lastMessageAt) return -1
      if (b.lastMessageAt) return 1
      return a.displayName.localeCompare(b.displayName)
    })

  return NextResponse.json({ conversations: result }, { headers: { 'Cache-Control': 'no-store' } })
}

// POST /api/messages — send a message
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipientId, body } = await req.json()
  if (!recipientId || !body?.trim()) {
    return NextResponse.json({ error: 'recipientId and body are required' }, { status: 400 })
  }
  if (body.trim().length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  }
  if (recipientId === userId) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  // Verify recipient is an approved member
  const { data: recipient } = await supabaseAdmin
    .from('applications')
    .select('clerk_user_id, first_name, preferred_name')
    .eq('clerk_user_id', recipientId)
    .eq('status', 'approved')
    .maybeSingle()

  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })

  // Snapshot the sender's display name onto the message so the conversation stays
  // readable even if the sender's application is later deleted. Prefer the
  // application name (what's shown elsewhere), falling back to Clerk's first name.
  const { data: senderApp } = await supabaseAdmin
    .from('applications')
    .select('preferred_name, first_name')
    .eq('clerk_user_id', userId)
    .maybeSingle()
  const user = await currentUser()
  const senderName = senderApp?.preferred_name || senderApp?.first_name || user?.firstName || 'A member'

  // Attach to the direct conversation (resolve-or-create), so the message lives in
  // the conversations model. recipient_clerk_id is still set for DMs (legacy reads).
  const conversationId = await getOrCreateDirectConversation(userId, recipientId)

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({ conversation_id: conversationId, sender_clerk_id: userId, recipient_clerk_id: recipientId, body: body.trim(), sender_name: senderName })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // In-app notification (always)
  await supabaseAdmin.from('user_notifications').insert({
    clerk_user_id: recipientId,
    event_type: 'new_message',
    message: `${senderName} sent you a message`,
    details: { senderId: userId, messageId: message.id },
  })

  // Email notification (best-effort, non-blocking semantics — awaited but guarded)
  await maybeSendMessageEmail({
    senderId: userId,
    senderName,
    recipientId,
    recipientName: recipient.preferred_name || recipient.first_name || 'there',
    messageBody: body.trim(),
  })

  return NextResponse.json({ message })
}

async function maybeSendMessageEmail(opts: {
  senderId: string
  senderName: string
  recipientId: string
  recipientName: string
  messageBody: string
}) {
  try {
    // Respect the recipient's preference.
    const prefs = await getNotificationPreferences(opts.recipientId)
    if (!prefs.email_new_message) return

    // Throttle: skip if we already emailed this recipient about a message from
    // this sender within the throttle window.
    const since = new Date(Date.now() - EMAIL_THROTTLE_MS).toISOString()
    const { data: recent } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('sender_clerk_id', opts.senderId)
      .eq('recipient_clerk_id', opts.recipientId)
      .not('notified_at', 'is', null)
      .gte('notified_at', since)
      .limit(1)

    if (recent && recent.length > 0) return

    // Resolve the recipient's email address from Clerk.
    const client = await clerkClient()
    const recipientUser = await client.users.getUser(opts.recipientId)
    const email = recipientUser.emailAddresses[0]?.emailAddress
    if (!email) return

    const result = await sendNewMessageEmail({
      to: email,
      recipientName: opts.recipientName,
      senderName: opts.senderName,
      preview: opts.messageBody,
      senderId: opts.senderId,
    })

    // Only stamp notified_at when Resend actually accepted the send. Marking it
    // on failure would both hide the error and trip the throttle, silently
    // suppressing retries for the next 30 minutes.
    if (!result.ok) {
      console.error('[messages] new-message email rejected by Resend:', result.error)
      return
    }

    // Mark this message as having triggered an email for throttling.
    await supabaseAdmin
      .from('messages')
      .update({ notified_at: new Date().toISOString() })
      .eq('sender_clerk_id', opts.senderId)
      .eq('recipient_clerk_id', opts.recipientId)
      .is('notified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
  } catch (err) {
    console.error('[messages] email notification failed:', err)
  }
}
