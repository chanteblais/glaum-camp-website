import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getNotificationPreferences } from '@/lib/notification-prefs'
import { getOrCreateDirectConversation, findDirectConversation } from '@/lib/conversations'
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

  // Recipient check, sender-name snapshot, and conversation lookup are all
  // independent — one round-trip instead of four (this path previously also
  // paid a Clerk Backend-API call just for a name fallback).
  const [{ data: recipient }, { data: senderApp }, existingConvId] = await Promise.all([
    // Verify recipient is an approved member (email feeds the notification below).
    supabaseAdmin
      .from('members')
      .select('clerk_user_id, first_name, preferred_name, email')
      .eq('clerk_user_id', recipientId)
      .eq('status', 'approved')
      .maybeSingle(),
    // Snapshot the sender's display name onto the message so the conversation
    // stays readable even if the sender's application is later deleted.
    // status rides along for the sender-side membership gate below.
    supabaseAdmin
      .from('members')
      .select('preferred_name, first_name, status')
      .eq('clerk_user_id', userId)
      .maybeSingle(),
    // Read-only lookup here; creation (below) waits for the recipient check so
    // a bad recipient id never leaves a dangling conversation.
    findDirectConversation(userId, recipientId),
  ])

  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })

  // Sender must be an approved member too — messaging is a members-only space
  // (the recipient side was already enforced above).
  if (senderApp?.status !== 'approved') {
    return NextResponse.json({ error: 'Only approved members can send messages' }, { status: 403 })
  }

  const senderName = senderApp?.preferred_name || senderApp?.first_name || 'A member'

  // Attach to the direct conversation (resolve-or-create), so the message lives in
  // the conversations model. recipient_clerk_id is still set for DMs (legacy reads).
  const conversationId = existingConvId ?? await getOrCreateDirectConversation(userId, recipientId)

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({ conversation_id: conversationId, sender_clerk_id: userId, recipient_clerk_id: recipientId, body: body.trim(), sender_name: senderName })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // In-app notification and the (guarded, best-effort) email are independent.
  await Promise.all([
    supabaseAdmin.from('user_notifications').insert({
      clerk_user_id: recipientId,
      event_type: 'new_message',
      message: `${senderName} sent you a message`,
      details: { senderId: userId, messageId: message.id },
    }),
    maybeSendMessageEmail({
      messageId: message.id,
      senderId: userId,
      senderName,
      recipientId,
      recipientName: recipient.preferred_name || recipient.first_name || 'there',
      recipientEmail: recipient.email ?? null,
      messageBody: body.trim(),
    }),
  ])

  return NextResponse.json({ message })
}

async function maybeSendMessageEmail(opts: {
  messageId: string
  senderId: string
  senderName: string
  recipientId: string
  recipientName: string
  recipientEmail: string | null
  messageBody: string
}) {
  try {
    // The preference and throttle checks are independent — one round-trip.
    const since = new Date(Date.now() - EMAIL_THROTTLE_MS).toISOString()
    const [prefs, { data: recent }] = await Promise.all([
      // Respect the recipient's preference.
      getNotificationPreferences(opts.recipientId),
      // Throttle: skip if we already emailed this recipient about a message
      // from this sender within the throttle window.
      supabaseAdmin
        .from('messages')
        .select('id')
        .eq('sender_clerk_id', opts.senderId)
        .eq('recipient_clerk_id', opts.recipientId)
        .not('notified_at', 'is', null)
        .gte('notified_at', since)
        .limit(1),
    ])
    if (!prefs.email_new_message) return
    if (recent && recent.length > 0) return

    // The member row's email (fetched with the recipient check) is canonical —
    // members sign in with it. Clerk remains the fallback for rows without one.
    let email = opts.recipientEmail
    if (!email) {
      const client = await clerkClient()
      const recipientUser = await client.users.getUser(opts.recipientId)
      email = recipientUser.emailAddresses[0]?.emailAddress ?? null
    }
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
