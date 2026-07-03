import { NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getNotificationPreferences } from '@/lib/notification-prefs'
import { getOrCreateDirectConversation } from '@/lib/conversations'
import { getInboxConversations } from '@/lib/inbox'
import { sendNewMessageEmail } from '@/lib/send-email'

export const dynamic = 'force-dynamic'

// Don't email more than once per this window for an ongoing conversation.
const EMAIL_THROTTLE_MS = 30 * 60 * 1000 // 30 minutes

// GET /api/messages — inbox: one row per conversation, most recent message.
// The summary logic lives in lib/inbox.ts, shared with the server-rendered
// /messages page (this route is the client's refresh path).
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conversations = await getInboxConversations(userId)
  return NextResponse.json({ conversations }, { headers: { 'Cache-Control': 'no-store' } })
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
    .from('members')
    .select('clerk_user_id, first_name, preferred_name')
    .eq('clerk_user_id', recipientId)
    .eq('status', 'approved')
    .maybeSingle()

  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })

  // Snapshot the sender's display name onto the message so the conversation stays
  // readable even if the sender's application is later deleted. Prefer the
  // application name (what's shown elsewhere), falling back to Clerk's first name.
  const { data: senderApp } = await supabaseAdmin
    .from('members')
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
    messageId: message.id,
    senderId: userId,
    senderName,
    recipientId,
    recipientName: recipient.preferred_name || recipient.first_name || 'there',
    messageBody: body.trim(),
  })

  return NextResponse.json({ message })
}

async function maybeSendMessageEmail(opts: {
  messageId: string
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

    // Mark this exact message as having triggered an email for throttling.
    await supabaseAdmin
      .from('messages')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', opts.messageId)
  } catch (err) {
    console.error('[messages] email notification failed:', err)
  }
}
