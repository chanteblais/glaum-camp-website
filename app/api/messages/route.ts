import { NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getNotificationPreferences } from '@/lib/notification-prefs'
import { sendNewMessageEmail } from '@/lib/send-email'

export const dynamic = 'force-dynamic'

// Don't email more than once per this window for an ongoing conversation.
const EMAIL_THROTTLE_MS = 30 * 60 * 1000 // 30 minutes

// GET /api/messages — inbox: one row per conversation, most recent message
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // All messages involving this user
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, sender_clerk_id, recipient_clerk_id, body, read_at, created_at')
    .or(`sender_clerk_id.eq.${userId},recipient_clerk_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ conversations: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group into conversations keyed by the other party's clerk_user_id
  const convMap = new Map<string, {
    otherUserId: string
    lastMessage: typeof data[0]
    unreadCount: number
  }>()

  for (const msg of data ?? []) {
    const otherId = msg.sender_clerk_id === userId ? msg.recipient_clerk_id : msg.sender_clerk_id
    if (!convMap.has(otherId)) {
      convMap.set(otherId, { otherUserId: otherId, lastMessage: msg, unreadCount: 0 })
    }
    if (msg.recipient_clerk_id === userId && !msg.read_at) {
      convMap.get(otherId)!.unreadCount++
    }
  }

  const conversations = Array.from(convMap.values())

  // Fetch profile info for all other users in one query
  const otherIds = conversations.map(c => c.otherUserId)
  const { data: profiles } = otherIds.length
    ? await supabaseAdmin
        .from('applications')
        .select('clerk_user_id, first_name, preferred_name, avatar_url')
        .in('clerk_user_id', otherIds)
        .eq('status', 'approved')
    : { data: [] }

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.clerk_user_id, p]))

  const result = conversations.map(c => ({
    otherUserId: c.otherUserId,
    displayName: profileMap[c.otherUserId]?.preferred_name || profileMap[c.otherUserId]?.first_name || 'Member',
    avatarUrl: profileMap[c.otherUserId]?.avatar_url ?? null,
    lastMessage: c.lastMessage.body,
    lastMessageAt: c.lastMessage.created_at,
    lastMessageFromMe: c.lastMessage.sender_clerk_id === userId,
    unreadCount: c.unreadCount,
  }))

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

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({ sender_clerk_id: userId, recipient_clerk_id: recipientId, body: body.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // In-app notification (always)
  const user = await currentUser()
  const senderName = user?.firstName ?? 'A member'
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

    await sendNewMessageEmail({
      to: email,
      recipientName: opts.recipientName,
      senderName: opts.senderName,
      preview: opts.messageBody,
      senderId: opts.senderId,
    })

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
