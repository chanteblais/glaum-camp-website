import { supabaseAdmin } from '@/lib/supabase'
import { EventIcon } from '@/components/EventIcon'
export { EventIcon } from '@/components/EventIcon'
export { ICON_TYPES } from '@/components/EventIcon'

type ScheduleEvent = {
  id: string
  day: string
  time: string
  title: string
  subtitle: string | null
  detail_desc: string | null
  icon_type: string
  sort_order: number
  visible: boolean
  highlight: boolean
  is_recurring: boolean
}

const dayColor = (day: string, highlight: boolean) =>
  highlight || day === 'Thursday' || day === 'Sunday' ? '#C8803A' : '#C8A848'

export async function ScheduleSection() {
  const { data } = await supabaseAdmin
    .from('schedule_events')
    .select('*')
    .eq('visible', true)
    .order('sort_order', { ascending: true })

  const all = (data ?? []) as ScheduleEvent[]
  const regular = all.filter((e) => !e.is_recurring)
  const recurring = all.filter((e) => e.is_recurring)

  return (
    <div>
      {/* ── AT A GLANCE ── */}
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.7, marginBottom: '0.4rem' }}>
            ✦ &nbsp;At a Glance&nbsp; ✦
          </p>
          <p style={{ fontSize: '0.82rem', fontStyle: 'italic', opacity: 0.45 }}>
            All times approximate. Attunement occurs continuously. Results may vary.
          </p>
        </div>

        <div style={{ border: '1px solid rgba(200,168,72,0.2)', borderRadius: '1rem', overflow: 'hidden', background: 'rgba(200,168,72,0.03)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 2fr', padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(200,168,72,0.15)', background: 'rgba(200,168,72,0.05)' }}>
            {['Day', 'Time', 'Event'].map((h) => (
              <p key={h} style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, margin: 0 }}>{h}</p>
            ))}
          </div>
          {regular.map((row, i) => (
            <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 2fr', padding: '1rem 1.5rem', borderBottom: i < regular.length - 1 ? '1px solid rgba(200,168,72,0.08)' : 'none', alignItems: 'start', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: dayColor(row.day, row.highlight), opacity: 0.7, fontSize: '0.9rem', flexShrink: 0 }}>✦</span>
                <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: dayColor(row.day, row.highlight) }}>{row.day}</span>
              </div>
              <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: 0, paddingTop: '0.05rem' }}>{row.time}</p>
              <div>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F3EDE6', margin: '0 0 0.2rem' }}>{row.title}</p>
                {row.subtitle && <p style={{ fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.5, margin: 0, lineHeight: 1.5 }}>{row.subtitle}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DAILY RECURRING ── */}
      {recurring.length > 0 && (
        <div style={{ marginBottom: regular.length > 0 ? '4rem' : 0 }}>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '3rem' }} />
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.7, marginBottom: '0.4rem' }}>
              ✦ &nbsp;Every Day&nbsp; ✦
            </p>
            <p style={{ fontSize: '0.82rem', fontStyle: 'italic', opacity: 0.45 }}>
              Ongoing throughout the gathering
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recurring.map((ev) => (
              <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '1.25rem', padding: '1rem 1.25rem', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '0.75rem', background: 'rgba(200,168,72,0.02)', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <div style={{ color: '#C8A848', opacity: 0.85 }}>
                    <EventIcon type={ev.icon_type} size={ev.icon_type.startsWith('http') || ev.icon_type.startsWith('/') ? 72 : 38} />
                  </div>
                  {ev.time && <span style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.6, textAlign: 'center' }}>{ev.time}</span>}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F3EDE6', margin: '0 0 0.15rem' }}>{ev.title}</p>
                  {ev.detail_desc && <p style={{ fontSize: '0.8rem', opacity: 0.5, margin: 0, lineHeight: 1.5 }}>{ev.detail_desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EVENT DETAILS ── */}
      {regular.length > 0 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.7 }}>
              ✦ &nbsp;Event Details&nbsp; ✦
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {regular.map((card) => (
              <div key={card.id} style={{ padding: '1.25rem', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '0.85rem', background: 'rgba(200,168,72,0.03)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: dayColor(card.day, card.highlight), opacity: 0.85, margin: 0 }}>
                  {card.day}&nbsp;&nbsp;{card.time}
                </p>
                <div style={{ color: '#C8A848', opacity: 0.55 }}>
                  <EventIcon type={card.icon_type} />
                </div>
                <div>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#F3EDE6', margin: '0 0 0.4rem' }}>{card.title}</p>
                  {card.detail_desc && <p style={{ fontSize: '0.85rem', lineHeight: 1.65, opacity: 0.6, margin: 0 }}>{card.detail_desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
