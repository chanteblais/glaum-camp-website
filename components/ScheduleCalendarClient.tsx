'use client'

import { useState, useEffect } from 'react'
import { EventIcon } from '@/components/EventIcon'
import { MANDATORY_HUE, shiftHue, generalHue } from '@/lib/shift-colors'
import { firstIsoByWeekday, type ScheduleDay } from '@/lib/schedule-days'

type ScheduleEvent = {
  id: string
  day: string
  time: string
  title: string
  subtitle: string | null
  detail_desc: string | null
  icon_type: string
  highlight: boolean
  is_recurring: boolean
  // Recurring only: NULL = every day; an array of ISO dates = just those days.
  recurrence_days?: string[] | null
  event_type: string | null
  event_date: string | null
  participation_type?: string | null
  shift_color_index?: number | null
}

// Day columns come from the events' real dates + the configured event range
// (lib/schedule-days.ts, built by ScheduleSection) — nothing hardcoded, so the
// headers always show true dates and no event can land on the wrong day.

const PX_PER_HOUR = 56

// Colour scheme (lib/shift-colors.ts): mandatory = the old all-hands teal;
// each shift type gets a distinct hue from the palette by registry position;
// general events wear their own stable hue hashed from the event id (they
// used to share one neutral styling, which made neighbours read as twins).
// The legacy event_type text keys are kept as a fallback for undecorated rows.
const EVENT_TYPE_STYLES: Record<string, { border: string; background: string; text: string }> = {
  all_hands:    { border: 'rgba(40,200,190,0.45)',  background: 'rgba(40,200,190,0.1)',  text: '#28c8be' },
  camp_tending: { border: 'rgba(240,90,20,0.55)',   background: 'rgba(240,90,20,0.12)',  text: '#e6781e' },
  service:      { border: 'rgba(240,100,180,0.5)',   background: 'rgba(240,100,180,0.1)',  text: '#f064b4' },
}

// True when the event carries a colour of its own (bolder title treatment).
function isColored(event: ScheduleEvent): boolean {
  return event.participation_type === 'mandatory'
    || (event.participation_type === 'shift' && event.shift_color_index != null)
    || !!event.event_type
}

function eventTypeStyle(event: ScheduleEvent) {
  if (event.participation_type === 'mandatory') {
    return { border: `rgba(${MANDATORY_HUE.rgb},0.45)`, background: `rgba(${MANDATORY_HUE.rgb},0.1)`, text: MANDATORY_HUE.accent }
  }
  if (event.participation_type === 'shift' && event.shift_color_index != null) {
    const hue = shiftHue(event.shift_color_index)
    return { border: `rgba(${hue.rgb},0.5)`, background: `rgba(${hue.rgb},0.1)`, text: hue.accent }
  }
  if (event.event_type && EVENT_TYPE_STYLES[event.event_type]) return EVENT_TYPE_STYLES[event.event_type]
  const hue = generalHue(event.id)
  return { border: `rgba(${hue.rgb},0.5)`, background: `rgba(${hue.rgb},0.12)`, text: hue.accent }
}

// Parse the first time in a string like "9:00 PM – 11:00 PM" → minutes from midnight
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

function parseEventTimes(timeStr: string | null): { start: number | null; end: number | null } {
  if (!timeStr) return { start: null, end: null }
  const parts = timeStr.split(/\s*[–—-]\s*/)
  const start = parseMinutes(parts[0])
  let end = parts[1] ? parseMinutes(parts[1]) : null
  // Overnight events ("11:00 PM – 2:00 AM") wrap past midnight; without this the
  // early-morning end time stretches the grid's start back to 1 AM.
  if (start !== null && end !== null && end <= start) end += 24 * 60
  return { start, end }
}

function minutesToTop(minutes: number, startHour: number): number {
  return ((minutes / 60) - startHour) * PX_PER_HOUR
}

function minutesToHeight(startMin: number, endMin: number, startHour: number, endHour: number): number {
  const s = Math.max(startMin / 60, startHour)
  const e = Math.min(endMin / 60, endHour)
  return Math.max((e - s) * PX_PER_HOUR, 28)
}

function buildHourLabels(startHour: number, endHour: number) {
  const labels: { hour: number; label: string }[] = []
  for (let h = startHour; h <= endHour; h++) {
    const display = h % 24
    const h12 = display === 0 ? 12 : display > 12 ? display - 12 : display
    const ampm = display < 12 || display === 0 ? 'AM' : 'PM'
    labels.push({ hour: h, label: display === 0 ? 'Midnight' : display === 12 ? 'Noon' : `${h12} ${ampm}` })
  }
  return labels
}

