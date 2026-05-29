'use client'

import { useState, useEffect, useRef } from 'react'
import { EventIcon, ICON_TYPES } from '@/components/EventIcon'

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
}

const DAYS = ['Thursday', 'Friday', 'Saturday', 'Sunday', 'Wednesday', 'Tuesday', 'Monday']
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

function sortChronologically(evs: ScheduleEvent[]): ScheduleEvent[] {
  return [...evs].sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99)
    if (dayDiff !== 0) return dayDiff
    return parseStartMinutes(a.time) - parseStartMinutes(b.time)
  })
}

// Normalise a single time token like "7", "7pm", "7:00pm", "19:00", "7:30 PM" → "7:00 PM"
function normaliseToken(t: string): string {
  t = t.trim()
  if (!t) return t
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!m) return t // unrecognised — leave as-is
  let h = parseInt(m[1], 10)
  const min = m[2] ?? '00'
  const meridiem = m[3]?.toLowerCase()
  if (meridiem === 'pm' && h < 12) h += 12
  if (meridiem === 'am' && h === 12) h = 0
  // If no meridiem provided, infer: treat < 7 as PM (camp context), ≥ 7 as AM/PM by value
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${min} ${period}`
}

// Normalise a full time string, handling ranges like "7 - 10pm" or "7:00PM – 10:00 PM"
function formatTime(raw: string): string {
  if (!raw.trim()) return raw
  // Split on en-dash, em-dash, or hyphen (with optional surrounding spaces)
  const parts = raw.split(/\s*[–—-]\s*/)
  if (parts.length === 2) {
    const [start, end] = parts.map(normaliseToken)
    return `${start} – ${end}`
  }
  return normaliseToken(raw)
}

const blank = (): Omit<ScheduleEvent, 'id' | 'sort_order'> => ({
  day: 'Thursday', time: '', title: '', subtitle: '', detail_desc: '',
  icon_type: 'star', visible: true, highlight: false, is_recurring: false, capacity: null, event_type: null,
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
}: {
  initial: Omit<ScheduleEvent, 'id' | 'sort_order'>
  onSave: (form: Omit<ScheduleEvent, 'id' | 'sort_order'>) => void
  onClose: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const [iconUploading, setIconUploading] = useState(false)
  const [iconError, setIconError] = useState<string | null>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)
  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }))

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIconUploading(true)
    setIconError(null)
    try {
      const fd = new FormData()
      fd.append('icon', file)
      const res = await fetch('/api/admin/schedule/icon', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set('icon_type', data.url)
    } catch (err: unknown) {
      setIconError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIconUploading(false)
      if (iconInputRef.current) iconInputRef.current.value = ''
    }
  }

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

        <div style={{ display: 'grid', gridTemplateColumns: form.is_recurring ? '1fr' : '1fr 1fr', gap: '0 1rem' }}>
          {!form.is_recurring && (
            <Field label="Day">
              <select style={inputStyle} value={form.day} onChange={(e) => set('day', e.target.value)}>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          )}
          <Field label="Time">
            <input style={inputStyle} value={form.time} placeholder="e.g. 7:00 PM – 10:00 PM" onChange={(e) => set('time', e.target.value)} />
          </Field>
        </div>

        {!form.is_recurring && (
          <Field label="Subtitle — shown in the At a Glance table">
            <textarea rows={2} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} value={form.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} placeholder="Short italic line under the event title in the schedule table" />
          </Field>
        )}

        <Field label={form.is_recurring ? 'Description' : 'Details — shown in the Event Details cards'}>
          <textarea rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} value={form.detail_desc ?? ''} onChange={(e) => set('detail_desc', e.target.value)} placeholder="Longer description" />
        </Field>

        <Field label="Icon">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {ICON_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('icon_type', t)}
                title={t}
                style={{
                  padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer',
                  border: form.icon_type === t ? '1px solid #C8A848' : '1px solid rgba(200,168,72,0.15)',
                  background: form.icon_type === t ? 'rgba(200,168,72,0.12)' : 'transparent',
                  color: form.icon_type === t ? '#C8A848' : 'rgba(200,168,72,0.4)',
                  transition: 'all 0.15s',
                }}
              >
                <EventIcon type={t} size={20} />
              </button>
            ))}

            {/* Custom uploaded icon — show preview if active */}
            {form.icon_type.startsWith('http') && (
              <button
                type="button"
                onClick={() => iconInputRef.current?.click()}
                title="Custom icon (click to replace)"
                style={{
                  padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer',
                  border: '1px solid #C8A848', background: 'rgba(200,168,72,0.12)',
                }}
              >
                <EventIcon type={form.icon_type} size={20} />
              </button>
            )}

            {/* Upload button */}
            <button
              type="button"
              onClick={() => iconInputRef.current?.click()}
              disabled={iconUploading}
              title="Upload custom icon"
              style={{
                width: '32px', height: '32px', borderRadius: '0.5rem', cursor: 'pointer',
                border: '1px dashed rgba(200,168,72,0.35)', background: 'transparent',
                color: '#C8A848', opacity: iconUploading ? 0.4 : 0.6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', lineHeight: 1, flexShrink: 0,
                transition: 'opacity 0.15s, border-color 0.15s',
              }}
            >
              {iconUploading ? '…' : '+'}
            </button>
            <input
              ref={iconInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleIconUpload}
              style={{ display: 'none' }}
            />
          </div>
          {iconError && <p style={{ color: '#ff8a8a', fontSize: '0.75rem', marginTop: '0.4rem' }}>{iconError}</p>}
        </Field>

        <Field label="Capacity (optional — leave blank for no signup)">
          <input
            style={{ ...inputStyle, width: '120px' }}
            type="number"
            min={1}
            placeholder="e.g. 20"
            value={form.capacity ?? ''}
            onChange={e => set('capacity', e.target.value === '' ? null : parseInt(e.target.value) || null)}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem', marginBottom: '1.25rem' }}>
          <Toggle checked={form.visible} onChange={(v) => set('visible', v)} label="Visible on site" />
          <Toggle checked={form.highlight} onChange={(v) => set('highlight', v)} label="Highlight day" />
          <Toggle checked={form.is_recurring} onChange={(v) => set('is_recurring', v)} label="Daily recurring" />
          <Field label="Event Type">
            <select
              style={{ ...inputStyle, fontSize: '0.82rem', cursor: 'pointer' }}
              value={form.event_type ?? ''}
              onChange={e => set('event_type', e.target.value || null)}
            >
              <option value="">General</option>
              <option value="all_hands">All Hands</option>
              <option value="camp_tending">Camp Tending</option>
              <option value="service">Service</option>
            </select>
          </Field>
        </div>

        {error && <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7 }}>
            Cancel
          </button>
          <button onClick={() => onSave(form)} disabled={saving || !form.title} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.05em', opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Saving…' : 'Save event'}
          </button>
        </div>
      </div>
    </>
  )
}

function EventRow({
  event,
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
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, flexShrink: 0 }}>{event.day}</span>
          )}
          {event.time && <span style={{ fontSize: '0.68rem', opacity: 0.45, flexShrink: 0 }}>{event.time}</span>}
        </div>
        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F3EDE6', margin: '0.15rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <button
          onClick={onToggleVisible}
          title={event.visible ? 'Hide' : 'Show'}
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
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ mode: 'add'; recurring: boolean } | { mode: 'edit'; event: ScheduleEvent } | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const draggedId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch('/api/admin/schedule')
    if (res.ok) {
      const json = await res.json()
      setEvents(sortChronologically(json.events))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const regular = events.filter((e) => !e.is_recurring)
  const recurring = events.filter((e) => e.is_recurring)

  const handleSave = async (form: Omit<ScheduleEvent, 'id' | 'sort_order'>) => {
    setSaving(true)
    setModalError(null)
    const normalised = { ...form, time: formatTime(form.time) }
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
        />
      )}
    </div>
  )
}
