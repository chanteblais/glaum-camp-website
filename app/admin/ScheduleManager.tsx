'use client'

import { useState, useEffect, useRef } from 'react'
import { EventIcon } from '@/components/EventIcon'
import { AssetImagePicker } from './AssetImagePicker'
import { LoadError } from './LoadError'
import { isImageIcon } from '@/lib/icon-src'
import { formatTime } from '@/lib/time-format'
import { shiftDurationHours, formatShiftRange, weekdayFromISO } from '@/lib/shift-hours'
import { buildScheduleDays, type ScheduleDay } from '@/lib/schedule-days'

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
  capacity: number | null
  event_type: string | null
  contribution_type: string | null
  event_date: string | null
  event_category: string
  participation_type: 'general' | 'shift' | 'mandatory'
  shift_type_id: string | null
  requires_ack: boolean
  start_time: string | null
  end_time: string | null
  needs_lead: boolean
}

// Shift types offered when an event is a Shift (Configure → Shift Types registry).
type ShiftTypeOption = { id: string; name: string }

// One holder of a shift, from GET /api/admin/schedule/rosters (member_shift_signups
// ∪ legacy camp_signups). legacy_only holds have no member_shift_signups row,
// so the lead toggle can't touch them.
type RosterEntry = { clerk_user_id: string; name: string; role: 'member' | 'lead'; legacy_only: boolean }

// Weekday fallback order — only used to sort legacy UNDATED rows among themselves.
const DAY_ORDER: Record<string, number> = {
  Wednesday: 0, Thursday: 1, Friday: 2, Saturday: 3, Sunday: 4, Monday: 5, Tuesday: 6,
}

// Parse a time string like "7:00 PM" or "7:00 PM – 10:00 PM" to minutes since midnight
function parseStartMinutes(time: string): number {
  if (!time) return 9999
  const token = time.split(/[–—-]/)[0].trim()
  const m = token.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!m) {
    if (/midnight/i.test(token)) return 24 * 60
    if (/noon/i.test(token)) return 12 * 60
    return 9999
  }
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2] ?? '0', 10)
  const period = m[3]?.toLowerCase()
  if (period === 'pm' && h < 12) h += 12
  if (period === 'am' && h === 12) h = 0
  return h * 60 + min
}

// Time orders rows within a day; title breaks ties so the order is stable.
function sortByTime(evs: ScheduleEvent[]): ScheduleEvent[] {
  return [...evs].sort((a, b) =>
    parseStartMinutes(a.time) - parseStartMinutes(b.time) || a.title.localeCompare(b.title)
  )
}

const blank = (): Omit<ScheduleEvent, 'id' | 'sort_order'> => ({
  day: '', time: '', title: '', subtitle: '', detail_desc: '',
  icon_type: 'star', visible: true, highlight: false, is_recurring: false, capacity: null, event_type: null, contribution_type: null, event_date: null, event_category: 'at_camp', participation_type: 'general', shift_type_id: null, requires_ack: false, start_time: null, end_time: null, needs_lead: false,
})

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,168,72,0.2)',
  borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#F3EDE6', fontSize: '0.875rem',
  fontFamily: 'var(--font-libre-baskerville), Georgia, serif', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase',
  color: '#C8A848', opacity: 0.65, display: 'block', marginBottom: '0.35rem',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', userSelect: 'none' }}>
      <span
        onClick={() => onChange(!checked)}
        style={{
          display: 'inline-block', width: '36px', height: '20px', borderRadius: '9999px', flexShrink: 0,
          background: checked ? '#C8A848' : 'rgba(255,255,255,0.1)',
          border: `1px solid ${checked ? '#C8A848' : 'rgba(200,168,72,0.2)'}`,
          position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
        }}
      >
        <span style={{
          position: 'absolute', top: '2px', left: checked ? '17px' : '2px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: '#F3EDE6', transition: 'left 0.2s',
        }} />
      </span>
      <span style={{ opacity: 0.75 }}>{label}</span>
    </label>
  )
}

