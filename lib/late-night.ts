// Late-night display convention for the schedule calendars.
//
// A camp night runs past midnight: members read "Saturday 1:00 AM" as the tail
// of Saturday night, not Saturday before dawn. Events keep their TRUE calendar
// date in `event_date` (reminder emails, the radio Now strip, and shift
// occurrences all do real-datetime math on it) — only the schedule grids
// re-home an early-morning event into the previous night's column, drawn past
// midnight (hour 24+), so it sits where the eye looks for it: after the
// evening's events, not 20 hours above them.
//
// Recurring events have no date of their own; their picked days already mean
// "the night of", so they get the time shift but keep their chip's column.

// Starts before this hour read as "late night" of the previous day.
export const LATE_NIGHT_BOUNDARY_MIN = 6 * 60

// Parse one clock string like "9:00 PM" → minutes from midnight.
export function parseClockMinutes(str: string): number | null {
  const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) return null
  let h = parseInt(match[1])
  const m = parseInt(match[2])
  const ap = match[3].toUpperCase()
  if (ap === 'PM' && h !== 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  return h * 60 + m
}

// "2026-07-26" ± days → ISO. Noon anchor dodges DST edges.
export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`)
  if (isNaN(d.getTime())) return iso
  d.setDate(d.getDate() + delta)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Late-night date shift for structured-time callers (admin views): the column
// a dated event displays in, given its start in minutes from midnight.
export function lateNightDisplayDate(eventDate: string, startMin: number | null): string {
  return startMin != null && startMin < LATE_NIGHT_BOUNDARY_MIN ? addDays(eventDate, -1) : eventDate
}

// Time shift shared by every grid: an early-morning start renders 24h later
// (past midnight at the bottom of the night). Apply AFTER any overnight
// end-wrap so both bounds move together.
export function lateNightShift({ start, end }: { start: number | null; end: number | null }): { start: number | null; end: number | null; lateNight: boolean } {
  if (start != null && start < LATE_NIGHT_BOUNDARY_MIN) {
    return { start: start + 1440, end: end != null ? end + 1440 : null, lateNight: true }
  }
  return { start, end, lateNight: false }
}

// Display placement from the display `time` string ("9:00 PM – 1:00 AM"):
// parsed minutes (overnight ends wrap; late-night starts render at 24h+) plus
// the column date a dated event belongs to. displayDate is null for undated
// rows — callers keep their own fallback (weekday name / recurrence chip).
export function displayPlacement(timeStr: string | null, eventDate: string | null): {
  start: number | null
  end: number | null
  displayDate: string | null
  lateNight: boolean
} {
  let start: number | null = null
  let end: number | null = null
  if (timeStr) {
    const parts = timeStr.split(/\s*[–—-]\s*/)
    start = parseClockMinutes(parts[0])
    end = parts[1] ? parseClockMinutes(parts[1]) : null
    // Overnight events ("11:00 PM – 2:00 AM") wrap past midnight; without this
    // the early-morning end time stretches the grid's start back to 1 AM.
    if (start !== null && end !== null && end <= start) end += 24 * 60
  }
  const shifted = lateNightShift({ start, end })
  return {
    start: shifted.start,
    end: shifted.end,
    displayDate: eventDate ? (shifted.lateNight ? addDays(eventDate, -1) : eventDate) : null,
    lateNight: shifted.lateNight,
  }
}
