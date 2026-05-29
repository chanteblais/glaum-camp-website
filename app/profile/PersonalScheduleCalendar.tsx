'use client'

import { useState } from 'react'
import { EventIcon } from '@/components/EventIcon'

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

const DAY_META: { label: string; short: string; date: number }[] = [
  { label: 'Wednesday', short: 'Wed', date: 23 },
  { label: 'Thursday',  short: 'Thu', date: 24 },
  { label: 'Friday',    short: 'Fri', date: 25 },
  { label: 'Saturday',  short: 'Sat', date: 26 },
  { label: 'Sunday',    short: 'Sun', date: 27 },
  { label: 'Monday',    short: 'Mon', date: 28 },
]
const DAY_ORDER: Record<string, number> = Object.fromEntries(DAY_META.map((d, i) => [d.label, i]))

const PX_PER_HOUR = 56

const EVENT_TYPE_STYLES: Record<string, { border: string; background: string; text: string }> = {
  all_hands:    { border: 'rgba(40,200,190,0.45)',  background: 'rgba(40,200,190,0.1)',  text: '#28c8be' },
  camp_tending: { border: 'rgba(240,90,20,0.55)',   background: 'rgba(240,90,20,0.12)',  text: '#e6781e' },
  service:      { border: 'rgba(240,100,180,0.5)',  background: 'rgba(240,100,180,0.1)', text: '#f064b4' },
}
const DEFAULT_STYLE = { border: 'rgba(200,168,72,0.25)', background: 'rgba(200,168,72,0.05)', text: '#F3EDE6' }

function eventStyle(ev: PersonalEvent) {
  if (ev.isPersonal && !ev.event_type) return DEFAULT_STYLE
  if (ev.event_type && EVENT_TYPE_STYLES[ev.event_type]) return EVENT_TYPE_STYLES[ev.event_type]
  if (ev.highlight) return { border: 'rgba(200,168,72,0.25)', background: 'rgba(200,168,72,0.04)', text: '#F3EDE6' }
  return DEFAULT_STYLE
}

function parseMinutes(str: string): number | null {
  const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) return null
  let h = parseInt(match[1])
  const m = parseInt(match[2])
  const ap = match[3].toUpperCase()
  if (ap === 'PM' && h !== 12) h += 12
  if (ap === 'AM' && h === 12) h = 24
  return h * 60 + m
}

function parseEventTimes(timeStr: string | null) {
  if (!timeStr) return { start: null, end: null }
  const parts = timeStr.split(/\s*[–—-]\s*/)
  return { start: parseMinutes(parts[0]), end: parts[1] ? parseMinutes(parts[1]) : null }
}

function buildHourLabels(startHour: number, endHour: number) {
  const labels: { hour: number; label: string }[] = []
  for (let h = startHour; h <= endHour; h++) {
    const d = h % 24
    const h12 = d === 0 ? 12 : d > 12 ? d - 12 : d
    const ampm = d < 12 || d === 0 ? 'AM' : 'PM'
    labels.push({ hour: h, label: d === 0 ? 'Midnight' : d === 12 ? 'Noon' : `${h12} ${ampm}` })
  }
  return labels
}

