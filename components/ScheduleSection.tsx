import { supabaseAdmin } from '@/lib/supabase'
import { ScheduleCalendarClient } from '@/components/ScheduleCalendarClient'
export { EventIcon } from '@/components/EventIcon'
export { ICON_TYPES } from '@/components/EventIcon'

export async function ScheduleSection() {
  const { data } = await supabaseAdmin
    .from('schedule_events')
    .select('id, day, time, title, subtitle, detail_desc, icon_type, highlight, is_recurring')
    .eq('visible', true)
    .order('sort_order', { ascending: true })

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