function EventModal({
  initial,
  onSave,
  onClose,
  saving,
  error,
  shiftTypes,
}: {
  initial: Omit<ScheduleEvent, 'id' | 'sort_order'>
  onSave: (form: Omit<ScheduleEvent, 'id' | 'sort_order'>) => void
  onClose: () => void
  shiftTypes: ShiftTypeOption[]
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }))

  // The weekday derives from the picked date — no separate Day dropdown to get
  // out of sync (picking the wrong Wednesday used to be an easy mistake).
  const derivedDay = weekdayFromISO(form.event_date)
  // Non-recurring events need a real date so the schedule can place them.
  const canSave = !!form.title && (form.is_recurring || !!form.event_date)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(95vw, 580px)', maxHeight: '88vh', overflowY: 'auto',
        background: '#1A0A24', border: '1px solid rgba(200,168,72,0.25)',
        borderRadius: '1rem', padding: '1.5rem', zIndex: 50,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.15rem', color: '#C8A848', margin: 0 }}>
            {initial.title ? 'Edit event' : 'New event'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#C8A848', fontSize: '1.4rem', cursor: 'pointer', opacity: 0.7 }}>×</button>
        </div>

        <Field label="Title">
          <input style={inputStyle} value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>

        {/* Date first — the weekday derives from it, shown as instant feedback. */}
        {!form.is_recurring && (
          <Field label="Date">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <input
                style={{ ...inputStyle, width: '180px' }}
                type="date"
                value={form.event_date ?? ''}
                onChange={e => set('event_date', e.target.value || null)}
              />
              <span style={{ fontSize: '0.85rem', color: derivedDay ? '#C8A848' : 'rgba(243,237,230,0.35)', letterSpacing: '0.04em', fontStyle: derivedDay ? 'normal' : 'italic' }}>
                {derivedDay ?? 'pick a date'}
              </span>
            </div>
          </Field>
        )}

        {/* Shift events set their time via Start/End (below); other events use free text. */}
        {form.participation_type !== 'shift' && (
          <Field label="Time">
            <input style={inputStyle} value={form.time} placeholder="e.g. 7:00 PM – 10:00 PM" onChange={(e) => set('time', e.target.value)} />
          </Field>
        )}

        {!form.is_recurring && (
          <Field label="Subtitle — shown in the At a Glance table">
            <textarea rows={2} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} value={form.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} placeholder="Short italic line under the event title in the schedule table" />
          </Field>
        )}

        <Field label={form.is_recurring ? 'Description' : 'Details — shown in the Event Details cards'}>
          <textarea rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} value={form.detail_desc ?? ''} onChange={(e) => set('detail_desc', e.target.value)} placeholder="Longer description" />
        </Field>

        <Field label="Icon">
          <AssetImagePicker
            value={isImageIcon(form.icon_type) ? form.icon_type : undefined}
            onChange={v => set('icon_type', v ?? 'star')}
            uploadUrl="/api/admin/schedule/icon"
            primaryCategory="icon"
            label="Event icon"
          />
        </Field>

        <Field label="Participation">
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.participation_type}
            onChange={e => set('participation_type', e.target.value)}
          >
            <option value="general">General — just happening, optional</option>
            <option value="shift">Shift — members sign up</option>
            <option value="mandatory">Mandatory — everyone attends</option>
          </select>
        </Field>

        {form.participation_type === 'shift' && (
          <>
            <Field label="Shift type">
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.shift_type_id ?? ''}
                onChange={e => set('shift_type_id', e.target.value || null)}
              >
                <option value="">Select…</option>
                {shiftTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <p style={{ fontSize: '0.72rem', opacity: 0.4, lineHeight: 1.5, margin: '0.35rem 0 0' }}>
                Kinds are defined in Configure → Shift Types. Requirements (who owes hours) live on groups/roles or attunement tasks.
              </p>
            </Field>
            <Field label="Lead role">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={form.needs_lead}
                  onChange={e => set('needs_lead', e.target.checked)}
                  style={{ marginTop: '0.2rem', accentColor: '#C8A848', cursor: 'pointer' }}
                />
                <span style={{ opacity: 0.75, lineHeight: 1.5 }}>
                  This shift has a lead ✦ — members are offered &ldquo;I&rsquo;d like to be the shift lead&rdquo; when they sign up
                </span>
              </label>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0 1rem', alignItems: 'end' }}>
              <Field label="Start">
                <input type="time" style={inputStyle} value={form.start_time ?? ''} onChange={e => set('start_time', e.target.value || null)} />
              </Field>
              <Field label="End">
                <input type="time" style={inputStyle} value={form.end_time ?? ''} onChange={e => set('end_time', e.target.value || null)} />
              </Field>
              <div style={{ marginBottom: '1rem', paddingBottom: '0.6rem', fontSize: '0.82rem', color: '#C8A848', opacity: 0.75, whiteSpace: 'nowrap' }}>
                {shiftDurationHours(form.start_time, form.end_time) > 0 ? `${shiftDurationHours(form.start_time, form.end_time)}h` : '—'}
              </div>
            </div>
            <Field label="Capacity per slot (optional — blank = unlimited)">
              <input
                style={{ ...inputStyle, width: '120px' }}
                type="number"
                min={1}
                placeholder="e.g. 20"
                value={form.capacity ?? ''}
                onChange={e => set('capacity', e.target.value === '' ? null : parseInt(e.target.value) || null)}
              />
            </Field>
          </>
        )}

        {form.participation_type === 'mandatory' && (
          <div style={{ marginBottom: '1rem' }}>
            <Toggle checked={form.requires_ack} onChange={(v) => set('requires_ack', v)} label="Requires acknowledgement (members tap “I'll be there”)" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem', marginBottom: '1.25rem' }}>
          <Toggle checked={form.visible} onChange={(v) => set('visible', v)} label="Visible on site" />
          <Toggle checked={form.highlight} onChange={(v) => set('highlight', v)} label="Highlight day" />
          <Toggle checked={form.is_recurring} onChange={(v) => set('is_recurring', v)} label="Daily recurring" />
        </div>

        {error && <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7 }}>
            Cancel
          </button>
          <button onClick={() => onSave(form)} disabled={saving || !canSave} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.05em', opacity: (saving || !canSave) ? 0.5 : 1 }}>
            {saving ? 'Saving…' : 'Save event'}
          </button>
        </div>
      </div>
    </>
  )
}

