'use client'

// Admin week view for the at-camp schedule — time as space. Day columns ×
// vertical hour axis (the same visual language as the member calendar,
// components/ScheduleCalendarClient.tsx: same hour scale, same shift-type
// hues), with admin interactions on top: click a block to edit it, click an
// empty slot to add an event with that date + time prefilled. Overlaps and
// gaps that are invisible in the list view jump out here.
//
// Recurring (daily) events render as ghosted bands in every column — context,
// not clutter. Dated events missing a parseable time surface in a fix-me
// strip below the grid.

import { MANDATORY_HUE, shiftHue, shiftColorIndexMap } from '@/lib/shift-colors'
import { parseHHMM } from '@/lib/shift-hours'
import { rangeTo24h } from '@/lib/time-format'
import type { ScheduleDay } from '@/lib/schedule-days'

// Structural subset of the manager's ScheduleEvent — everything the grid needs.
type WeekViewEvent = {
  id: string
  title: string
  time: string
  event_date: string | null
  is_recurring: boolean
  visible: boolean
  highlight: boolean
  participation_type: 'general' | 'shift' | 'mandatory'
  shift_type_id: string | null
  needs_lead: boolean
  capacity: number | null
  start_time: string | null
  end_time: string | null
}

type RosterEntry = { role: 'member' | 'lead' }

const PX_PER_HOUR = 56
const GOLD = '#C8A848'

// Minutes from midnight, structured times first, legacy free text as fallback.
function eventMinutes(e: WeekViewEvent): { start: number | null; end: number | null } {
  const legacy = rangeTo24h(e.time)
  const start = parseHHMM(e.start_time) ?? parseHHMM(legacy.start)
  let end = parseHHMM(e.end_time) ?? parseHHMM(legacy.end)
  // Midnight end / overnight: keep the block growing downward, not negative.
  if (start != null && end != null && end <= start) end += 24 * 60
  return { start, end }
}

function hue(e: WeekViewEvent, shiftIndex: Record<string, number>) {
  if (e.participation_type === 'mandatory') return MANDATORY_HUE
  if (e.participation_type === 'shift' && e.shift_type_id != null && shiftIndex[e.shift_type_id] != null) {
    return shiftHue(shiftIndex[e.shift_type_id])
  }
  // Daily recurring wears the manager's recurring purple (same as the "Daily
  // Recurring" section header + rail chip) — they're usually 'general', which
  // would otherwise dissolve into the neutral gold chrome.
  if (e.is_recurring) return { rgb: '210,57,248', accent: '#D239F8' }
  return { rgb: '200,168,72', accent: GOLD } // general → house gold
}