// ── Recurring Event Card (compact, expandable) ────────────────────────────────

function RecurringEventCard({ event }: { event: ScheduleEvent }) {
  // The card wears the same hue the event has on the calendar grids — one
  // identity per event, wherever it appears. Border + time label carry it;
  // a full background tint reads heavy at card size.
  const style = eventTypeStyle(event)
  return (
    <div style={{ padding: '1.25rem', border: `1px solid ${style.border}`, borderRadius: '0.85rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {event.time && (
        <p style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: style.text, opacity: 0.85, margin: 0, textAlign: 'center' }}>
          {event.time}
        </p>
      )}
      <div style={{ color: '#C8A848', opacity: 0.55, display: 'flex', justifyContent: 'center', flex: 1, alignItems: 'center' }}>
        <EventIcon type={event.icon_type} size={38} />
      </div>
      <div style={{ marginTop: 'auto' }}>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: '#F3EDE6', margin: '0 0 0.4rem', textAlign: 'center' }}>{event.title}</p>
        {event.detail_desc && <p style={{ fontSize: '0.85rem', lineHeight: 1.65, opacity: 0.6, margin: 0, textAlign: 'center' }}>{event.detail_desc}</p>}
      </div>
    </div>
  )
}

// ── Event Block ───────────────────────────────────────────────────────────────

