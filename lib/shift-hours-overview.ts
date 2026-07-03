import { supabaseAdmin } from './supabase'
import { shiftDurationHours } from './shift-hours'

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
// Deliberately no "% complete" here: an uncapped shift has no defined "full",
// so the display sticks to facts — scheduled hours, filled people-hours, and
// which shifts still have nobody.

export type ShiftTypeHours = {
  id: string | null // null = events whose shift type was deleted
  name: string
  paletteIndex: number // slot in SHIFT_HUES (registry sort position); -1 = untyped
  slotCount: number
  emptySlots: number // shifts of this type with zero signups
  signupCount: number
  filledHours: number // Σ over signups of the slot's duration (people-hours)
  scheduledHours: number // Σ of slot durations — "total hours of shifts"
}

export type ShiftHoursOverview = {
  totalScheduledHours: number
  totalFilledHours: number
  totalSignups: number
  memberCount: number // distinct members holding ≥1 shift
  slotCount: number
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
  const [{ data: shiftTypes }, { data: events }, { data: signups }, { data: legacy }, { data: rangeRows }] = await Promise.all([
    supabaseAdmin.from('shift_types').select('id, name, sort_order').order('sort_order'),
    supabaseAdmin
      .from('schedule_events')
      .select('id, shift_type_id, start_time, end_time, is_recurring, recurrence_days')
      .eq('participation_type', 'shift'),
    supabaseAdmin.from('member_shift_signups').select('clerk_user_id, schedule_event_id'),
    supabaseAdmin
      .from('camp_signups')
      .select('clerk_user_id, schedule_event_id')
      .not('schedule_event_id', 'is', null),
    supabaseAdmin
      .from('page_content')
      .select('key, value')
      .in('key', ['config_event_start_date', 'config_event_end_date']),
  ])

  const range = Object.fromEntries((rangeRows ?? []).map(r => [r.key, r.value as string]))
  const everyDayCount = rangeDayCount(range['config_event_start_date'], range['config_event_end_date'])
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
  for (const ev of events ?? []) {
    const typeId = ev.shift_type_id ?? null
    let b = buckets.get(typeId)
    if (!b) {
      b = { slotCount: 0, emptySlots: 0, signupCount: 0, filledHours: 0, scheduledHours: 0 }
      buckets.set(typeId, b)
    }
    const h = shiftDurationHours(ev.start_time, ev.end_time)
    const n = signupsByEvent.get(ev.id as string) ?? 0
    const occ = occurrencesOf(ev)
    b.slotCount += occ
    b.scheduledHours += h * occ
    b.signupCount += n
    b.filledHours += h * n // one signup = one occurrence's hours
    b.emptySlots += Math.max(0, occ - n)
  }

  // Registry order (= palette order), untyped bucket last; skip types with no
  // shift events — nothing to show.
  const round = (n: number) => Math.round(n * 100) / 100
  const types: ShiftTypeHours[] = []
  const push = (id: string | null, name: string, paletteIndex: number, b: Bucket) =>
    types.push({ id, name, paletteIndex, ...b, filledHours: round(b.filledHours), scheduledHours: round(b.scheduledHours) })
  ;(shiftTypes ?? []).forEach((t, i) => {
    const b = buckets.get(t.id as string)
    if (b) push(t.id as string, t.name as string, i, b)
  })
  const untyped = buckets.get(null)
  if (untyped) push(null, 'Untyped', -1, untyped)

  return {
    totalScheduledHours: round(types.reduce((a, t) => a + t.scheduledHours, 0)),
    totalFilledHours: round(types.reduce((a, t) => a + t.filledHours, 0)),
    totalSignups: types.reduce((a, t) => a + t.signupCount, 0),
    memberCount: members.size,
    slotCount: types.reduce((a, t) => a + t.slotCount, 0),
    emptySlots: types.reduce((a, t) => a + t.emptySlots, 0),
    types,
  }
}
