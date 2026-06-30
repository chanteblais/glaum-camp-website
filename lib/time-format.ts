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
