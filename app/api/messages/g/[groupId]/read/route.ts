import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { findGroupConversation, isGroupMember, markConversationRead } from '@/lib/conversations'

export const dynamic = 'force-dynamic'

// POST /api/messages/g/[groupId]/read — advance my read cursor for the group thread.
export async function POST(_req: Request, { params }: { params: { groupId: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await isGroupMember(params.groupId, userId))) return NextResponse.json({ ok: true })

  const convId = await findGroupConversation(params.groupId)
  if (convId) await markConversationRead(convId, userId)

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