// Side-by-side lanes for overlapping events in one column. Greedy: sorted by
// start, each event takes the first lane that's free; a cluster of transitive
// overlaps shares the column width across its lane count.
function layoutLanes(evs: { id: string; start: number; end: number }[]): Record<string, { lane: number; lanes: number }> {
  const sorted = [...evs].sort((a, b) => a.start - b.start || a.end - b.end)
  const out: Record<string, { lane: number; lanes: number }> = {}
  const laneEnds: number[] = []
  let cluster: string[] = []
  let clusterEnd = -1
  const closeCluster = () => {
    const lanes = Math.max(...cluster.map(id => out[id].lane)) + 1
    for (const id of cluster) out[id].lanes = lanes
    cluster = []
    laneEnds.length = 0
  }
  for (const ev of sorted) {
    if (cluster.length > 0 && ev.start >= clusterEnd) closeCluster()
    let lane = laneEnds.findIndex(end => end <= ev.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = ev.end
    out[ev.id] = { lane, lanes: 1 }
    cluster.push(ev.id)
    clusterEnd = Math.max(clusterEnd, ev.end)
  }
  if (cluster.length > 0) closeCluster()
  return out
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

export function ScheduleWeekView({ events, days, shiftTypes, rosters, onEdit, onAddAt }: {
  events: WeekViewEvent[]
  days: ScheduleDay[]
  shiftTypes: { id: string; name: string }[]
  rosters: Record<string, RosterEntry[]>
  onEdit: (id: string) => void
  onAddAt: (dateIso: string, startTime: string) => void
}) {
  const shiftIndex = shiftColorIndexMap(shiftTypes)
  const dated = events.filter(e => !e.is_recurring && e.event_date)
  const recurring = events.filter(e => e.is_recurring)
  const untimed = dated.filter(e => eventMinutes(e).start == null)

  // Axis window from actual times (recurring included — their bands need to
  // fit), padded and rounded to the hour; sane default when nothing is timed.
  const allMinutes: number[] = []
  for (const e of [...dated, ...recurring]) {
    const { start, end } = eventMinutes(e)
    if (start != null) allMinutes.push(start)
    if (end != null) allMinutes.push(end)
  }
  const START_HOUR = allMinutes.length ? Math.floor((Math.min(...allMinutes) - 30) / 60) : 8
  const END_HOUR = allMinutes.length ? Math.ceil((Math.max(...allMinutes) + 30) / 60) : 23
  const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * PX_PER_HOUR
  const HOUR_LABELS = buildHourLabels(START_HOUR, END_HOUR)

  // Click an empty slot → add prefilled with the day + nearest half-hour.
  const slotClick = (iso: string) => (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mins = START_HOUR * 60 + ((e.clientY - rect.top) / PX_PER_HOUR) * 60
    const snapped = Math.max(0, Math.min(Math.round(mins / 30) * 30, 24 * 60 - 30)) % (24 * 60)
    onAddAt(iso, `${String(Math.floor(snapped / 60)).padStart(2, '0')}:${String(snapped % 60).padStart(2, '0')}`)
  }

  const block = (ev: WeekViewEvent, ghost: boolean, lane = 0, lanes = 1) => {
    const { start, end } = eventMinutes(ev)
    if (start == null) return null
    const h = hue(ev, shiftIndex)
    const top = ((start / 60) - START_HOUR) * PX_PER_HOUR
    const endMin = end ?? start + 45
    const height = Math.max((Math.min(endMin, END_HOUR * 60) - start) / 60 * PX_PER_HOUR, 26)
    const roster = rosters[ev.id]
    const n = roster?.length ?? 0
    const noLead = ev.participation_type === 'shift' && ev.needs_lead && n > 0 && !roster?.some(r => r.role === 'lead')
    const width = 100 / lanes
    return (
      <div
        key={ev.id}
        onClick={e => { e.stopPropagation(); onEdit(ev.id) }}
        title={`${ev.title}${ev.visible ? '' : ' (hidden)'}${ghost ? ' — daily recurring' : ''} — click to edit`}
        style={{
          position: 'absolute',
          top,
          height,
          left: `calc(${lane * width}% + 2px)`,
          width: `calc(${width}% - 4px)`,
          borderRadius: '0.35rem',
          border: `1px ${ghost || !ev.visible ? 'dashed' : 'solid'} rgba(${h.rgb},${ghost ? 0.45 : 0.5})`,
          background: `rgba(${h.rgb},${ghost ? 0.08 : 0.1})`,
          opacity: ev.visible ? (ghost ? 0.8 : 1) : 0.4,
          overflow: 'hidden',
          cursor: 'pointer',
          padding: '0.2rem 0.3rem',
          boxShadow: ev.highlight ? '0 0 10px rgba(200,168,72,0.35)' : undefined,
        }}
      >
        <p style={{ fontSize: '0.6rem', color: h.accent, margin: 0, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ev.time}
        </p>
        <p style={{ fontSize: '0.66rem', color: '#F3EDE6', margin: '0.1rem 0 0', lineHeight: 1.25, fontWeight: 600, overflow: 'hidden' }}>
          {ev.title}
        </p>
        {ev.participation_type === 'shift' && (
          <p style={{ fontSize: '0.58rem', color: h.accent, margin: '0.1rem 0 0', opacity: 0.85, whiteSpace: 'nowrap' }}>
            {n}{ev.capacity != null ? `/${ev.capacity}` : ''} signed up{noLead ? ' · ✦ no lead' : ''}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Grid (horizontal scroll if the range is wide) */}
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', minWidth: `${44 + days.length * 108}px` }}>
          {/* Hour axis */}
          <div style={{ width: '44px', flexShrink: 0, position: 'relative', height: TOTAL_HEIGHT, marginTop: '46px' }}>
            {HOUR_LABELS.map(({ hour, label }) => (
              <div key={hour} style={{
                position: 'absolute', top: (hour - START_HOUR) * PX_PER_HOUR - 7, left: 0, right: '6px',
                fontSize: '0.58rem', color: GOLD,
                opacity: label === 'Midnight' || label === 'Noon' ? 0.7 : 0.35,
                whiteSpace: 'nowrap', textAlign: 'right', letterSpacing: '0.02em',
                fontWeight: label === 'Midnight' || label === 'Noon' ? 600 : 400,
              }}>{label}</div>
            ))}
          </div>
          {/* Day columns */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, 1fr)`, gap: '0.4rem' }}>
            {days.map(day => {
              const dayEvents = dated
                .filter(e => e.event_date === day.iso)
                .map(e => ({ e, m: eventMinutes(e) }))
                .filter((x): x is { e: WeekViewEvent; m: { start: number; end: number | null } } => x.m.start != null)
              const lanes = layoutLanes(dayEvents.map(({ e, m }) => ({ id: e.id, start: m.start, end: m.end ?? m.start + 45 })))
              return (
                <div key={day.iso}>
                  <div style={{
                    height: '46px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '0.5rem 0.5rem 0 0', background: 'rgba(200,168,72,0.07)',
                    border: '1px solid rgba(200,168,72,0.2)', borderBottom: 'none',
                  }}>
                    <p style={{ fontSize: '0.56rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: GOLD, opacity: 0.6, margin: 0 }}>{day.short} · {day.month}</p>
                    <p style={{ fontSize: '0.92rem', color: '#F3EDE6', margin: '0.05rem 0 0', fontFamily: 'TokyoDreams, serif' }}>{day.date}</p>
                  </div>
                  <div
                    onClick={slotClick(day.iso)}
                    title="Click an empty slot to add an event here"
                    style={{
                      position: 'relative', height: TOTAL_HEIGHT,
                      border: '1px solid rgba(200,168,72,0.12)', borderRadius: '0 0 0.5rem 0.5rem',
                      background: 'rgba(255,255,255,0.01)', cursor: 'copy',
                    }}
                  >
                    {HOUR_LABELS.map(({ hour, label }) => (
                      <div key={hour} style={{
                        position: 'absolute', top: (hour - START_HOUR) * PX_PER_HOUR, left: 0, right: 0,
                        borderTop: `1px solid rgba(200,168,72,${label === 'Midnight' || label === 'Noon' ? '0.15' : '0.06'})`,
                        pointerEvents: 'none',
                      }} />
                    ))}
                    {/* Daily recurring — ghosted context in every column */}
                    {recurring.map(ev => block(ev, true))}
                    {dayEvents.map(({ e }) => block(e, false, lanes[e.id]?.lane ?? 0, lanes[e.id]?.lanes ?? 1))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Dated but untimed — can't sit on the grid until they get a time */}
      {untimed.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ff8a8a', opacity: 0.7, margin: '0 0 0.5rem' }}>
            No time yet — edit to place on the grid
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {untimed.map(ev => (
              <button key={ev.id} onClick={() => onEdit(ev.id)} style={{
                padding: '0.3rem 0.7rem', border: '1px dashed rgba(255,138,138,0.4)', borderRadius: '0.5rem',
                background: 'none', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.72rem', opacity: 0.8,
              }}>
                {ev.event_date} · {ev.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
