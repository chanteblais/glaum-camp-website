// Radio — the community broadcast feed (docs/radio.md).
//
// Stored events live in radio_events and are written by postRadioEvent from
// the route where the moment happens. Time-derived items (the Now / Up next
// strip) are never stored — the server supplies the day's candidate events
// and the client picks what's live against the member's own clock (the
// member's device is at camp; the server is in UTC).

import { supabaseAdmin } from '@/lib/supabase'

export type RadioKind = 'broadcast' | 'member' | 'resource' | 'distinction'

export type RadioEventRow = {
  id: string
  kind: string
  message: string
  icon: string | null
  actor_clerk_id: string | null
  actor_name: string | null
  link: string | null
  created_at: string
  avatar_url: string | null
}

// ── Config (page_content.config_radio) ────────────────────────────
// Which automatic sources broadcast. Absent key / malformed JSON = all on.
// Organizer broadcasts have no toggle — posting one is already the decision.

export type RadioSources = {
  member: boolean       // ✦ Sarah joined the camp.
  resource: boolean     // ✨ Sarah committed to bringing a camping stove.
  distinction: boolean  // 🏅 Erik received the Setup distinction.
}

export const DEFAULT_RADIO_SOURCES: RadioSources = {
  member: true,
  resource: true,
  distinction: true,
}

export function parseRadioSources(raw?: string | null): RadioSources {
  if (!raw) return { ...DEFAULT_RADIO_SOURCES }
  try {
    const sources = (JSON.parse(raw)?.sources ?? {}) as Partial<Record<keyof RadioSources, unknown>>
    return {
      member: sources.member !== false,
      resource: sources.resource !== false,
      distinction: sources.distinction !== false,
    }
  } catch {
    return { ...DEFAULT_RADIO_SOURCES }
  }
}

// ── Writing ───────────────────────────────────────────────────────

export type RadioEventInput = {
  kind: RadioKind
  message: string
  icon?: string | null
  actorClerkId?: string | null
  actorName?: string | null
  link?: string | null
  createdBy?: string | null
}

// Best-effort insert — a failed radio post must never break the action it
// rode on (approval, claim, grant), so this logs and swallows.
export async function postRadioEvent(event: RadioEventInput): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('radio_events')
      .insert([{
        kind: event.kind,
        message: event.message,
        icon: event.icon ?? null,
        actor_clerk_id: event.actorClerkId ?? null,
        actor_name: event.actorName ?? null,
        link: event.link ?? null,
        created_by: event.createdBy ?? null,
      }])
      .select('id')
      .single()
    if (error) {
      console.error('[radio] post failed', error)
      return null
    }
    return data?.id ?? null
  } catch (e) {
    console.error('[radio] post failed', e)
    return null
  }
}

// Gated variant for the automatic sources — checks the config toggle first.
export async function postSourcedRadioEvent(
  source: keyof RadioSources,
  event: RadioEventInput,
): Promise<void> {
  try {
    const { data } = await supabaseAdmin
      .from('page_content')
      .select('value')
      .eq('key', 'config_radio')
      .maybeSingle()
    if (!parseRadioSources(data?.value)[source]) return
    await postRadioEvent(event)
  } catch (e) {
    console.error('[radio] sourced post failed', e)
  }
}

// First name for a radio line ("Sarah committed to…") — Radio is
// members-only, so first names are the right register.
export async function getRadioActorName(clerkUserId: string): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('members')
      .select('preferred_name, first_name')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle()
    return data?.preferred_name || data?.first_name || 'A member'
  } catch {
    return 'A member'
  }
}

// "Sarah committed to bringing a camping stove." Item names are stored
// Sentence-cased ("Camping stove") — lowercase mid-sentence unless the name
// looks like a proper noun / acronym (second letter already uppercase).
export function resourceCommitmentMessage(actorName: string, itemName: string, quantity: number): string {
  const trimmed = itemName.trim()
  const item = /^[A-Z][a-z]/.test(trimmed)
    ? trimmed[0].toLowerCase() + trimmed.slice(1)
    : trimmed
  if (quantity > 1) return `${actorName} committed to bringing ${quantity} × ${item}.`
  const article = /^[aeiou]/i.test(item) ? 'an' : 'a'
  return `${actorName} committed to bringing ${article} ${item}.`
}

