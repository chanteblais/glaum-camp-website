import { supabaseAdmin } from '@/lib/supabase'
import { ScheduleCalendarClient } from '@/components/ScheduleCalendarClient'
import { shiftColorIndexMap } from '@/lib/shift-colors'
export { EventIcon } from '@/components/EventIcon'
export { ICON_TYPES } from '@/components/EventIcon'

export async function ScheduleSection() {
  const [{ data: eventsRaw }, { data: shiftTypes }] = await Promise.all([
    supabaseAdmin
      .from('schedule_events')
      .select('id, day, time, title, subtitle, detail_desc, icon_type, highlight, is_recurring, event_type, participation_type, shift_type_id')
      .eq('visible', true)
      .order('sort_order', { ascending: true }),
    supabaseAdmin.from('shift_types').select('id').order('sort_order'),
  ])

  // Each shift type gets a stable palette slot from its registry position.
  const colorIndex = shiftColorIndexMap(shiftTypes ?? [])
  const data = (eventsRaw ?? []).map(e => ({
    ...e,
    shift_color_index: e.shift_type_id != null ? colorIndex[e.shift_type_id] ?? null : null,
  }))

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.7, marginBottom: '0.4rem' }}>
          ✦ &nbsp;Schedule&nbsp; ✦
        </p>
        <p style={{ fontSize: '0.82rem', fontStyle: 'italic', opacity: 0.45 }}>
          All times approximate. Attunement occurs continuously. Results may vary.
        </p>
      </div>
      <ScheduleCalendarClient events={data ?? []} />
    </div>
  )
}
