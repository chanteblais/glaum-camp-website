import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getApprovedMember, memberDisplayName } from '@/lib/members'
import { getShiftSignupData, fetchAllHolds, countHoldsFor } from '@/lib/participate-data'

// Member-facing multi-shift signup (shifts redesign). A member holds any number
// of shift events via member_shift_signups; this replaces the single
// camp_signups.schedule_event_id (still read for back-compat, never written here;
// cancelling a legacy-held shift clears both so hours never double-count).

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // The approval gate runs alongside the data batch — it only gates the
  // response, not what we fetch, so there's no need to serialize on it.
  // Data assembly lives in lib/participate-data.ts, shared with the
  // server-rendered /participate page (this route is the client's refresh path).
  const [application, data] = await Promise.all([
    getApprovedMember(userId),
    getShiftSignupData(userId),
  ])

  if (!application) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const application = await getApprovedMember(userId)
  if (!application) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (application.suspended_at) {
    return NextResponse.json({ error: 'Your attendance is suspended — resume it on your profile to sign up for shifts.' }, { status: 403 })
  }

  const { schedule_event_id, role: rawRole } = await req.json()
  if (!schedule_event_id) return NextResponse.json({ error: 'schedule_event_id required' }, { status: 400 })
  // Optional participation role (migration 048); omitting it keeps an existing
  // signup's role, so a plain re-sign never demotes a lead.
  if (rawRole !== undefined && rawRole !== 'member' && rawRole !== 'lead') {
    return NextResponse.json({ error: 'role must be "member" or "lead"' }, { status: 400 })
  }
  const role = rawRole as 'member' | 'lead' | undefined

  const { data: flag } = await supabaseAdmin
    .from('page_content').select('value').eq('key', 'config_shift_signup_open').maybeSingle()
  if (flag?.value === 'false') {
    return NextResponse.json({ error: 'Shift signup is currently closed.' }, { status: 403 })
  }

  const { data: event } = await supabaseAdmin
    .from('schedule_events')
    .select('id, title, capacity, participation_type, visible, needs_lead')
    .eq('id', schedule_event_id)
    .single()
  if (!event || event.participation_type !== 'shift' || !event.visible) {
    return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  }
  // Lead role exists only on events the organizer opted in (049).
  if (role === 'lead' && !event.needs_lead) {
    return NextResponse.json({ error: 'This shift does not have a lead role' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('member_shift_signups')
    .select('id, role')
    .eq('clerk_user_id', userId)
    .eq('schedule_event_id', schedule_event_id)
    .maybeSingle()

  if (event.capacity != null && !existing) {
    const holds = await fetchAllHolds()
    if (!holds.pairs.has(`${userId}|${event.id}`) && countHoldsFor(holds.pairs, event.id) >= event.capacity) {
      return NextResponse.json({ error: `"${event.title}" is full` }, { status: 409 })
    }
  }

  // Unique constraint makes re-signing the same shift a no-op (bar a role change).
  const { error } = await supabaseAdmin
    .from('member_shift_signups')
    .upsert(
      { clerk_user_id: userId, schedule_event_id, role: role ?? existing?.role ?? 'member' },
      { onConflict: 'clerk_user_id,schedule_event_id' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Admin notification (same shape as the legacy shift_change event). A role
  // change on an existing signup reads as such, not as a fresh signup.
  const name = memberDisplayName(application, userId)
  const message = existing && role && role !== existing.role
    ? role === 'lead'
      ? `${name} offered to lead "${event.title}"`
      : `${name} stepped back from leading "${event.title}"`
    : `${name} signed up ${role === 'lead' ? 'to lead' : 'for'} "${event.title}"`
  if (!existing || (role && role !== existing.role)) {
    await supabaseAdmin.from('admin_notifications').insert({
      application_id: application.id,
      event_type: 'shift_change',
      message,
      details: { schedule_event_id, shift_title: event.title },
    })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const application = await getApprovedMember(userId)
  if (!application) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const schedule_event_id = req.nextUrl.searchParams.get('schedule_event_id')
  if (!schedule_event_id) return NextResponse.json({ error: 'schedule_event_id required' }, { status: 400 })

  // Cancelling stays allowed while signup is closed (matches legacy behaviour).
  const { error } = await supabaseAdmin
    .from('member_shift_signups')
    .delete()
    .eq('clerk_user_id', userId)
    .eq('schedule_event_id', schedule_event_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Clear the legacy single-shift column too if it pointed at this event, so
  // the hours union (lib/shift-attunement.ts) doesn't keep counting it.
  await supabaseAdmin
    .from('camp_signups')
    .update({ schedule_event_id: null })
    .eq('clerk_user_id', userId)
    .eq('schedule_event_id', schedule_event_id)

  return NextResponse.json({ success: true })
}
