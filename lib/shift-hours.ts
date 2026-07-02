// Shift duration + display helpers. A shift's start_time / end_time are "HH:MM"
// 24-hour strings (from <input type="time">). Duration is computed here so the
// admin editor, attunement, and the member picker all agree.

function parseHHMM(t?: string | null): number | null {
  if (!t) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
  if (!m) return null
  const h = Number(m[1])
  const mm = Number(m[2])
  if (h > 23 || mm > 59) return null
  return h * 60 + mm
}

// Duration in hours from start/end. Handles an overnight shift (end before start
// ⇒ crosses midnight). Returns 0 when either bound is missing/malformed, so an
// unfilled shift simply contributes no hours.
export function shiftDurationHours(start?: string | null, end?: string | null): number {
  const s = parseHHMM(start)
  const e = parseHHMM(end)
  if (s == null || e == null) return 0
  let mins = e - s
  if (mins < 0) mins += 24 * 60
  return Math.round((mins / 60) * 100) / 100
}

// "16:00" → "4:00 PM"
export function formatClock(t?: string | null): string {
  const mins = parseHHMM(t)
  if (mins == null) return ''
  let h = Math.floor(mins / 60)
  const mm = mins % 60
  const period = h < 12 ? 'AM' : 'PM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${String(mm).padStart(2, '0')} ${period}`
}

// "16:00","19:00" → "4:00 PM – 7:00 PM" (for the display `time` column).
export function formatShiftRange(start?: string | null, end?: string | null): string {
  const a = formatClock(start)
  const b = formatClock(end)
  if (a && b) return `${a} – ${b}`
  return a || b || ''
}

// "2026-07-22" → "Wednesday". The event's `day` column is DERIVED from its real
// date (single source of truth — picking the wrong weekday by hand used to be an
// easy mistake). Returns null for missing/malformed dates.
export function weekdayFromISO(date?: string | null): string | null {
  if (!date) return null
  const d = new Date(`${date}T12:00:00`)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}
