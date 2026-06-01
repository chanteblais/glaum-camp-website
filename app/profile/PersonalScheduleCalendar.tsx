'use client'

import { useId, useState, useEffect } from 'react'

export type PersonalEvent = {
  id: string
  day: string
  time: string
  title: string
  subtitle: string | null
  detail_desc: string | null
  icon_type: string
  highlight: boolean
  event_type: string | null
  isPersonal: boolean
}

const DAY_META: { label: string; short: string; month: string; date: number }[] = [
  { label: 'Wednesday', short: 'WED', month: 'JULY', date: 23 },
  { label: 'Thursday',  short: 'THU', month: 'JULY', date: 24 },
  { label: 'Friday',    short: 'FRI', month: 'JULY', date: 25 },
  { label: 'Saturday',  short: 'SAT', month: 'JULY', date: 26 },
  { label: 'Sunday',    short: 'SUN', month: 'JULY', date: 27 },
  { label: 'Monday',    short: 'MON', month: 'JULY', date: 28 },
]

const PX_PER_HOUR = 40
const GOLD = '#C8A848'
const CREAM = '#F3EAE5'
const PANEL_BG = 'radial-gradient(circle at 50% 0%, rgba(92, 28, 110, 0.24), rgba(15, 0, 28, 0.94) 46%, rgba(8, 0, 18, 0.98) 100%)'
const GRID_LINE = 'rgba(200,168,72,0.12)'

function parseMinutes(str: string): number | null {
  const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) return null
  let h = parseInt(match[1])
  const m = parseInt(match[2])
  const ap = match[3].toUpperCase()
  if (ap === 'PM' && h !== 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  return h * 60 + m
}

function parseEventTimes(timeStr: string | null) {
  if (!timeStr) return { start: null, end: null }
  const parts = timeStr.split(/\s*[–—-]\s*/)
  const start = parseMinutes(parts[0])
  let end = parts[1] ? parseMinutes(parts[1]) : null
  // If end is before start (e.g. "9:00 PM – 12:00 AM"), treat it as next-day midnight
  if (start !== null && end !== null && end < start) end += 24 * 60
  return { start, end }
}

type EventColors = { border: string; bg: string; time: string; title: string; subtitle: string; label?: string }

function eventColors(ev: PersonalEvent): EventColors {
  const label = ev.isPersonal && ev.event_type !== 'all_hands' ? 'Your Shift' : undefined
  if (ev.event_type === 'all_hands') {
    return { border: '#5FA58E', bg: 'linear-gradient(145deg, rgba(13,50,72,0.9), rgba(11,27,50,0.92))', time: '#76C7B2', title: CREAM, subtitle: '#AD759A', label }
  }
  if (ev.event_type === 'camp_tending') {
    return { border: '#B68018', bg: 'linear-gradient(145deg, rgba(36,15,43,0.92), rgba(18,5,30,0.94))', time: '#D19B30', title: GOLD, subtitle: CREAM, label }
  }
  if (ev.event_type === 'service') {
    return { border: 'rgba(182,80,200,0.85)', bg: 'linear-gradient(145deg, rgba(86,13,94,0.86), rgba(42,4,64,0.94))', time: '#D889E0', title: CREAM, subtitle: '#D7A6D8', label }
  }
  return { border: '#8F329D', bg: 'linear-gradient(145deg, rgba(59,7,78,0.9), rgba(32,4,52,0.96))', time: '#C86BD0', title: CREAM, subtitle: '#C49AC1', label }
}

