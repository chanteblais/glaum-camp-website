import { supabaseAdmin } from './supabase'
import { shiftDurationHours } from './shift-hours'
import { parseAttunementTasks } from './site-config'

// Community-wide shift-hours rollup for the admin Overview, built from shift
// events' real durations × member_shift_signups ∪ the legacy camp_signups
// single column (deduped).
//
// A recurring shift EVENT counts once per occurrence — its listed
// recurrence_days, or every day of the configured event range (same rules as
// the schedule calendar), so "8 shifts" here matches what the calendar shows.
// But shift ATTENDANCE is per-night: one signup = one occurrence's hours (a
// nightly miso shift doesn't obligate every night) — same count-once credit
// as member attunement (lib/shift-attunement.ts). The signup row carries no
// date, so which occurrence a member works is unrecorded; empty-shift counts
// for a recurring series are therefore occurrences − signups.
//
// The section is framed as the organizer's supply-vs-demand ledger:
//   PROMISED (supply) — what members collectively owe by requirement: the
//     universal attunement 'shift' tasks (every approved member) merged with
//     group/role requirements (required_shift_type_id + required_shift_hours),
//     max per type per member, mirroring attunement's rule (being in two
//     things that both want teardown means the bigger ask, not both).
//   TO FILL (demand) — spot-hours the schedule opens: occurrences × duration
//     × capacity, counted ONLY for shifts with a set capacity (an uncapped
//     shift has no defined demand, so it's reported as a count, never hours).
//   FILLED (booked) and EMPTY SHIFTS (gaps) — as above.
// No duration-only "scheduled hours" total: a 3h shift with 5 spots is 15h of
// work, so summing bare durations reads as neither supply nor demand.

export type ShiftTypeHours = {
  id: string | null // null = events whose shift type was deleted
  name: string
  paletteIndex: number // slot in SHIFT_HUES (registry sort position); -1 = untyped
  slotCount: number
  cappedSlots: number // shifts (occurrences) with a set capacity
  emptySlots: number // shifts of this type with zero signups
  signupCount: number
  filledHours: number // Σ over signups of the slot's duration (people-hours)
  toFillHours: number // Σ over capped shifts of occurrences × duration × capacity
  promisedHours: number // Σ over approved members of the hours they owe of this type
  promisedMembers: number // approved members owing ≥1h of this type
}

export type ShiftHoursOverview = {
  totalPromisedHours: number
  totalToFillHours: number
  totalFilledHours: number
  totalSignups: number
  memberCount: number // distinct members holding ≥1 shift
  approvedMemberCount: number // approved members the promised math ranges over
  slotCount: number
  cappedSlots: number
  emptySlots: number
  types: ShiftTypeHours[]
}

// Days in the configured event range, with buildScheduleDays' guards (valid,
// start ≤ end, ≤ 60 days). Fallback 1 so an "every day" recurring shift never
// vanishes when no range is configured.
function rangeDayCount(rangeStart?: string | null, rangeEnd?: string | null): number {
  const parse = (iso?: string | null) => {
    if (!iso) return null
    const d = new Date(`${iso}T12:00:00`)
    return isNaN(d.getTime()) ? null : d
  }
  const start = parse(rangeStart)
  const end = parse(rangeEnd)
  if (!start || !end) return 1
  const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  return days >= 1 && days <= 61 ? days : 1
}

