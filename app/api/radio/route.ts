import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getApprovedMember } from '@/lib/members'
import { parseRadioSources, postRadioEvent } from '@/lib/radio'

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

  // Source-toggle check inline (not the fire-and-forget helper): the composer
  // is interactive, so a member deserves a real error — a hook can swallow a
  // failed post, a composer must not pretend it landed.
  const { data: configRow } = await supabaseAdmin
    .from('page_content')
    .select('value')
    .eq('key', 'config_radio')
    .maybeSingle()
  if (!parseRadioSources(configRow?.value).voice) {
    return NextResponse.json({ error: 'Member broadcasts are currently off' }, { status: 403 })
  }

  const actorName = member.preferred_name || member.first_name || 'A member'
  const id = await postRadioEvent({
    kind: 'voice',
    message: message.trim().slice(0, 200),
    icon: '✦',
    actorClerkId: userId,
    actorName,
  })
  if (!id) return NextResponse.json({ error: 'Failed to post — try again' }, { status: 500 })

  return NextResponse.json({ success: true, id })
}
