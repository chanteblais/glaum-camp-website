import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { findDirectConversation } from '@/lib/conversations'

export const dynamic = 'force-dynamic'

// GET /api/messages/[userId] — fetch thread between current user and [userId].
// Read-only: marking messages as read is handled by POST /api/messages/[userId]/read.
// Read receipts (read / read_at) are derived from the recipient's last_read_at.
export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const { userId: myId } = await auth()
  if (!myId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const otherId = params.userId

  const convId = await findDirectConversation(myId, otherId)
  if (!convId) return NextResponse.json({ messages: [] })

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, sender_clerk_id, recipient_clerk_id, body, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ messages: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Each participant's read cursor; a message is "read" once its recipient's
  // last_read_at is at or past the message's timestamp.
  const { data: parts } = await supabaseAdmin
    .from('conversation_participants')
    .select('clerk_user_id, last_read_at')
    .eq('conversation_id', convId)
  const lastReadBy = new Map((parts ?? []).map(p => [p.clerk_user_id, p.last_read_at as string | null]))

  const messages = (data ?? []).map(m => {
    const recipientId = m.sender_clerk_id === myId ? otherId : myId
    const lr = lastReadBy.get(recipientId)
    const read = !!lr && new Date(m.created_at) <= new Date(lr)
    return {
      id: m.id,
      sender_clerk_id: m.sender_clerk_id,
      recipient_clerk_id: m.recipient_clerk_id ?? recipientId,
      body: m.body,
      read,
      read_at: read ? lr : null,
      created_at: m.created_at,
    }
  })

  return NextResponse.json({ messages }, { headers: { 'Cache-Control': 'no-store' } })
}