function EventCard({ event, top, height }: { event: PersonalEvent; top: number; height: number }) {
  const c = eventColors(event)
  const tall = height >= 66
  const isPersonalShift = event.isPersonal && event.event_type !== 'all_hands'

  return (
    <div style={{
      position: 'absolute', top, height,
      left: '10px', right: '10px',
      borderRadius: '8px',
      border: `1.5px solid ${c.border}`,
      background: c.bg,
      padding: tall ? '10px 12px' : '6px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      boxShadow: isPersonalShift
        ? `0 0 20px rgba(182,80,200,0.28), inset 0 0 24px rgba(20,0,30,0.35)`
        : `inset 0 0 20px rgba(0,0,0,0.22), 0 0 10px rgba(0,0,0,0.12)`,
    }}>
      {event.time && (
        <p style={{ fontSize: '0.52rem', color: c.time, margin: `0 0 ${tall ? 9 : 4}px`, letterSpacing: '0.02em', lineHeight: 1.1, fontWeight: 600, textAlign: 'center', textShadow: '0 1px 0 rgba(0,0,0,0.45)' }}>
          {event.time}
        </p>
      )}
      <p style={{ fontSize: tall ? '0.65rem' : '0.56rem', fontWeight: 700, color: c.title, margin: 0, lineHeight: 1.2, wordBreak: 'break-word', textAlign: 'center', textShadow: '0 1px 0 rgba(0,0,0,0.75)' }}>
        {event.title}
      </p>
      {event.subtitle && tall && (
        <p style={{ fontSize: '0.54rem', color: c.subtitle, margin: '11px 0 0', lineHeight: 1.3, fontWeight: 500, textAlign: 'center', textShadow: '0 1px 0 rgba(0,0,0,0.5)' }}>
          {event.subtitle}
        </p>
      )}
      {c.label && tall && (
        <p style={{ fontSize: '0.58rem', color: c.subtitle, margin: '13px 0 0', letterSpacing: '0.02em', opacity: 0.98, textAlign: 'center', fontWeight: 600, textShadow: '0 1px 0 rgba(0,0,0,0.45)' }}>
          {c.label}
        </p>
      )}
      {isPersonalShift && tall && height >= 100 && (
        <p style={{ fontSize: '1.15rem', color: GOLD, opacity: 0.82, margin: '26px 0 0', lineHeight: 1, textAlign: 'center', textShadow: '0 0 12px rgba(200,168,72,0.45)' }}>✦</p>
      )}
    </div>
  )
}

function buildTimeWindow(events: PersonalEvent[]) {
  const allMinutes: number[] = []
  events.filter(e => !!e.time).forEach(e => {
    const { start, end } = parseEventTimes(e.time)
    if (start != null) allMinutes.push(start)
    if (end != null) allMinutes.push(end)
  })
  const PADDING = 30
  const minMin = allMinutes.length ? Math.min(...allMinutes) - PADDING : 8 * 60
  const maxMin = allMinutes.length ? Math.max(...allMinutes) + PADDING : 22 * 60
  const START_HOUR = Math.floor(minMin / 60)
  const END_HOUR = Math.ceil(maxMin / 60)

  const hourLabels: { hour: number; label: string }[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    const d = h % 24
    if (d === 12) { hourLabels.push({ hour: h, label: 'NOON' }); continue }
    if (d === 0)  { hourLabels.push({ hour: h, label: 'MIDN' }); continue }
    const h12 = d > 12 ? d - 12 : d
    const ampm = d < 12 ? 'AM' : 'PM'
    hourLabels.push({ hour: h, label: `${h12} ${ampm}` })
  }

  return { START_HOUR, END_HOUR, TOTAL_HEIGHT: (END_HOUR - START_HOUR) * PX_PER_HOUR, hourLabels }
}