function EventBlock({ event, style }: { event: PersonalEvent; style: React.CSSProperties }) {
  const [expanded, setExpanded] = useState(false)
  const expandedText = event.detail_desc || event.subtitle
  const s = eventStyle(event)

  return (
    <div
      onClick={() => expandedText && setExpanded(o => !o)}
      style={{
        ...style,
        position: 'absolute',
        left: '2px', right: '2px',
        borderRadius: '0.35rem',
        border: `1px solid ${event.isPersonal && !event.event_type?.includes('all_hands') ? 'rgba(210,57,248,0.5)' : s.border}`,
        background: event.isPersonal && !event.event_type?.includes('all_hands') ? 'rgba(210,57,248,0.1)' : s.background,
        boxShadow: event.isPersonal && event.event_type !== 'all_hands'
          ? '0 0 8px rgba(210,57,248,0.2)'
          : event.highlight ? '0 0 10px rgba(200,168,72,0.35)' : undefined,
        overflow: 'hidden',
        cursor: expandedText ? 'pointer' : 'default',
        zIndex: expanded ? 10 : 1,
      }}
    >
      <div style={{ padding: '0.25rem 0.35rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', textAlign: 'center' }}>
          <div style={{ color: '#C8A848', opacity: 0.65 }}>
            <EventIcon type={event.icon_type} size={10} />
          </div>
          <p style={{
            fontSize: '0.68rem',
            color: event.isPersonal && event.event_type !== 'all_hands' ? '#D239F8' : s.text,
            margin: 0, lineHeight: 1.3,
            fontWeight: event.isPersonal || event.highlight ? 600 : 400,
            wordBreak: 'break-word',
          }}>
            {event.title}
          </p>
          {event.isPersonal && event.event_type !== 'all_hands' && (
            <span style={{ fontSize: '0.5rem', color: '#D239F8', opacity: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              your shift
            </span>
          )}
          {expandedText && (
            <span style={{ fontSize: '0.45rem', color: '#C8A848', opacity: 0.4 }}>{expanded ? '▲' : '▼'}</span>
          )}
        </div>
        {expanded && expandedText && (
          <div style={{ marginTop: '0.3rem', paddingTop: '0.3rem', borderTop: '1px solid rgba(200,168,72,0.1)' }}>
            <p style={{ fontSize: '0.65rem', opacity: 0.6, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>{expandedText}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function PersonalScheduleCalendar({ events }: { events: PersonalEvent[] }) {
  const timed = events.filter(e => !!e.time)
  const untimed = events.filter(e => !e.time)

  // Only show days that have at least one event
  const activeDayLabels = new Set(events.map(e => e.day))
  const activeDays = DAY_META.filter(d => activeDayLabels.has(d.label))

  // Compute time window
  const allMinutes: number[] = []
  timed.forEach(e => {
    const { start, end } = parseEventTimes(e.time)
    if (start != null) allMinutes.push(start)
    if (end != null) allMinutes.push(end)
  })
  const PADDING = 30
  const minMinutes = allMinutes.length ? Math.min(...allMinutes) - PADDING : 8 * 60
  const maxMinutes = allMinutes.length ? Math.max(...allMinutes) + PADDING : 24 * 60
  const START_HOUR = Math.floor(minMinutes / 60)
  const END_HOUR = Math.ceil(maxMinutes / 60)
  const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * PX_PER_HOUR
  const HOUR_LABELS = buildHourLabels(START_HOUR, END_HOUR)

  if (activeDays.length === 0 && untimed.length === 0) return null

  const cols = activeDays.length
  const colStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: '0.4rem',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0' }}>
        {/* Time axis */}
        <div style={{ width: '44px', flexShrink: 0, position: 'relative', height: TOTAL_HEIGHT, marginTop: '52px' }}>
          {HOUR_LABELS.map(({ hour, label }) => (
            <div key={hour} style={{
              position: 'absolute',
              top: (hour - START_HOUR) * PX_PER_HOUR - 7,
              left: 0, right: '6px',
              fontSize: '0.58rem',
              color: '#C8A848',
              opacity: label === 'Midnight' || label === 'Noon' ? 0.7 : 0.35,
              whiteSpace: 'nowrap',
              textAlign: 'right',
              letterSpacing: '0.02em',
              fontWeight: label === 'Midnight' || label === 'Noon' ? 600 : 400,
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Day columns — only active days */}
        <div style={{ flex: 1, ...colStyle }}>
          {activeDays.map(day => {
            const dayEvents = timed
              .filter(e => e.day === day.label)
              .sort((a, b) => (parseEventTimes(a.time).start ?? 0) - (parseEventTimes(b.time).start ?? 0))

            return (
              <div key={day.label}>
                <div style={{
                  height: '52px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '0.5rem 0.5rem 0 0',
                  background: 'rgba(200,168,72,0.07)',
                  border: '1px solid rgba(200,168,72,0.2)',
                  borderBottom: 'none',
                }}>
                  <p style={{ fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, margin: 0 }}>
                    {day.short}
                  </p>
                  <p style={{ fontSize: '1rem', color: '#F3EDE6', margin: '0.1rem 0 0', fontFamily: 'TokyoDreams, serif' }}>
                    {day.date}
                  </p>
                </div>

                <div style={{
                  position: 'relative',
                  height: TOTAL_HEIGHT,
                  border: '1px solid rgba(200,168,72,0.12)',
                  borderRadius: '0 0 0.5rem 0.5rem',
                  background: 'rgba(255,255,255,0.01)',
                }}>
                  {HOUR_LABELS.map(({ hour, label }) => (
                    <div key={hour} style={{
                      position: 'absolute',
                      top: (hour - START_HOUR) * PX_PER_HOUR,
                      left: 0, right: 0,
                      borderTop: `1px solid rgba(200,168,72,${label === 'Midnight' || label === 'Noon' ? '0.15' : '0.06'})`,
                    }} />
                  ))}

                  {dayEvents.map(ev => {
                    const { start, end } = parseEventTimes(ev.time)
                    if (start === null) return null
                    const top = ((start / 60) - START_HOUR) * PX_PER_HOUR
                    const height = end
                      ? Math.max((Math.min(end / 60, END_HOUR) - Math.max(start / 60, START_HOUR)) * PX_PER_HOUR, 28)
                      : Math.max(PX_PER_HOUR * 0.75, 32)
                    return <EventBlock key={ev.id} event={ev} style={{ top, height }} />
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {untimed.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.45, marginBottom: '0.6rem' }}>
            No fixed time
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {untimed.map(ev => (
              <div key={ev.id} style={{ padding: '0.35rem 0.75rem', border: `1px solid ${ev.isPersonal ? 'rgba(210,57,248,0.35)' : 'rgba(200,168,72,0.15)'}`, borderRadius: '0.5rem', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.78rem', color: '#F3EDE6', margin: 0 }}>{ev.day} · {ev.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