const PARTICIPATION_BADGE: Record<string, string> = { general: '#8fb0d0', shift: '#D239F8', mandatory: '#C8A848' }

// Drag-reorder only exists where order is real: recurring events render in
// sort_order on the member schedule. Dated events order by date + time, so
// their rows aren't draggable.
type DragHandlers = {
  isDragOver: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}

function EventRow({
  event,
  shiftTypeName,
  showDay,
  drag,
  roster,
  onEdit,
  onDelete,
  onToggleVisible,
}: {
  event: ScheduleEvent
  shiftTypeName?: string
  showDay?: boolean
  drag?: DragHandlers
  roster?: React.ReactNode
  onEdit: () => void
  onDelete: () => void
  onToggleVisible: () => void
}) {
  return (
    <div
      draggable={!!drag}
      onDragStart={drag?.onDragStart}
      onDragOver={drag?.onDragOver}
      onDrop={drag?.onDrop}
      onDragEnd={drag?.onDragEnd}
      style={{
        padding: '0.6rem 1rem', borderRadius: '0.65rem',
        border: drag?.isDragOver
          ? '1px solid rgba(200,168,72,0.5)'
          : '1px solid rgba(200,168,72,0.12)',
        background: drag?.isDragOver
          ? 'rgba(200,168,72,0.07)'
          : event.visible ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.005)',
        opacity: event.visible ? 1 : 0.5,
        cursor: drag ? 'grab' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {/* Drag handle (recurring only) */}
      {drag && (
        <div style={{ color: '#C8A848', opacity: 0.25, flexShrink: 0, fontSize: '1rem', lineHeight: 1, userSelect: 'none' }}>
          ⠿
        </div>
      )}

      {/* Time column — aligned down the day, so the eye reads a timetable */}
      <div style={{ width: '6.2rem', flexShrink: 0, fontSize: '0.72rem', lineHeight: 1.4, color: '#C8A848', opacity: event.time ? 0.75 : 0.3 }}>
        {event.time || '—'}
      </div>

      {/* Icon */}
      <div style={{ color: '#C8A848', opacity: 0.45, flexShrink: 0 }}>
        <EventIcon type={event.icon_type} size={18} />
      </div>

      {/* Title (+ weekday name for undated legacy rows) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F3EDE6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.title}
          {event.highlight && <span style={{ color: '#C8A848', opacity: 0.7, marginLeft: '0.4rem' }}>✦</span>}
        </p>
        {showDay && event.day && (
          <p style={{ fontSize: '0.68rem', color: '#C8A848', opacity: 0.5, margin: '0.1rem 0 0', letterSpacing: '0.06em' }}>{event.day}</p>
        )}
      </div>

      {/* Participation badge — shift shows its shift-type name */}
      {event.participation_type !== 'general' && (
        <span style={{ fontSize: '0.6rem', color: PARTICIPATION_BADGE[event.participation_type] ?? '#C8A848', opacity: 0.9, border: `1px solid ${(PARTICIPATION_BADGE[event.participation_type] ?? '#C8A848')}55`, borderRadius: '9999px', padding: '0.1rem 0.5rem', flexShrink: 0, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          {event.participation_type === 'shift' ? (shiftTypeName ?? 'Shift') : 'Mandatory'}
        </span>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <button
          onClick={onToggleVisible}
          title={event.visible ? 'Visible to members — click to hide' : 'Hidden from members — click to show'}
          aria-label={event.visible ? 'Visible to members — click to hide' : 'Hidden from members — click to show'}
          style={{ background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.6 }}
        >
          {event.visible ? '●' : '○'}
        </button>
        <button onClick={onEdit} style={{ background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.6 }}>
          Edit
        </button>
        <button onClick={onDelete} style={{ background: 'none', border: '1px solid rgba(255,100,100,0.2)', borderRadius: '0.4rem', color: '#ff8a8a', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.5 }}>
          ✕
        </button>
      </div>
    </div>
    {roster}
    </div>
  )
}

// Compact roster under a shift row: count vs capacity, then one chip per holder
// (✦ = lead). Chips toggle lead/member with the same set_shift_role PATCH the
// member page uses — so the digest's "full but no lead" flag is fixable right
// here. Legacy-only holds can't carry a role, so their chip is inert.
function ShiftRoster({ event, entries, busyKey, error, onToggleLead }: {
  event: ScheduleEvent
  entries: RosterEntry[]
  busyKey: string | null
  error: string | null
  onToggleLead: (entry: RosterEntry) => void
}) {
  const n = entries.length
  const hasLead = entries.some(e => e.role === 'lead')
  const full = event.capacity != null && n >= event.capacity
  return (
    <div style={{ marginTop: '0.5rem', paddingLeft: '6.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.68rem', color: full ? '#C8A848' : '#F3EDE6', opacity: full ? 0.85 : 0.4, whiteSpace: 'nowrap' }}>
        {n}{event.capacity != null ? ` / ${event.capacity}` : ''} signed up
      </span>
      {event.needs_lead && n > 0 && !hasLead && (
        <span style={{ fontSize: '0.62rem', color: '#C8A848', border: '1px solid rgba(200,168,72,0.4)', borderRadius: '9999px', padding: '0.08rem 0.5rem', whiteSpace: 'nowrap' }}>
          ✦ no lead yet
        </span>
      )}
      {entries.map(e => {
        const busy = busyKey === `${event.id}|${e.clerk_user_id}`
        const lead = e.role === 'lead'
        return (
          <button
            key={e.clerk_user_id}
            onClick={() => onToggleLead(e)}
            disabled={busy || e.legacy_only}
            title={e.legacy_only
              ? 'Legacy signup — manage from their member page'
              : lead ? 'Demote to member' : 'Make shift lead ✦'}
            style={{
              background: 'none', borderRadius: '9999px', padding: '0.12rem 0.55rem',
              fontSize: '0.68rem', whiteSpace: 'nowrap',
              border: `1px solid ${lead ? 'rgba(200,168,72,0.45)' : 'rgba(255,255,255,0.12)'}`,
              color: lead ? '#C8A848' : '#F3EDE6',
              cursor: e.legacy_only ? 'default' : 'pointer',
              opacity: busy ? 0.35 : e.legacy_only ? 0.45 : lead ? 0.95 : 0.65,
            }}
          >
            {lead && <span style={{ marginRight: '0.3rem' }}>✦</span>}
            {e.name}
          </button>
        )
      })}
      {error && <span style={{ fontSize: '0.68rem', color: '#ff8a8a' }}>{error}</span>}
    </div>
  )
}

// Section header shared by the day groups: label · count · hairline · add.
function GroupHeader({ label, sub, count, onAdd, addLabel, color = '#C8A848' }: {
  label: string
  sub?: string
  count?: number
  onAdd?: () => void
  addLabel?: string
  color?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.6rem' }}>
      <span style={{ fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color, opacity: 0.75, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {sub && <span style={{ fontSize: '0.68rem', color: '#F3EDE6', opacity: 0.35, whiteSpace: 'nowrap' }}>{sub}</span>}
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: '0.68rem', color: '#F3EDE6', opacity: 0.3 }}>{count}</span>
      )}
      <span style={{ flex: 1, height: '1px', alignSelf: 'center', background: `linear-gradient(90deg, ${color}26, transparent)` }} />
      {onAdd && (
        <button
          onClick={onAdd}
          style={{ background: 'none', border: 'none', color, cursor: 'pointer', fontSize: '0.72rem', letterSpacing: '0.06em', opacity: 0.55, padding: 0, whiteSpace: 'nowrap' }}
        >
          {addLabel ?? '+ Add'}
        </button>
      )}
    </div>
  )
}

export function ScheduleManager({ rangeStart, rangeEnd }: { rangeStart?: string; rangeEnd?: string }) {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeOption[]>([])
  const [rosters, setRosters] = useState<Record<string, RosterEntry[]>>({})
  const [rosterBusy, setRosterBusy] = useState<string | null>(null)
  const [rosterError, setRosterError] = useState<{ eventId: string; message: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [modal, setModal] = useState<{ mode: 'add'; recurring: boolean; date?: string } | { mode: 'edit'; event: ScheduleEvent } | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const draggedId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const load = async () => {
    setLoadError(false)
    try {
      const res = await fetch('/api/admin/schedule')
      if (!res.ok) throw new Error()
      const json = await res.json()
      // API order = sort_order, which recurring rows rely on; day groups re-sort by time.
      setEvents(json.events)
    } catch {
      setLoadError(true)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    fetch('/api/admin/shift-types')
      .then(r => r.json())
      .then(d => setShiftTypes((d.shiftTypes ?? []).map((t: ShiftTypeOption) => ({ id: t.id, name: t.name }))))
      .catch(() => setShiftTypes([]))
  }, [])

  useEffect(() => {
    fetch('/api/admin/schedule/rosters')
      .then(r => r.json())
      .then(d => setRosters(d.rosters ?? {}))
      .catch(() => setRosters({}))
  }, [])

  const dated = events.filter((e) => !e.is_recurring && e.event_date)
  const undated = [...events.filter((e) => !e.is_recurring && !e.event_date)].sort(
    (a, b) => ((DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99)) || (parseStartMinutes(a.time) - parseStartMinutes(b.time))
  )
  const recurring = events.filter((e) => e.is_recurring)

  // Same day model as the member calendar: configured range ∪ every event date.
  const days = buildScheduleDays(dated.map((e) => e.event_date), rangeStart, rangeEnd)
  const eventsOn = (iso: string) => sortByTime(dated.filter((e) => e.event_date === iso))

  const jumpTo = (key: string) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSave = async (form: Omit<ScheduleEvent, 'id' | 'sort_order'>) => {
    setSaving(true)
    setModalError(null)
    // Shift events derive their display `time` from start/end; others keep free
    // text. Fall back to the existing text if start/end aren't set yet, so an
    // untimed legacy shift doesn't lose its display line.
    const time = form.participation_type === 'shift'
      ? (formatShiftRange(form.start_time, form.end_time) || form.time)
      : formatTime(form.time)
    const normalised = { ...form, time }
    try {
      let res: Response
      if (modal?.mode === 'edit') {
        res = await fetch(`/api/admin/schedule/${modal.event.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(normalised),
        })
      } else {
        res = await fetch('/api/admin/schedule', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(normalised),
        })
      }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      await load()
      setModal(null)
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return
    await fetch(`/api/admin/schedule/${id}`, { method: 'DELETE' })
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  const handleToggleVisible = async (event: ScheduleEvent) => {
    await fetch(`/api/admin/schedule/${event.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !event.visible }),
    })
    setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, visible: !e.visible } : e))
  }

  // Reorder within the recurring group (the only group where sort_order shows).
  const handleDropRecurring = async (targetId: string) => {
    const fromId = draggedId.current
    if (!fromId || fromId === targetId) return
    setDragOverId(null)
    draggedId.current = null

    const fromIdx = recurring.findIndex((e) => e.id === fromId)
    const toIdx = recurring.findIndex((e) => e.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return

    const reordered = [...recurring]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setEvents((prev) => [...prev.filter((e) => !e.is_recurring), ...reordered])

    await Promise.all(
      reordered.map((e, i) =>
        fetch(`/api/admin/schedule/${e.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: i + 1 }),
        })
      )
    )
  }

  const dragHandlersFor = (ev: ScheduleEvent): DragHandlers => ({
    isDragOver: dragOverId === ev.id,
    onDragStart: () => { draggedId.current = ev.id },
    onDragOver: (e) => { e.preventDefault(); setDragOverId(ev.id) },
    onDrop: () => handleDropRecurring(ev.id),
    onDragEnd: () => { draggedId.current = null; setDragOverId(null) },
  })

  const openAdd = (date?: string) => { setModal({ mode: 'add', recurring: false, date }); setModalError(null) }
  const openEdit = (ev: ScheduleEvent) => { setModal({ mode: 'edit', event: ev }); setModalError(null) }

  // Promote/demote a lead right on the roster — same endpoint as the member
  // page's "Make lead" (PATCH /api/admin/signups/[userId], set_shift_role).
  const handleToggleLead = async (eventId: string, entry: RosterEntry) => {
    setRosterBusy(`${eventId}|${entry.clerk_user_id}`)
    setRosterError(null)
    const role = entry.role === 'lead' ? 'member' : 'lead'
    try {
      const res = await fetch(`/api/admin/signups/${entry.clerk_user_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_shift_role: { schedule_event_id: eventId, role } }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setRosters(prev => ({
        ...prev,
        [eventId]: (prev[eventId] ?? []).map(e => e.clerk_user_id === entry.clerk_user_id ? { ...e, role } : e),
      }))
    } catch (e: unknown) {
      setRosterError({ eventId, message: e instanceof Error ? e.message : 'Something went wrong' })
    } finally {
      setRosterBusy(null)
    }
  }

  const rowProps = (ev: ScheduleEvent) => ({
    event: ev,
    shiftTypeName: shiftTypes.find((t) => t.id === ev.shift_type_id)?.name,
    roster: ev.participation_type === 'shift' ? (
      <ShiftRoster
        event={ev}
        entries={rosters[ev.id] ?? []}
        busyKey={rosterBusy}
        error={rosterError?.eventId === ev.id ? rosterError.message : null}
        onToggleLead={(entry) => handleToggleLead(ev.id, entry)}
      />
    ) : undefined,
    onEdit: () => openEdit(ev),
    onDelete: () => handleDelete(ev.id),
    onToggleVisible: () => handleToggleVisible(ev),
  })

  const chipStyle = (color = '#C8A848'): React.CSSProperties => ({
    flexShrink: 0, padding: '0.35rem 0.8rem', borderRadius: '9999px',
    border: `1px solid ${color}33`, background: 'transparent',
    color, cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.08em',
    whiteSpace: 'nowrap', opacity: 0.75,
  })

  if (loading) return <p style={{ opacity: 0.4, fontStyle: 'italic', fontSize: '0.875rem' }}>Loading…</p>
  if (loadError) return <LoadError onRetry={() => { setLoading(true); load() }} />

  return (
    <div>
      {/* Header: total count + global add (per-day adds prefill their date) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <p style={{ fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, margin: 0 }}>
          Scheduled Events — {dated.length + undated.length}
        </p>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.25)', background: 'transparent', color: '#C8A848', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.06em', opacity: 0.75 }}
          onClick={() => openAdd()}
        >
          + Add event
        </button>
      </div>

      {/* Day rail — one chip per day, click to jump */}
      {(days.length > 1 || undated.length > 0 || recurring.length > 0) && (
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.4rem', marginBottom: '1.25rem' }}>
          {days.map((d) => {
            const n = eventsOn(d.iso).length
            return (
              <button key={d.iso} style={{ ...chipStyle(), opacity: n > 0 ? 0.85 : 0.4 }} onClick={() => jumpTo(d.iso)}>
                {d.short} {d.date}
              </button>
            )
          })}
          {undated.length > 0 && (
            <button style={chipStyle('#ff8a8a')} onClick={() => jumpTo('undated')}>Undated</button>
          )}
          {recurring.length > 0 && (
            <button style={chipStyle('#D239F8')} onClick={() => jumpTo('recurring')}>Daily</button>
          )}
        </div>
      )}

      {/* Day sections */}
      {days.length === 0 && undated.length === 0 && (
        <p style={{ opacity: 0.35, fontStyle: 'italic', fontSize: '0.82rem' }}>
          No events yet. Set the event dates in Configure → Event Dates to lay out the days, or add a dated event.
        </p>
      )}
      {days.map((d) => {
        const dayEvents = eventsOn(d.iso)
        return (
          <div key={d.iso} ref={(el) => { sectionRefs.current[d.iso] = el }} style={{ marginBottom: '1.5rem', scrollMarginTop: '5.5rem' }}>
            <GroupHeader
              label={`${d.label} · ${d.month} ${d.date}`}
              count={dayEvents.length}
              onAdd={() => openAdd(d.iso)}
            />
            {dayEvents.length === 0 ? (
              <p style={{ opacity: 0.25, fontStyle: 'italic', fontSize: '0.78rem', margin: '0 0 0 1rem' }}>Nothing scheduled.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {dayEvents.map((ev) => <EventRow key={ev.id} {...rowProps(ev)} />)}
              </div>
            )}
          </div>
        )
      })}

      {/* Undated legacy rows — they need a real date to sit on the calendar */}
      {undated.length > 0 && (
        <div ref={(el) => { sectionRefs.current['undated'] = el }} style={{ marginBottom: '1.5rem', scrollMarginTop: '5.5rem' }}>
          <GroupHeader label="Undated" sub="edit each event to give it a date" count={undated.length} color="#ff8a8a" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {undated.map((ev) => <EventRow key={ev.id} {...rowProps(ev)} showDay />)}
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.15), transparent)', margin: '0 0 1.5rem' }} />

      {/* Recurring events — order here is their display order, so drag persists */}
      <div ref={(el) => { sectionRefs.current['recurring'] = el }} style={{ scrollMarginTop: '5.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.55, margin: 0 }}>
            Daily Recurring — {recurring.length}
          </p>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '9999px', border: '1px solid rgba(210,57,248,0.25)', background: 'transparent', color: '#D239F8', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.06em', opacity: 0.75 }}
            onClick={() => { setModal({ mode: 'add', recurring: true }); setModalError(null) }}
          >
            + Add recurring
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {recurring.length === 0 && <p style={{ opacity: 0.35, fontStyle: 'italic', fontSize: '0.82rem' }}>No recurring events yet.</p>}
          {recurring.map((ev) => <EventRow key={ev.id} {...rowProps(ev)} drag={dragHandlersFor(ev)} />)}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <EventModal
          initial={modal.mode === 'edit'
            ? modal.event
            : { ...blank(), is_recurring: modal.recurring, event_date: modal.date ?? null }}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
          error={modalError}
          shiftTypes={shiftTypes}
        />
      )}
    </div>
  )
}
