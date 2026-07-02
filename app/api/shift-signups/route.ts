import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { shiftDurationHours } from '@/lib/shift-hours'
import { getMemberShiftState } from '@/lib/shift-attunement'
import { parseAttunementTasks } from '@/lib/site-config'
import { memberDisplayNames } from '@/lib/member-names'

// Member-facing multi-shift signup (shifts redesign). A member holds any number
// of shift events via member_shift_signups; this replaces the single
// camp_signups.schedule_event_id (still read for back-compat, never written here;
// cancelling a legacy-held shift clears both so hours never double-count).

async function requireApprovedCamper(userId: string) {
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const { data: application } = await supabaseAdmin
    .from('members')
    .select('id, status')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .eq('status', 'approved')
    .maybeSingle()

  return application ?? null
}

// Unique (member, event) holds across the new table + the legacy single column.
// Leads (migration 048) only exist on the new table; legacy holds are members.
async function fetchAllHolds() {
  const [{ data: many }, { data: legacy }] = await Promise.all([
    supabaseAdmin.from('member_shift_signups').select('clerk_user_id, schedule_event_id, role'),
    supabaseAdmin.from('camp_signups').select('clerk_user_id, schedule_event_id').not('schedule_event_id', 'is', null),
  ])
  const pairs = new Set<string>()
  const leadsByEvent = new Map<string, string[]>()
  for (const r of many ?? []) {
    if (!r.schedule_event_id) continue
    pairs.add(`${r.clerk_user_id}|${r.schedule_event_id}`)
    if (r.role === 'lead') {
      leadsByEvent.set(r.schedule_event_id, [...(leadsByEvent.get(r.schedule_event_id) ?? []), r.clerk_user_id])
    }
  }
  for (const r of legacy ?? []) {
    if (r.schedule_event_id) pairs.add(`${r.clerk_user_id}|${r.schedule_event_id}`)
  }
  return { pairs, leadsByEvent }
}

const countFor = (pairs: Set<string>, eventId: string) => {
  let n = 0
  pairs.forEach(p => { if (p.endsWith(`|${eventId}`)) n++ })
  return n
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const application = await requireApprovedCamper(userId)
  if (!application) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [eventsRes, holds, shiftState, flagRes, typesRes] = await Promise.all([
    supabaseAdmin
      .from('schedule_events')
      .select('id, title, subtitle, day, time, event_date, start_time, end_time, capacity, shift_type_id, needs_lead, shift_types(name, icon)')
      .eq('participation_type', 'shift')
      .eq('visible', true)
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('start_time', { ascending: true, nullsFirst: false }),
    fetchAllHolds(),
    getMemberShiftState(userId),
    supabaseAdmin.from('page_content').select('key, value').in('key', ['config_shift_signup_open', 'config_attunement_tasks']),
    supabaseAdmin.from('shift_types').select('id, name, icon').order('sort_order'),
  ])

  // Registry order drives each type's palette slot (lib/shift-colors.ts).
  const shiftTypes = (typesRes.data ?? []).map((t, i) => ({ id: t.id, name: t.name, icon: t.icon, color_index: i }))

  const config = Object.fromEntries((flagRes.data ?? []).map(r => [r.key, r.value]))
  const shiftSignupOpen = config['config_shift_signup_open'] !== 'false'

  const leadNames = await memberDisplayNames(Array.from(holds.leadsByEvent.values()).flat())

  const shifts = (eventsRes.data ?? []).map(e => {
    const st = e.shift_types as unknown as { name?: string; icon?: string | null } | null
    const leadIds = holds.leadsByEvent.get(e.id) ?? []
    const held = holds.pairs.has(`${userId}|${e.id}`)
    return {
      id: e.id,
      title: e.title,
      subtitle: e.subtitle,
      day: e.day,
      time: e.time,
      event_date: e.event_date,
      duration_hours: shiftDurationHours(e.start_time, e.end_time),
      capacity: e.capacity,
      signed_up: countFor(holds.pairs, e.id),
      shift_type_id: e.shift_type_id,
      shift_type_name: st?.name ?? 'Shift',
      shift_type_icon: st?.icon ?? null,
      held,
      held_role: held ? (leadIds.includes(userId) ? 'lead' : 'member') : null,
      lead_names: leadIds.map(id => leadNames[id]).filter(Boolean),
      needs_lead: e.needs_lead ?? false,
    }
  })

  // Owed requirements = derived (groups/roles) merged with universal typed shift
  // attunement tasks — max hours per shift type, mirroring attunement's rule.
  const owedByType = new Map<string, number>()
  for (const r of shiftState.derivedShiftRequirements) {
    owedByType.set(r.shiftTypeId, Math.max(owedByType.get(r.shiftTypeId) ?? 0, r.requiredHours))
  }
  for (const t of parseAttunementTasks(config['config_attunement_tasks'])) {
    if (t.enabled && t.requirement === 'shift' && t.shiftTypeId) {
      owedByType.set(t.shiftTypeId, Math.max(owedByType.get(t.shiftTypeId) ?? 0, t.requiredHours ?? 1))
    }
  }
  const owed = Array.from(owedByType.entries()).map(([shiftTypeId, requiredHours]) => ({
    shiftTypeId,
    requiredHours,
    heldHours: shiftState.hoursByShiftType[shiftTypeId] ?? 0,
  }))

  return NextResponse.json({ shifts, owed, shiftTypes, shiftSignupOpen })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const application = await requireApprovedCamper(userId)
  if (!application) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
    if (!holds.pairs.has(`${userId}|${event.id}`) && countFor(holds.pairs, event.id) >= event.capacity) {
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
  const user = await currentUser()
  const name = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName ?? userId
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

  const application = await requireApprovedCamper(userId)
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
