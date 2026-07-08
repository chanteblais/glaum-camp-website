import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getApprovedMember, memberDisplayName } from '@/lib/members'
import { getShiftSignupData, fetchAllHolds, countHoldsFor } from '@/lib/participate-data'
import { eventRangeDays, isValidOccurrence } from '@/lib/shift-occurrences'
import { getNotificationPreferences } from '@/lib/notification-prefs'
import { sendSignupConfirmationEmail } from '@/lib/send-email'
import { whenText } from '@/lib/event-reminders'

// Member-facing multi-shift signup (shifts redesign). A member holds any number
// of shift occurrences via member_shift_signups; this replaces the single
// camp_signups.schedule_event_id (still read for back-compat, never written here;
// cancelling a legacy-held shift clears both so hours never double-count).
//
// Each night of a recurring shift is a regular shift in its own right: a signup
// names its night via occurrence_date (NULL = a non-recurring shift's single
// occurrence). Capacity, holds and leads are all per (event, occurrence_date).

// The guarded configured event range (for validating an "every day" recurring
// shift's occurrence dates), fetched once per request.
async function getRangeDays(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('page_content').select('key, value')
    .in('key', ['config_event_start_date', 'config_event_end_date'])
  const c = Object.fromEntries((data ?? []).map(r => [r.key, r.value as string]))
  return eventRangeDays(c['config_event_start_date'], c['config_event_end_date'])
}

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

  const { schedule_event_id, occurrence_date: rawDate, role: rawRole } = await req.json()
  if (!schedule_event_id) return NextResponse.json({ error: 'schedule_event_id required' }, { status: 400 })
  // Optional participation role (migration 048); omitting it keeps an existing
  // signup's role, so a plain re-sign never demotes a lead.
  if (rawRole !== undefined && rawRole !== 'member' && rawRole !== 'lead') {
    return NextResponse.json({ error: 'role must be "member" or "lead"' }, { status: 400 })
  }
  const role = rawRole as 'member' | 'lead' | undefined
  const occurrenceDate: string | null = rawDate ?? null

  const { data: flag } = await supabaseAdmin
    .from('page_content').select('value').eq('key', 'config_shift_signup_open').maybeSingle()
  if (flag?.value === 'false') {
    return NextResponse.json({ error: 'Shift signup is currently closed.' }, { status: 403 })
  }

  const { data: event } = await supabaseAdmin
    .from('schedule_events')
    .select('id, title, capacity, participation_type, visible, needs_lead, is_recurring, recurrence_days, event_date, time, start_time')
    .eq('id', schedule_event_id)
    .single()
  if (!event || event.participation_type !== 'shift' || !event.visible) {
    return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  }
  // The night must be a real occurrence: a date on a recurring shift (one of its
  // nights), or NULL on a non-recurring shift.
  const rangeDays = await getRangeDays()
  if (!isValidOccurrence(event, occurrenceDate, rangeDays)) {
    return NextResponse.json({
      error: event.is_recurring ? 'occurrence_date must be one of this shift’s nights' : 'This shift is not recurring',
    }, { status: 400 })
  }
  // Lead role exists only on events the organizer opted in (049).
  if (role === 'lead' && !event.needs_lead) {
    return NextResponse.json({ error: 'This shift does not have a lead role' }, { status: 400 })
  }

  let existingQuery = supabaseAdmin
    .from('member_shift_signups')
    .select('id, role')
    .eq('clerk_user_id', userId)
    .eq('schedule_event_id', schedule_event_id)
  existingQuery = occurrenceDate == null
    ? existingQuery.is('occurrence_date', null)
    : existingQuery.eq('occurrence_date', occurrenceDate)
  const { data: existing } = await existingQuery.maybeSingle()

  if (event.capacity != null && !existing) {
    // Capacity is per night: only holds on THIS occurrence count.
    const holds = await fetchAllHolds()
    if (countHoldsFor(holds.pairs, event.id, occurrenceDate) >= event.capacity) {
      return NextResponse.json({ error: `"${event.title}" is full` }, { status: 409 })
    }
  }

  // Explicit insert/update (partial unique indexes don't infer cleanly in a
  // PostgREST upsert). Re-signing the same night is a no-op bar a role change.
  if (existing) {
    if (role && role !== existing.role) {
      const { error } = await supabaseAdmin
        .from('member_shift_signups').update({ role }).eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await supabaseAdmin
      .from('member_shift_signups')
      .insert({ clerk_user_id: userId, schedule_event_id, occurrence_date: occurrenceDate, role: role ?? 'member' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Confirmation email on a fresh hold (best-effort — never block the signup),
    // gated by the member's gathering/shift email preference.
    try {
      const prefs = await getNotificationPreferences(userId)
      const nightDate = occurrenceDate ?? (event as { event_date?: string | null }).event_date ?? null
      if (prefs.email_event_reminders && application.email) {
        await sendSignupConfirmationEmail({
          to: application.email,
          recipientName: memberDisplayName(application, userId),
          kind: 'shift',
          title: event.title,
          whenText: nightDate
            ? whenText(nightDate, (event as { time?: string | null; start_time?: string | null }).time ?? (event as { start_time?: string | null }).start_time)
            : 'Time to be confirmed',
          href: '/schedule',
        })
      }
    } catch (e) {
      console.error('[shift-signups] confirmation email failed:', e)
    }
  }

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
      details: { schedule_event_id, occurrence_date: occurrenceDate, shift_title: event.title },
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
  const occurrenceDate = req.nextUrl.searchParams.get('occurrence_date') // null = non-recurring hold

  // Cancelling stays allowed while signup is closed (matches legacy behaviour).
  let del = supabaseAdmin
    .from('member_shift_signups')
    .delete()
    .eq('clerk_user_id', userId)
    .eq('schedule_event_id', schedule_event_id)
  del = occurrenceDate == null ? del.is('occurrence_date', null) : del.eq('occurrence_date', occurrenceDate)
  const { error } = await del
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