// ── Reading ───────────────────────────────────────────────────────

// Latest visible events, with each actor's CURRENT avatar joined in JS
// (no FK — same pattern as shoutouts; messages/names stay historical,
// faces stay fresh).
export async function getRadioFeed(limit = 60): Promise<RadioEventRow[]> {
  const { data, error } = await supabaseAdmin
    .from('radio_events')
    .select('id, kind, message, icon, actor_clerk_id, actor_name, link, created_at')
    .eq('visible', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !data) {
    if (error) console.error('[radio] feed read failed', error)
    return []
  }

  const actorIds = Array.from(new Set(data.map(e => e.actor_clerk_id).filter(Boolean))) as string[]
  const avatarMap: Record<string, string | null> = {}
  if (actorIds.length > 0) {
    const { data: rows } = await supabaseAdmin
      .from('applications')
      .select('clerk_user_id, avatar_url')
      .in('clerk_user_id', actorIds)
    for (const r of rows ?? []) avatarMap[r.clerk_user_id] = r.avatar_url
  }

  return data.map(e => ({
    ...e,
    avatar_url: e.actor_clerk_id ? avatarMap[e.actor_clerk_id] ?? null : null,
  }))
}

// ── Now / Up next strip (derived, never stored) ───────────────────

export type RadioDayEvent = {
  title: string
  start_time: string        // "HH:MM"
  end_time: string | null
  participation_type: string
}

export type RadioNowData = {
  welcome: string | null         // "Day 2 of camp" — null outside the event range
  todayEvents: RadioDayEvent[]   // today's general + mandatory events, client picks now/next
}

const isoToday = () => new Date().toISOString().slice(0, 10)

export async function getRadioNowData(): Promise<RadioNowData> {
  const today = isoToday()

  const [{ data: configRows }, { data: events }] = await Promise.all([
    supabaseAdmin
      .from('page_content')
      .select('key, value')
      .in('key', ['config_event_start_date', 'config_event_end_date']),
    supabaseAdmin
      .from('schedule_events')
      .select('title, start_time, end_time, participation_type, event_date, is_recurring, recurrence_days')
      .eq('visible', true)
      .eq('show_on_schedule', true)
      .in('participation_type', ['general', 'mandatory'])
      .or(`event_date.eq.${today},is_recurring.eq.true`),
  ])

  const config = Object.fromEntries((configRows ?? []).map(r => [r.key, r.value]))
  const rangeStart = config['config_event_start_date'] ?? null
  const rangeEnd = config['config_event_end_date'] ?? null

  // The welcome line only makes sense while camp is actually running.
  let welcome: string | null = null
  if (rangeStart && rangeEnd && rangeStart <= today && today <= rangeEnd) {
    const dayNumber = Math.round(
      (new Date(`${today}T12:00:00`).getTime() - new Date(`${rangeStart}T12:00:00`).getTime()) / 86400000,
    ) + 1
    welcome = `Day ${dayNumber} of camp`
  }

  const inRange = rangeStart && rangeEnd && rangeStart <= today && today <= rangeEnd
  const todayEvents = (events ?? [])
    .filter(e => {
      if (!e.start_time) return false
      if (!e.is_recurring) return e.event_date === today
      // Recurring: an explicit date list repeats on just those days; no list
      // means every day of the event range (matching the schedule calendar).
      if (Array.isArray(e.recurrence_days) && e.recurrence_days.length > 0) {
        return e.recurrence_days.includes(today)
      }
      return Boolean(inRange)
    })
    .map(e => ({
      title: e.title as string,
      start_time: e.start_time as string,
      end_time: (e.end_time as string | null) ?? null,
      participation_type: (e.participation_type as string) ?? 'general',
    }))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  return { welcome, todayEvents }
}
