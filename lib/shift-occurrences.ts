// The single source of truth for "which dates does this shift event run?".
//
// Recurrence is purely an admin authoring convenience — one schedule_events row
// stands in for N nights so the organizer doesn't create the same shift six
// times. Everywhere downstream (signups, capacity, rosters, hours, the ledger)
// each occurrence is treated as its own regular shift, keyed by occurrence_date.
// This helper turns a stored event into that concrete list of dates.
//
//   · non-recurring          → [event_date]   (or [] when undated / TBD)
//   · recurring + recurrence_days → those dates
//   · recurring, no recurrence_days ("every day") → every day in the configured
//     event range (config_event_start_date / config_event_end_date)
//
// A non-recurring signup carries occurrence_date = NULL (one implicit
// occurrence); a recurring signup carries the specific night.

const DAY_MS = 24 * 60 * 60 * 1000

function parseISO(iso?: string | null): Date | null {
  if (!iso) return null
  const d = new Date(`${iso}T12:00:00`)
  return isNaN(d.getTime()) ? null : d
}
const isoOf = (d: Date) => d.toISOString().slice(0, 10)

export type OccurrenceEvent = {
  event_date?: string | null
  is_recurring?: boolean | null
  recurrence_days?: string[] | null
}

// Days in the configured event range, guarded (valid, start ≤ end, ≤ 60 days) —
// the same window buildScheduleDays uses. Returns [] when no valid range.
export function eventRangeDays(rangeStart?: string | null, rangeEnd?: string | null): string[] {
  const start = parseISO(rangeStart)
  const end = parseISO(rangeEnd)
  if (!start || !end || start.getTime() > end.getTime() || (end.getTime() - start.getTime()) / DAY_MS > 60) {
    return []
  }
  const out: string[] = []
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) out.push(isoOf(new Date(t)))
  return out
}

// The concrete occurrence dates of one shift event. `rangeDays` is the
// pre-computed configured-range list (from eventRangeDays) — passed in so a
// caller iterating many events fetches the range once.
export function shiftOccurrenceDates(ev: OccurrenceEvent, rangeDays: string[]): string[] {
  if (!ev.is_recurring) return ev.event_date ? [ev.event_date] : []
  if (Array.isArray(ev.recurrence_days) && ev.recurrence_days.length > 0) return ev.recurrence_days
  return rangeDays
}

// Count-only convenience (the ledger's occurrencesOf). "Every day" with no
// configured range falls back to 1 so a recurring shift never vanishes.
export function shiftOccurrenceCount(ev: OccurrenceEvent, rangeDays: string[]): number {
  if (!ev.is_recurring) return 1
  if (Array.isArray(ev.recurrence_days) && ev.recurrence_days.length > 0) return ev.recurrence_days.length
  return rangeDays.length || 1
}

// Is `date` a real occurrence of this event? Used by the write path to reject a
// bogus night. A null date is valid iff the event is non-recurring.
export function isValidOccurrence(ev: OccurrenceEvent, date: string | null, rangeDays: string[]): boolean {
  if (!ev.is_recurring) return date == null
  if (date == null) return false
  return shiftOccurrenceDates(ev, rangeDays).includes(date)
}
