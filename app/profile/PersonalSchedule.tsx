import { supabaseAdmin } from '@/lib/supabase'
import { shiftColorIndexMap } from '@/lib/shift-colors'
import { buildScheduleDays } from '@/lib/schedule-days'
import { PersonalScheduleCalendar, type PersonalEvent } from './PersonalScheduleCalendar'

type Props = {
  userId: string
}

// A member's personal schedule = mandatory events (everyone attends) + the
// shifts they actually hold (member_shift_signups ∪ the legacy single signup).
// The old contribution_type-tagged events are superseded: the group says WHAT
// you contribute, the shifts you signed up for say WHEN.
export async function PersonalSchedule({ userId }: Props) {
  const EVENT_COLS = 'id, day, time, title, subtitle, detail_desc, icon_type, highlight, event_type, event_date, participation_type, shift_type_id'

  const [{ data: mandatoryEvents }, { data: heldRows }, { data: legacySignup }, { data: shiftTypes }] = await Promise.all([
    supabaseAdmin
      .from('schedule_events')
      .select(EVENT_COLS)
      .eq('participation_type', 'mandatory')
      .eq('visible', true)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('member_shift_signups')
      .select(`schedule_events(${EVENT_COLS})`)
      .eq('clerk_user_id', userId),
    supabaseAdmin
      .from('camp_signups')
      .select(`schedule_events(${EVENT_COLS})`)
      .eq('clerk_user_id', userId)
      .not('schedule_event_id', 'is', null)
      .maybeSingle(),
    supabaseAdmin.from('shift_types').select('id').order('sort_order'),
  ])

  // Palette slot per shift type (registry order) — drives the card colours.
  const colorIndex = shiftColorIndexMap(shiftTypes ?? [])
  const withColor = <T extends { shift_type_id?: string | null }>(ev: T) => ({
    ...ev,
    shift_color_index: ev.shift_type_id != null ? colorIndex[ev.shift_type_id] ?? null : null,
  })

  const seenIds = new Set<string>()
  const events: PersonalEvent[] = []

  // Mandatory events (shown to everyone)
  for (const ev of mandatoryEvents ?? []) {
    seenIds.add(ev.id)
    events.push({ ...withColor(ev), isPersonal: false })
  }

  // Shifts the member holds (many-to-many + legacy single, deduped)
  const heldEvents = [
    ...(heldRows ?? []).map(r => r.schedule_events),
    legacySignup?.schedule_events,
  ]
  for (const raw of heldEvents) {
    const ev = raw as unknown as (Omit<PersonalEvent, 'isPersonal' | 'shift_color_index'> & { shift_type_id?: string | null }) | null
    if (!ev) continue
    if (seenIds.has(ev.id)) {
      const existing = events.find(e => e.id === ev.id)
      if (existing) existing.isPersonal = true
    } else {
      seenIds.add(ev.id)
      events.push({ ...withColor(ev), isPersonal: true })
    }
  }

  if (events.length === 0) return null

  // Day columns from the member's events' real dates (only days they have
  // something on) — replaces the hardcoded July DAY_META list.
  const days = buildScheduleDays(events.map(e => (e as { event_date?: string | null }).event_date))

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <PersonalScheduleCalendar events={events} days={days} />
    </div>
  )
}
