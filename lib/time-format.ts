// Shared time-string normalisation for schedule + lead-up gathering inputs.

// Normalise a single time token like "7pm", "7:00pm", "19:00", "7:30 PM",
// "noon", "midnight" → "7:00 PM". Returns null if the token isn't a
// recognisable time (so callers can validate / reject garbage like "7yayaya").
export function normaliseToken(t: string): string | null {
  t = t.trim()
  if (!t) return null
  if (/^midnight$/i.test(t)) return '12:00 AM'
  if (/^noon$/i.test(t)) return '12:00 PM'
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2] ?? '00'
  if (h > 23 || parseInt(min, 10) > 59) return null
  const meridiem = m[3]?.toLowerCase()
  if (meridiem === 'pm' && h < 12) h += 12
  if (meridiem === 'am' && h === 12) h = 0
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${min} ${period}`
}

// "7:00 PM" / "7pm" / "19:00" → "HH:MM" 24-hour, the storage format shared by
// <input type="time"> and lib/shift-hours. Returns null when the string isn't
// a recognisable time — callers keep/flag the original instead of losing it.
export function to24h(t?: string | null): string | null {
  if (!t?.trim()) return null
  const display = normaliseToken(t)
  if (!display) return null
  const m = display.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/)
  if (!m) return null
  let h = parseInt(m[1], 10) % 12
  if (m[3] === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

// Split a display range like "7:00 PM – 10:00 PM" (or a single "7:00 PM") into
// structured 24-hour bounds. Used to prefill Start/End when editing a legacy
// event whose only time is the old free-text string.
export function rangeTo24h(raw?: string | null): { start: string | null; end: string | null } {
  if (!raw?.trim()) return { start: null, end: null }
  const parts = raw.split(/\s*[–—-]\s*/)
  return { start: to24h(parts[0]), end: to24h(parts[1]) }
}

// Normalise a full time string, handling ranges like "7 - 10pm" or
// "7:00PM – 10:00 PM". Lenient: unrecognised tokens are left as-is.
export function formatTime(raw: string): string {
  if (!raw.trim()) return raw
  // Split on en-dash, em-dash, or hyphen (with optional surrounding spaces).
  const parts = raw.split(/\s*[–—-]\s*/)
  if (parts.length === 2) {
    const [start, end] = parts.map((p) => normaliseToken(p) ?? p.trim())
    return `${start} – ${end}`
  }
  return normaliseToken(raw) ?? raw
}
