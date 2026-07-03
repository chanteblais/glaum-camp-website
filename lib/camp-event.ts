// Countdown to the event's opening day, shared by the home-dashboard banner
// and the attunement nudge emails. The date comes from the admin-configured
// event range (Configure → Structure → Event Dates, stored as
// page_content.config_event_start_date); the fallback is What If's opening day
// for unconfigured installs (see docs/generalizability-log.md).
const FALLBACK_EVENT_START = '2026-07-23'

export function daysUntilEvent(configuredStartIso?: string | null, now: Date = new Date()): number {
  const start = new Date(`${configuredStartIso || FALLBACK_EVENT_START}T12:00:00`)
  const target = isNaN(start.getTime()) ? new Date(`${FALLBACK_EVENT_START}T12:00:00`) : start
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
}