function SingleDayGrid({ dayEvents, allEvents }: { dayEvents: PersonalEvent[]; allEvents: PersonalEvent[] }) {
  const { START_HOUR, END_HOUR, TOTAL_HEIGHT, hourLabels } = buildTimeWindow(allEvents)
  const timed = dayEvents.filter(e => !!e.time)

  return (
    <div style={{ display: 'flex', gap: '0' }}>
      <div style={{ width: '46px', flexShrink: 0, position: 'relative', height: TOTAL_HEIGHT, marginTop: '44px', borderRight: '1px solid rgba(200,168,72,0.14)' }}>
        {hourLabels.map(({ hour, label }) => (
          <div key={hour} style={{
            position: 'absolute', top: (hour - START_HOUR) * PX_PER_HOUR - 7, right: '10px',
            fontSize: '0.6rem', color: GOLD,
            opacity: label === 'NOON' || label === 'MIDN' ? 0.8 : 0.4,
            whiteSpace: 'nowrap', textAlign: 'right', letterSpacing: '0.04em',
            fontWeight: label === 'NOON' ? 600 : 400,
          }}>{label}</div>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ height: '44px', borderBottom: `1px solid ${GRID_LINE}` }} />
        <div style={{ position: 'relative', height: TOTAL_HEIGHT, background: 'linear-gradient(180deg, rgba(255,255,255,0.012), rgba(255,255,255,0.004))' }}>
          {hourLabels.map(({ hour, label }) => (
            <div key={hour} style={{
              position: 'absolute', top: (hour - START_HOUR) * PX_PER_HOUR, left: 0, right: 0,
              borderTop: `1px solid rgba(200,168,72,${label === 'NOON' ? '0.18' : '0.08'})`,
            }} />
          ))}
          {timed.map(ev => {
            const { start, end } = parseEventTimes(ev.time)
            if (start === null) return null
            const top = ((start / 60) - START_HOUR) * PX_PER_HOUR
            const height = end
              ? Math.max((Math.min(end / 60, END_HOUR) - Math.max(start / 60, START_HOUR)) * PX_PER_HOUR, 36)
              : Math.max(PX_PER_HOUR * 0.85, 40)
            return <EventCard key={ev.id} event={ev} top={top} height={height} />
          })}
        </div>
      </div>
    </div>
  )
}

export function PersonalScheduleCalendar({ events }: { events: PersonalEvent[] }) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const rawId = useId()
  const calendarId = `personal-schedule-${rawId.replace(/:/g, '')}`

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const timed = events.filter(e => !!e.time)
  const untimed = events.filter(e => !e.time)
  const activeDays = DAY_META.filter(d => events.some(e => e.day === d.label))
  const activeDay = selectedDay ?? activeDays[0]?.label ?? null

  if (activeDays.length === 0 && untimed.length === 0) return null

  const { START_HOUR, END_HOUR, TOTAL_HEIGHT, hourLabels } = buildTimeWindow(events)

  return (
    <div style={{
      marginBottom: '2.5rem',
      border: `1.5px solid ${GOLD}`,
      borderRadius: '1rem',
      background: PANEL_BG,
      overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(200,168,72,0.18), 0 0 28px rgba(182,80,200,0.12), inset 0 0 40px rgba(182,80,200,0.06)',
    }}>
      <button
        onClick={() => setCollapsed(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 2rem 0.65rem',
          background: 'none', border: 'none', borderBottom: collapsed ? 'none' : '1px solid rgba(200,168,72,0.24)',
          cursor: 'pointer', color: 'inherit',
        }}
      >
        <span style={{ width: '1.25rem', flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.9rem', color: GOLD, letterSpacing: '0.16em', textShadow: '0 1px 0 rgba(0,0,0,0.75), 0 0 18px rgba(200,168,72,0.28)' }}>
            Your Schedule
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: GOLD, opacity: 0.72, width: '1.25rem', textAlign: 'right', flexShrink: 0 }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: '1.15rem 1.25rem 0' }}>

          {isMobile ? (
            <>
              {/* Day tab bar */}
              {activeDays.length > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                  {activeDays.map(day => {
                    const active = activeDay === day.label
                    return (
                      <button
                        key={day.label}
                        onClick={() => setSelectedDay(day.label)}
                        style={{
                          flexShrink: 0,
                          padding: '0.4rem 0.9rem',
                          borderRadius: '9999px',
                          border: `1px solid ${active ? 'rgba(200,168,72,0.7)' : 'rgba(200,168,72,0.2)'}`,
                          background: active ? 'rgba(200,168,72,0.12)' : 'transparent',
                          color: active ? GOLD : 'rgba(200,168,72,0.5)',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          letterSpacing: '0.1em',
                          fontWeight: active ? 700 : 400,
                          textAlign: 'center',
                          lineHeight: 1.4,
                        }}
                      >
                        <span style={{ display: 'block' }}>{day.short}</span>
                        <span style={{ display: 'block', fontSize: '0.65rem', opacity: 0.8 }}>{day.date}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {activeDay && (
                <SingleDayGrid
                  dayEvents={events.filter(e => e.day === activeDay)}
                  allEvents={events}
                />
              )}
            </>
          ) : (
            <>
              <style>{`
                @media (max-width: 760px) {
                  #${calendarId} .schedule-scroll { overflow-x: auto; padding-bottom: 0.5rem; }
                  #${calendarId} .schedule-grid   { min-width: ${Math.max(activeDays.length * 168 + 46, 560)}px; }
                }
              `}</style>
              <div id={calendarId} className="schedule-scroll">
                <div className="schedule-grid" style={{ display: 'flex', gap: '0' }}>
                  <div style={{ width: '46px', flexShrink: 0, position: 'relative', height: TOTAL_HEIGHT, marginTop: '44px', borderRight: '1px solid rgba(200,168,72,0.14)' }}>
                    {hourLabels.map(({ hour, label }) => (
                      <div key={hour} style={{
                        position: 'absolute', top: (hour - START_HOUR) * PX_PER_HOUR - 7, right: '10px',
                        fontSize: '0.6rem', color: GOLD,
                        opacity: label === 'NOON' || label === 'MIDN' ? 0.8 : 0.4,
                        whiteSpace: 'nowrap', textAlign: 'right', letterSpacing: '0.04em',
                        fontWeight: label === 'NOON' ? 600 : 400,
                      }}>{label}</div>
                    ))}
                  </div>
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${activeDays.length}, minmax(168px, 1fr))`, gap: '0' }}>
                    {activeDays.map(day => {
                      const dayEvents = timed
                        .filter(e => e.day === day.label)
                        .sort((a, b) => (parseEventTimes(a.time).start ?? 0) - (parseEventTimes(b.time).start ?? 0))
                      return (
                        <div key={day.label}>
                          <div style={{
                            height: '44px', textAlign: 'center',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            paddingBottom: '6px',
                            borderLeft: '1px solid rgba(200,168,72,0.16)',
                            borderBottom: `1px solid ${GRID_LINE}`,
                          }}>
                            <span style={{ fontSize: '0.8rem', letterSpacing: '0.11em', color: GOLD, opacity: 0.94, fontWeight: 700, textShadow: '0 1px 0 rgba(0,0,0,0.7)' }}>{day.short}</span>
                            <span style={{ fontSize: '0.72rem', letterSpacing: '0.05em', color: GOLD, opacity: 0.78, marginTop: '1px', fontWeight: 500, textShadow: '0 1px 0 rgba(0,0,0,0.7)' }}>{day.month} {day.date}</span>
                          </div>
                          <div style={{
                            position: 'relative', height: TOTAL_HEIGHT,
                            borderLeft: '1px solid rgba(200,168,72,0.16)',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.012), rgba(255,255,255,0.004))',
                          }}>
                            {hourLabels.map(({ hour, label }) => (
                              <div key={hour} style={{
                                position: 'absolute', top: (hour - START_HOUR) * PX_PER_HOUR, left: 0, right: 0,
                                borderTop: `1px solid rgba(200,168,72,${label === 'NOON' ? '0.18' : '0.08'})`,
                              }} />
                            ))}
                            {dayEvents.map(ev => {
                              const { start, end } = parseEventTimes(ev.time)
                              if (start === null) return null
                              const top = ((start / 60) - START_HOUR) * PX_PER_HOUR
                              const height = end
                                ? Math.max((Math.min(end / 60, END_HOUR) - Math.max(start / 60, START_HOUR)) * PX_PER_HOUR, 36)
                                : Math.max(PX_PER_HOUR * 0.85, 40)
                              return <EventCard key={ev.id} event={ev} top={top} height={height} />
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {untimed.length > 0 && (
            <div style={{ marginTop: '1.1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {untimed.map(ev => (
                <div key={ev.id} style={{ padding: '0.42rem 0.8rem', border: '1px solid rgba(200,168,72,0.28)', borderRadius: '7px', background: 'rgba(200,168,72,0.06)' }}>
                  <span style={{ fontSize: '0.78rem', color: GOLD, opacity: 0.8 }}>{ev.day} · {ev.title}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '1rem 0 1.15rem', marginTop: '1rem', borderTop: '1px solid rgba(200,168,72,0.13)' }}>
            <a href="/#schedule" style={{ fontSize: '0.78rem', color: '#E37AE9', opacity: 0.92, textDecoration: 'none', letterSpacing: '0.03em', fontWeight: 700, textShadow: '0 0 14px rgba(227,122,233,0.28)' }}>
              View full calendar →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
