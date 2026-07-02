'use client'

import { useState, useEffect, useRef } from 'react'
import { EventIcon } from '@/components/EventIcon'
import { AssetImagePicker } from './AssetImagePicker'
import { LoadError } from './LoadError'
import { isImageIcon } from '@/lib/icon-src'
import { formatTime } from '@/lib/time-format'
import { shiftDurationHours, formatShiftRange, weekdayFromISO } from '@/lib/shift-hours'

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
}

// Shift types offered when an event is a Shift (Configure → Shift Types registry).
type ShiftTypeOption = { id: string; name: string }

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

// Real dates order the list (undated events sink to the bottom); the day-name
// order is only a fallback between undated rows. Sorting by day-of-week used to
// hide wrong-week mistakes — a July 2 and a July 23 Wednesday sorted together.
function sortChronologically(evs: ScheduleEvent[]): ScheduleEvent[] {
  return [...evs].sort((a, b) => {
    if (a.event_date && b.event_date && a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
    if (a.event_date && !b.event_date) return -1
    if (!a.event_date && b.event_date) return 1
    const dayDiff = (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99)
    if (dayDiff !== 0) return dayDiff
    return parseStartMinutes(a.time) - parseStartMinutes(b.time)
  })
}

// "2026-07-22" → "Wed · Jul 22" for the admin list rows.
function rowDateLabel(ev: ScheduleEvent): string {
  if (ev.event_date) {
    const d = new Date(`${ev.event_date}T12:00:00`)
    if (!isNaN(d.getTime())) {
      return `${d.toLocaleDateString('en-US', { weekday: 'short' })} · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }
  }
  return ev.day
}

const blank = (): Omit<ScheduleEvent, 'id' | 'sort_order'> => ({
  day: '', time: '', title: '', subtitle: '', detail_desc: '',
  icon_type: 'star', visible: true, highlight: false, is_recurring: false, capacity: null, event_type: null, contribution_type: null, event_date: null, event_category: 'at_camp', participation_type: 'general', shift_type_id: null, requires_ack: false, start_time: null, end_time: null,
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

function EventRow({
  event,
  shiftTypeName,
  isDragOver,
  onEdit,
  onDelete,
  onToggleVisible,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  event: ScheduleEvent
  shiftTypeName?: string
  isDragOver: boolean
  onEdit: () => void
  onDelete: () => void
  onToggleVisible: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1rem', borderRadius: '0.65rem',
        border: isDragOver
          ? '1px solid rgba(200,168,72,0.5)'
          : '1px solid rgba(200,168,72,0.12)',
        background: isDragOver
          ? 'rgba(200,168,72,0.07)'
          : event.visible ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.005)',
        opacity: event.visible ? 1 : 0.5,
        cursor: 'grab',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* Drag handle */}
      <div style={{ color: '#C8A848', opacity: 0.25, flexShrink: 0, fontSize: '1rem', lineHeight: 1, userSelect: 'none' }}>
        ⠿
      </div>

      {/* Icon */}
      <div style={{ color: '#C8A848', opacity: 0.45, flexShrink: 0 }}>
        <EventIcon type={event.icon_type} size={18} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
          {!event.is_recurring && (
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, flexShrink: 0 }}>{rowDateLabel(event)}</span>
          )}
          {event.time && <span style={{ fontSize: '0.68rem', opacity: 0.45, flexShrink: 0 }}>{event.time}</span>}
        </div>
        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F3EDE6', margin: '0.15rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
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
  )
}

export function ScheduleManager() {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [modal, setModal] = useState<{ mode: 'add'; recurring: boolean } | { mode: 'edit'; event: ScheduleEvent } | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const draggedId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const load = async () => {
    setLoadError(false)
    try {
      const res = await fetch('/api/admin/schedule')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setEvents(sortChronologically(json.events))
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

  const regular = events.filter((e) => !e.is_recurring)
  const recurring = events.filter((e) => e.is_recurring)

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

const handleDrop = async (group: ScheduleEvent[], targetId: string) => {
    const fromId = draggedId.current
    if (!fromId || fromId === targetId) return
    setDragOverId(null)
    draggedId.current = null

    const fromIdx = group.findIndex((e) => e.id === fromId)
    const toIdx = group.findIndex((e) => e.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return

    // Reorder locally immediately
    const reordered = [...group]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)

    // Update all sort_orders to match new positions
    const otherGroup = group === regular ? recurring : regular
    const newEvents = [...otherGroup, ...reordered].sort((a, b) =>
      (otherGroup.includes(a) ? 0 : 1) - (otherGroup.includes(b) ? 0 : 1)
    )
    setEvents([...events.filter((e) => e.is_recurring !== group[0]?.is_recurring), ...reordered])

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

  const addBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.5rem 1rem', borderRadius: '9999px',
    border: '1px solid rgba(200,168,72,0.25)', background: 'transparent',
    color: '#C8A848', cursor: 'pointer', fontSize: '0.78rem',
    letterSpacing: '0.06em', opacity: 0.75,
  }

  if (loading) return <p style={{ opacity: 0.4, fontStyle: 'italic', fontSize: '0.875rem' }}>Loading…</p>
  if (loadError) return <LoadError onRetry={() => { setLoading(true); load() }} />

  return (
    <div>
      {/* Regular events */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, margin: 0 }}>
            Scheduled Events — {regular.length}
          </p>
          <button style={addBtnStyle} onClick={() => { setModal({ mode: 'add', recurring: false }); setModalError(null) }}>
            + Add event
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {regular.length === 0 && <p style={{ opacity: 0.35, fontStyle: 'italic', fontSize: '0.82rem' }}>No events yet.</p>}
          {regular.map((ev) => (
            <EventRow
              key={ev.id} event={ev}
              shiftTypeName={shiftTypes.find(t => t.id === ev.shift_type_id)?.name}
              isDragOver={dragOverId === ev.id}
              onEdit={() => { setModal({ mode: 'edit', event: ev }); setModalError(null) }}
              onDelete={() => handleDelete(ev.id)}
              onToggleVisible={() => handleToggleVisible(ev)}
              onDragStart={() => { draggedId.current = ev.id }}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(ev.id) }}
              onDrop={() => handleDrop(regular, ev.id)}
              onDragEnd={() => { draggedId.current = null; setDragOverId(null) }}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.15), transparent)', margin: '0 0 2rem' }} />

      {/* Recurring events */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.55, margin: 0 }}>
            Daily Recurring — {recurring.length}
          </p>
          <button style={{ ...addBtnStyle, borderColor: 'rgba(210,57,248,0.25)', color: '#D239F8' }} onClick={() => { setModal({ mode: 'add', recurring: true }); setModalError(null) }}>
            + Add recurring
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {recurring.length === 0 && <p style={{ opacity: 0.35, fontStyle: 'italic', fontSize: '0.82rem' }}>No recurring events yet.</p>}
          {recurring.map((ev) => (
            <EventRow
              key={ev.id} event={ev}
              shiftTypeName={shiftTypes.find(t => t.id === ev.shift_type_id)?.name}
              isDragOver={dragOverId === ev.id}
              onEdit={() => { setModal({ mode: 'edit', event: ev }); setModalError(null) }}
              onDelete={() => handleDelete(ev.id)}
              onToggleVisible={() => handleToggleVisible(ev)}
              onDragStart={() => { draggedId.current = ev.id }}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(ev.id) }}
              onDrop={() => handleDrop(recurring, ev.id)}
              onDragEnd={() => { draggedId.current = null; setDragOverId(null) }}
            />
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <EventModal
          initial={modal.mode === 'edit' ? modal.event : { ...blank(), is_recurring: modal.recurring }}
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
