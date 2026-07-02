// Day columns for the schedule calendars, derived from REAL dates — replaces
// the hardcoded July day lists (which disagreed with each other and silently
// misplaced events outside their window).
//
// Columns = every day in the admin-configured event range (page_content keys
// `config_event_start_date` / `config_event_end_date`) UNION every date an
// event actually carries — so an event outside the configured window still
// gets a (correctly labelled) column rather than hiding.

export type ScheduleDay = {
  iso: string    // "2026-07-22"
  label: string  // "Wednesday" — matches schedule_events.day for undated rows
  short: string  // "WED"
  month: string  // "JUL"
  date: number   // 22
}

function parseISO(iso?: string | null): Date | null {
  if (!iso) return null
  const d = new Date(`${iso}T12:00:00`)
  return isNaN(d.getTime()) ? null : d
}

function toMeta(iso: string): ScheduleDay | null {
  const d = parseISO(iso)
  if (!d) return null
  return {
    iso,
    label: d.toLocaleDateString('en-US', { weekday: 'long' }),
    short: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    date: d.getDate(),
  }
}

const DAY_MS = 24 * 60 * 60 * 1000
const isoOf = (d: Date) => d.toISOString().slice(0, 10)

export function buildScheduleDays(
  eventDates: Array<string | null | undefined>,
  rangeStart?: string | null,
  rangeEnd?: string | null,
): ScheduleDay[] {
  const isos = new Set<string>()

  // Configured event range (guarded: valid dates, start ≤ end, ≤ 60 days).
  const start = parseISO(rangeStart)
  const end = parseISO(rangeEnd)
  if (start && end && start.getTime() <= end.getTime() && (end.getTime() - start.getTime()) / DAY_MS <= 60) {
    for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
      isos.add(isoOf(new Date(t)))
    }
  }

  // Every date an event actually carries.
  for (const d of eventDates) {
    if (d && parseISO(d)) isos.add(d)
  }

  return Array.from(isos)
    .sort()
    .map(toMeta)
    .filter((d): d is ScheduleDay => d !== null)
}

// Undated legacy rows only carry a weekday name; place them on the FIRST column
// with that weekday so they still render somewhere sensible.
export function firstIsoByWeekday(days: ScheduleDay[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const d of days) {
    if (!(d.label in map)) map[d.label] = d.iso
  }
  return map
}
