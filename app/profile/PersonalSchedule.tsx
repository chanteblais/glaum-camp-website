import { supabaseAdmin } from '@/lib/supabase'
import { PersonalScheduleCalendar, type PersonalEvent } from './PersonalScheduleCalendar'

type Props = {
  userId: string
  contributions: string[]
}

export async function PersonalSchedule({ userId, contributions }: Props) {
  const EVENT_COLS = 'id, day, time, title, subtitle, detail_desc, icon_type, highlight, event_type'

  const [{ data: allHandsEvents }, { data: contributionEvents }, { data: userSignups }] = await Promise.all([
    supabaseAdmin
      .from('schedule_events')
      .select(EVENT_COLS)
      .eq('event_type', 'all_hands')
      .eq('visible', true)
      .order('sort_order', { ascending: true }),
    contributions.length > 0
      ? supabaseAdmin
          .from('schedule_events')
          .select(EVENT_COLS)
          .in('contribution_type', contributions)
          .eq('visible', true)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from('camp_signups')
      .select(`schedule_events(${EVENT_COLS})`)
      .eq('clerk_user_id', userId)
      .not('schedule_event_id', 'is', null),
  ])

  const seenIds = new Set<string>()
  const events: PersonalEvent[] = []

  // All hands (shown to everyone)
  for (const ev of allHandsEvents ?? []) {
    seenIds.add(ev.id)
    events.push({ ...ev, isPersonal: false })
  }

  // Contribution-tagged events (shown because of user's contributions)
  for (const ev of contributionEvents ?? []) {
    if (seenIds.has(ev.id)) continue
    seenIds.add(ev.id)
    events.push({ ...ev, isPersonal: true })
  }

  // User's explicitly signed shift events
  for (const signup of userSignups ?? []) {
    const ev = signup.schedule_events as Omit<PersonalEvent, 'isPersonal'> | null
    if (!ev) continue
    if (seenIds.has(ev.id)) {
      const existing = events.find(e => e.id === ev.id)
      if (existing) existing.isPersonal = true
    } else {
      seenIds.add(ev.id)
      events.push({ ...ev, isPersonal: true })
    }
  }

  if (events.length === 0) return null

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <PersonalScheduleCalendar events={events} />
    </div>
  )
}