function EventBlock({ event, style }: { event: ScheduleEvent; style: React.CSSProperties }) {
  const [expanded, setExpanded] = useState(false)
  const expandedText = event.detail_desc || event.subtitle
  const hasDetail = !!expandedText

  return (
    <div
      style={{
        ...style,
        position: 'absolute',
        left: '2px', right: '2px',
        borderRadius: '0.35rem',
        border: `1px solid ${eventTypeStyle(event).border}`,
        background: eventTypeStyle(event).background,
        boxShadow: event.highlight ? '0 0 10px rgba(200,168,72,0.35), 0 0 20px rgba(200,168,72,0.15)' : undefined,
        overflow: 'hidden',
        cursor: hasDetail ? 'pointer' : 'default',
        zIndex: expanded ? 10 : 1,
        transition: 'border-color 0.15s',
      }}
      onClick={() => hasDetail && setExpanded(o => !o)}
    >
      <div style={{ padding: '0.25rem 0.35rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', textAlign: 'center' }}>
          <div style={{ color: '#C8A848', opacity: 0.65 }}>
            <EventIcon type={event.icon_type} size={10} />
          </div>
          <p style={{ fontSize: '0.68rem', color: eventTypeStyle(event).text, margin: 0, lineHeight: 1.3, fontWeight: (event.highlight || isColored(event)) ? 600 : 400, wordBreak: 'break-word' }}>
            {event.title}
          </p>
          {hasDetail && (
            <span style={{ fontSize: '0.45rem', color: '#C8A848', opacity: 0.4 }}>
              {expanded ? '▲' : '▼'}
            </span>
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

// ── Main Calendar ─────────────────────────────────────────────────────────────

export function ScheduleCalendarClient({ events, days }: { events: ScheduleEvent[]; days: ScheduleDay[] }) {
  const [isMobile, setIsMobile] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string>(days[0]?.iso ?? '')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Undated legacy rows fall back to the first column matching their weekday name.
  const weekdayIso = firstIsoByWeekday(days)
  const columnIso = (e: ScheduleEvent): string | null => e.event_date ?? weekdayIso[e.day] ?? null

  const regular = [...events.filter(e => !e.is_recurring)].sort((a, b) => {
    const dateDiff = (columnIso(a) ?? '9999').localeCompare(columnIso(b) ?? '9999')
    if (dateDiff !== 0) return dateDiff
    return (parseEventTimes(a.time).start ?? 9999) - (parseEventTimes(b.time).start ?? 9999)
  })
  const recurring = events.filter(e => e.is_recurring)
  // True every-day events keep their card section below the grid; recurring
  // events pinned to specific dates render as blocks in those day columns.
  const everyDay = recurring.filter(e => !e.recurrence_days)
  const onDays = recurring.filter(e => e.recurrence_days && e.recurrence_days.length > 0)
  const recurringOn = (iso: string) => onDays.filter(e => e.recurrence_days!.includes(iso))
  const untimed = regular.filter(e => !e.time)

  // Compute display window from actual event times (+ 30 min padding each side)
  const allMinutes: number[] = []
  ;[...regular, ...onDays].forEach(e => {
    const { start, end } = parseEventTimes(e.time)
    if (start != null) allMinutes.push(start)
    if (end != null) allMinutes.push(end)
  })
  const PADDING = 30 // minutes
  const minMinutes = allMinutes.length ? Math.min(...allMinutes) - PADDING : 8 * 60
  const maxMinutes = allMinutes.length ? Math.max(...allMinutes) + PADDING : 24 * 60
  // Round to nearest hour for clean grid lines
  const START_HOUR = Math.floor(minMinutes / 60)
  const END_HOUR = Math.ceil(maxMinutes / 60)
  const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * PX_PER_HOUR
  const HOUR_LABELS = buildHourLabels(START_HOUR, END_HOUR)

  if (events.length === 0) {
    return (
      <p style={{ textAlign: 'center', fontSize: '0.9rem', opacity: 0.5, fontStyle: 'italic', margin: '2.5rem 0', lineHeight: 1.7 }}>
        The schedule is still taking shape — events will appear here as they're confirmed.
      </p>
    )
  }

  return (
    <div>
      {/* Time-based calendar grid */}
      {isMobile ? (
        // ── Mobile: day tab picker + single column ──
        <div>
          {/* Wrap (not scroll): every day tab stays visible on narrow phones —
              a hidden-scroll rail made SUN/MON undiscoverable at ~390px */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {days.map(day => {
              const active = selectedDay === day.iso
              return (
                <button
                  key={day.iso}
                  onClick={() => setSelectedDay(day.iso)}
                  style={{
                    flexShrink: 0,
                    padding: '0.4rem 0.9rem',
                    borderRadius: '9999px',
                    border: `1px solid ${active ? 'rgba(200,168,72,0.7)' : 'rgba(200,168,72,0.2)'}`,
                    background: active ? 'rgba(200,168,72,0.1)' : 'transparent',
                    color: active ? '#C8A848' : 'rgba(200,168,72,0.5)',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    fontWeight: active ? 700 : 400,
                    textAlign: 'center',
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ display: 'block' }}>{day.short}</span>
                  <span style={{ display: 'block', fontSize: '0.65rem', opacity: 0.8 }}>{day.month} {day.date}</span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '0' }}>
            {/* Time axis */}
            <div style={{ width: '44px', flexShrink: 0, position: 'relative', height: TOTAL_HEIGHT, marginTop: '0' }}>
              {HOUR_LABELS.map(({ hour, label }) => (
                <div key={hour} style={{
                  position: 'absolute',
                  top: (hour - START_HOUR) * PX_PER_HOUR - 7,
                  left: 0, right: '6px',
                  fontSize: '0.58rem', color: '#C8A848',
                  opacity: label === 'Midnight' || label === 'Noon' ? 0.7 : 0.35,
                  whiteSpace: 'nowrap', textAlign: 'right',
                  letterSpacing: '0.02em',
                  fontWeight: label === 'Midnight' || label === 'Noon' ? 600 : 400,
                }}>{label}</div>
              ))}
            </div>
            {/* Single day column */}
            <div style={{ flex: 1, position: 'relative', height: TOTAL_HEIGHT, border: '1px solid rgba(200,168,72,0.12)', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.01)', overflow: 'visible' }}>
              {HOUR_LABELS.map(({ hour, label }) => (
                <div key={hour} style={{
                  position: 'absolute', top: (hour - START_HOUR) * PX_PER_HOUR, left: 0, right: 0,
                  borderTop: `1px solid rgba(200,168,72,${label === 'Midnight' || label === 'Noon' ? '0.15' : '0.06'})`,
                }} />
              ))}
              {[...regular.filter(e => columnIso(e) === selectedDay), ...recurringOn(selectedDay)].map(ev => {
                const { start, end } = parseEventTimes(ev.time)
                if (start === null) return null
                const top = minutesToTop(start, START_HOUR)
                const height = end ? minutesToHeight(start, end, START_HOUR, END_HOUR) : Math.max(PX_PER_HOUR * 0.75, 32)
                return <EventBlock key={`${ev.id}-${selectedDay}`} event={ev} style={{ top, height }} />
              })}
            </div>
          </div>
        </div>
      ) : (
        // ── Desktop: all 6 day columns ──
        <div style={{ display: 'flex', gap: '0' }}>
          <div style={{ width: '44px', flexShrink: 0, position: 'relative', height: TOTAL_HEIGHT, marginTop: '52px' }}>
            {HOUR_LABELS.map(({ hour, label }) => (
              <div key={hour} style={{
                position: 'absolute',
                top: (hour - START_HOUR) * PX_PER_HOUR - 7,
                left: 0, right: '6px',
                fontSize: '0.58rem', color: '#C8A848',
                opacity: label === 'Midnight' || label === 'Noon' ? 0.7 : 0.35,
                whiteSpace: 'nowrap', textAlign: 'right',
                letterSpacing: '0.02em',
                fontWeight: label === 'Midnight' || label === 'Noon' ? 600 : 400,
              }}>{label}</div>
            ))}
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, 1fr)`, gap: '0.4rem' }}>
            {days.map(day => {
              const dayEvents = [...regular.filter(e => columnIso(e) === day.iso), ...recurringOn(day.iso)]
              return (
                <div key={day.iso}>
                  <div style={{
                    height: '52px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '0.5rem 0.5rem 0 0',
                    background: 'rgba(200,168,72,0.07)',
                    border: '1px solid rgba(200,168,72,0.2)',
                    borderBottom: 'none',
                  }}>
                    <p style={{ fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, margin: 0 }}>{day.short} · {day.month}</p>
                    <p style={{ fontSize: '1rem', color: '#F3EDE6', margin: '0.1rem 0 0', fontFamily: 'TokyoDreams, serif' }}>{day.date}</p>
                  </div>
                  <div style={{
                    position: 'relative', height: TOTAL_HEIGHT,
                    border: '1px solid rgba(200,168,72,0.12)',
                    borderRadius: '0 0 0.5rem 0.5rem',
                    background: 'rgba(255,255,255,0.01)', overflow: 'visible',
                  }}>
                    {HOUR_LABELS.map(({ hour, label }) => (
                      <div key={hour} style={{
                        position: 'absolute', top: (hour - START_HOUR) * PX_PER_HOUR, left: 0, right: 0,
                        borderTop: `1px solid rgba(200,168,72,${label === 'Midnight' || label === 'Noon' ? '0.15' : '0.06'})`,
                      }} />
                    ))}
                    {dayEvents.map(ev => {
                      const { start, end } = parseEventTimes(ev.time)
                      if (start === null) return null
                      const top = minutesToTop(start, START_HOUR)
                      const height = end ? minutesToHeight(start, end, START_HOUR, END_HOUR) : Math.max(PX_PER_HOUR * 0.75, 32)
                      return <EventBlock key={`${ev.id}-${day.iso}`} event={ev} style={{ top, height }} />
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Untimed events */}
      {untimed.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.75rem' }}>No fixed time</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {untimed.map(ev => (
              <div key={ev.id} style={{ padding: '0.4rem 0.75rem', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.78rem', color: '#F3EDE6', margin: 0 }}>{ev.day} · {ev.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Every Day — recurring events without picked dates (compact) */}
      {everyDay.length > 0 && (
        <div style={{ marginTop: '2.5rem' }}>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '2rem' }} />
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.62rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.65 }}>
              ✦ &nbsp;Every Day&nbsp; ✦
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {everyDay.map(ev => <RecurringEventCard key={ev.id} event={ev} />)}
          </div>
        </div>
      )}

      {/* Event Details cards */}
      {regular.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '2.5rem' }} />
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.7 }}>
              ✦ &nbsp;Event Details&nbsp; ✦
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {regular.filter((card, i, arr) => arr.findIndex(c => c.title === card.title) === i).map(card => (
              <div key={card.id} style={{ padding: '1.25rem', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '0.85rem', background: 'rgba(200,168,72,0.03)', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: card.highlight ? '0 0 18px rgba(200,168,72,0.3), 0 0 40px rgba(200,168,72,0.1)' : undefined }}>
                <p style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.85, margin: 0, textAlign: 'center' }}>
                  {card.day}&nbsp;&nbsp;{card.time}
                </p>
                <div style={{ color: '#C8A848', opacity: 0.55, display: 'flex', justifyContent: 'center', flex: 1, alignItems: 'center' }}>
                  <EventIcon type={card.icon_type} size={card.icon_type.startsWith('http') || card.icon_type.startsWith('/') ? 72 : 38} />
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#F3EDE6', margin: '0 0 0.4rem', textAlign: 'center' }}>{card.title}</p>
                  {card.detail_desc && <p style={{ fontSize: '0.85rem', lineHeight: 1.65, opacity: 0.6, margin: 0, textAlign: 'center' }}>{card.detail_desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