export async function getShiftHoursOverview(): Promise<ShiftHoursOverview> {
  const [
    { data: shiftTypes },
    { data: events },
    { data: signups },
    { data: legacy },
    { data: configRows },
    { data: approvedRows },
    { data: groupRows },
    { data: groupMemberRows },
    { data: roleRows },
    { data: roleHolderRows },
  ] = await Promise.all([
    supabaseAdmin.from('shift_types').select('id, name, sort_order').order('sort_order'),
    supabaseAdmin
      .from('schedule_events')
      .select('id, shift_type_id, start_time, end_time, capacity, is_recurring, recurrence_days')
      .eq('participation_type', 'shift'),
    supabaseAdmin.from('member_shift_signups').select('clerk_user_id, schedule_event_id'),
    supabaseAdmin
      .from('camp_signups')
      .select('clerk_user_id, schedule_event_id')
      .not('schedule_event_id', 'is', null),
    supabaseAdmin
      .from('page_content')
      .select('key, value')
      .in('key', ['config_event_start_date', 'config_event_end_date', 'config_attunement_tasks']),
    supabaseAdmin.from('applications').select('clerk_user_id').eq('status', 'approved').not('clerk_user_id', 'is', null),
    supabaseAdmin.from('groups').select('id, required_shift_type_id, required_shift_hours').not('required_shift_type_id', 'is', null),
    supabaseAdmin.from('group_members').select('clerk_user_id, group_id'),
    supabaseAdmin.from('roles').select('id, required_shift_type_id, required_shift_hours').not('required_shift_type_id', 'is', null),
    supabaseAdmin
      .from('camp_signups')
      .select('clerk_user_id, role_id, role_approval_status')
      .not('role_id', 'is', null),
  ])

  const config = Object.fromEntries((configRows ?? []).map(r => [r.key, r.value as string]))
  const everyDayCount = rangeDayCount(config['config_event_start_date'], config['config_event_end_date'])
  const occurrencesOf = (ev: { is_recurring?: boolean | null; recurrence_days?: string[] | null }) => {
    if (!ev.is_recurring) return 1
    if (Array.isArray(ev.recurrence_days) && ev.recurrence_days.length > 0) return ev.recurrence_days.length
    return everyDayCount
  }

  const eventById = new Map((events ?? []).map(e => [e.id as string, e]))

  // Union the two signup sources, deduped per member+event (045 backfilled the
  // legacy column into the many-to-many table, so overlap is expected).
  const pairs = new Set<string>()
  for (const s of [...(signups ?? []), ...(legacy ?? [])]) {
    if (s.schedule_event_id && eventById.has(s.schedule_event_id)) {
      pairs.add(`${s.clerk_user_id} ${s.schedule_event_id}`)
    }
  }

  const members = new Set<string>()
  const signupsByEvent = new Map<string, number>()
  for (const pair of Array.from(pairs)) {
    const [userId, eventId] = pair.split(' ')
    members.add(userId)
    signupsByEvent.set(eventId, (signupsByEvent.get(eventId) ?? 0) + 1)
  }

  type Bucket = Omit<ShiftTypeHours, 'id' | 'name' | 'paletteIndex'>
  const buckets = new Map<string | null, Bucket>()
  const bucketFor = (typeId: string | null): Bucket => {
    let b = buckets.get(typeId)
    if (!b) {
      b = { slotCount: 0, cappedSlots: 0, emptySlots: 0, signupCount: 0, filledHours: 0, toFillHours: 0, promisedHours: 0, promisedMembers: 0 }
      buckets.set(typeId, b)
    }
    return b
  }

  for (const ev of events ?? []) {
    const b = bucketFor(ev.shift_type_id ?? null)
    const h = shiftDurationHours(ev.start_time, ev.end_time)
    const n = signupsByEvent.get(ev.id as string) ?? 0
    const occ = occurrencesOf(ev)
    b.slotCount += occ
    b.signupCount += n
    b.filledHours += h * n // one signup = one occurrence's hours
    b.emptySlots += Math.max(0, occ - n)
    if (ev.capacity != null && ev.capacity > 0) {
      b.cappedSlots += occ
      b.toFillHours += h * occ * ev.capacity // capacity is per occurrence
    }
  }

  // ── Promised hours ─────────────────────────────────────────────────────────
  // Universal typed 'shift' attunement tasks apply to every approved member.
  const universalOwed = new Map<string, number>()
  for (const t of parseAttunementTasks(config['config_attunement_tasks'])) {
    if (t.enabled && t.requirement === 'shift' && t.shiftTypeId) {
      universalOwed.set(t.shiftTypeId, Math.max(universalOwed.get(t.shiftTypeId) ?? 0, t.requiredHours ?? 1))
    }
  }

  type Req = { typeId: string; hours: number }
  const reqOf = (r: { required_shift_type_id: string | null; required_shift_hours: number | null }): Req | null =>
    r.required_shift_type_id && r.required_shift_hours && r.required_shift_hours > 0
      ? { typeId: r.required_shift_type_id, hours: r.required_shift_hours }
      : null
  const groupReq = new Map((groupRows ?? []).flatMap(g => { const r = reqOf(g); return r ? [[g.id as string, r] as const] : [] }))
  const roleReq = new Map((roleRows ?? []).flatMap(r => { const q = reqOf(r); return q ? [[r.id as string, q] as const] : [] }))

  const groupsByUser = new Map<string, string[]>()
  for (const gm of groupMemberRows ?? []) {
    const list = groupsByUser.get(gm.clerk_user_id) ?? []
    list.push(gm.group_id as string)
    groupsByUser.set(gm.clerk_user_id, list)
  }
  // Role requirement only counts once the role is actually held (not pending).
  const roleByUser = new Map<string, string>()
  for (const cs of roleHolderRows ?? []) {
    if (cs.role_approval_status !== 'pending') roleByUser.set(cs.clerk_user_id, cs.role_id as string)
  }

  for (const a of approvedRows ?? []) {
    const userId = a.clerk_user_id as string
    const owed = new Map(universalOwed)
    const raise = (r: Req | undefined | null) => {
      if (r) owed.set(r.typeId, Math.max(owed.get(r.typeId) ?? 0, r.hours))
    }
    for (const gid of groupsByUser.get(userId) ?? []) raise(groupReq.get(gid))
    raise(roleReq.get(roleByUser.get(userId) ?? ''))
    for (const [typeId, hours] of Array.from(owed.entries())) {
      const b = bucketFor(typeId)
      b.promisedHours += hours
      b.promisedMembers++
    }
  }

  // Registry order (= palette order), untyped bucket last; a type appears if it
  // has shift events OR promised hours (a requirement with nothing scheduled
  // yet should still show).
  const round = (n: number) => Math.round(n * 100) / 100
  const types: ShiftTypeHours[] = []
  const push = (id: string | null, name: string, paletteIndex: number, b: Bucket) =>
    types.push({
      id, name, paletteIndex, ...b,
      filledHours: round(b.filledHours),
      toFillHours: round(b.toFillHours),
      promisedHours: round(b.promisedHours),
    })
  ;(shiftTypes ?? []).forEach((t, i) => {
    const b = buckets.get(t.id as string)
    if (b) push(t.id as string, t.name as string, i, b)
  })
  const untyped = buckets.get(null)
  if (untyped) push(null, 'Untyped', -1, untyped)

  return {
    totalPromisedHours: round(types.reduce((a, t) => a + t.promisedHours, 0)),
    totalToFillHours: round(types.reduce((a, t) => a + t.toFillHours, 0)),
    totalFilledHours: round(types.reduce((a, t) => a + t.filledHours, 0)),
    totalSignups: types.reduce((a, t) => a + t.signupCount, 0),
    memberCount: members.size,
    approvedMemberCount: (approvedRows ?? []).length,
    slotCount: types.reduce((a, t) => a + t.slotCount, 0),
    cappedSlots: types.reduce((a, t) => a + t.cappedSlots, 0),
    emptySlots: types.reduce((a, t) => a + t.emptySlots, 0),
    types,
  }
}
