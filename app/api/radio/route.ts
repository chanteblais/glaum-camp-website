import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getApprovedMember } from '@/lib/members'
import { postSourcedRadioEvent } from '@/lib/radio'

// POST — a member puts a moment on the air (kind 'voice'). Radio is an
// interactive heartbeat, not an organizer-only megaphone: any approved member
// can share a short moment. One line, no threads, no replies — it may get
// lost in the stream, and that's fine.
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await getApprovedMember(userId)
  if (!member) {
    return NextResponse.json({ error: 'Only approved members can broadcast' }, { status: 403 })
  }

  const { message } = await req.json().catch(() => ({}))
  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const actorName = member.preferred_name || member.first_name || 'A member'
  await postSourcedRadioEvent('voice', {
    kind: 'voice',
    message: message.trim().slice(0, 200),
    icon: '✦',
    actorClerkId: userId,
    actorName,
  })

  return NextResponse.json({ success: true })
}
