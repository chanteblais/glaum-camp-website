import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/messages/[userId]/read — mark messages from [userId] to the
// current user as read (sets the read_at timestamp). Called by the thread
// view when the conversation is viewed.
export async function POST(_req: Request, { params }: { params: { userId: string } }) {
  const { userId: myId } = await auth()
  if (!myId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const otherId = params.userId

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('messages')
    .update({ read: true, read_at: now })
    .eq('sender_clerk_id', otherId)
    .eq('recipient_clerk_id', myId)
    .is('read_at', null)

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ ok: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
