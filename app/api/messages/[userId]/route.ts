import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/messages/[userId] — fetch thread between current user and [userId].
// Read-only: marking messages as read is handled by POST /api/messages/[userId]/read.
export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const { userId: myId } = await auth()
  if (!myId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const otherId = params.userId

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, sender_clerk_id, recipient_clerk_id, body, read, read_at, created_at')
    .or(
      `and(sender_clerk_id.eq.${myId},recipient_clerk_id.eq.${otherId}),and(sender_clerk_id.eq.${otherId},recipient_clerk_id.eq.${myId})`
    )
    .order('created_at', { ascending: true })

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ messages: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}
