import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { findDirectConversation } from '@/lib/conversations'

export const dynamic = 'force-dynamic'

// POST /api/messages/[userId]/read — mark the conversation with [userId] as read
// up to now by advancing my participant read cursor (last_read_at). Called by the
// thread view when the conversation is viewed.
export async function POST(_req: Request, { params }: { params: { userId: string } }) {
  const { userId: myId } = await auth()
  if (!myId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const otherId = params.userId

  const convId = await findDirectConversation(myId, otherId)
  if (convId) {
    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('clerk_user_id', myId)

    if (error && error.code !== '42P01') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
