'use client'

import { useState, useEffect } from 'react'

// The 4 shift days — used to populate the date picker quickly
const SHIFT_DAYS = [
  { label: 'Thursday, July 23', value: '2026-07-23' },
  { label: 'Friday, July 24',   value: '2026-07-24' },
  { label: 'Saturday, July 25', value: '2026-07-25' },
  { label: 'Sunday, July 26',   value: '2026-07-26' },
]

type Shift = {
  id: string
  label: string
  date: string | null
  start_time: string
  end_time: string
  capacity: number
  sort_order: number
}

type ShiftForm = Omit<Shift, 'id' | 'sort_order'>

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

function blankShift(): ShiftForm {
  return { label: '', date: null, start_time: '', end_time: '', capacity: 1 }
}

function formatDate(date: string | null) {
  if (!date) return null
  const found = SHIFT_DAYS.find(d => d.value === date)
  return found?.label ?? date
}

function ShiftModal({
  initial, onSave, onClose, saving, error,
}: {
  initial: ShiftForm
  onSave: (form: ShiftForm) => void
  onClose: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof ShiftForm, v: string | number | null) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 51, background: '#1a1410', border: '1px solid rgba(200,168,72,0.25)',
        borderRadius: '1rem', padding: '2rem', width: '90%', maxWidth: '500px',
      }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', marginBottom: '1.5rem' }}>
          {initial.label ? 'Edit Shift' : 'New Shift'}
        </p>

        <Field label="Label">
          <input style={inputStyle} value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. Morning Shift" />
        </Field>

        <Field label="Day">
          <select
            style={{ ...inputStyle, appearance: 'none' as const }}
            value={form.date ?? ''}
            onChange={e => set('date', e.target.value || null)}
          >
            <option value="">— select a day —</option>
            {SHIFT_DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Start Time">
            <input style={inputStyle} value={form.start_time} onChange={e => set('start_time', e.target.value)} placeholder="e.g. 9:00 AM" />
          </Field>
          <Field label="End Time">
            <input style={inputStyle} value={form.end_time} onChange={e => set('end_time', e.target.value)} placeholder="e.g. 12:00 PM" />
          </Field>
        </div>

        <Field label="Capacity (max campers)">
          <input style={inputStyle} type="number" min={1} value={form.capacity} onChange={e => set('capacity', parseInt(e.target.value) || 1)} />
        </Field>

        {error && <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7 }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.label || !form.start_time || !form.end_time}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.05em', opacity: saving || !form.label ? 0.4 : 1 }}
          >
            {saving ? 'Saving…' : 'Save shift'}
          </button>
        </div>
      </div>
    </>
  )
}

export function ShiftsManager() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Shift | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/shifts')
      .then(r => r.json())
      .then(d => setShifts(d.shifts ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(form: ShiftForm) {
    setSaving(true); setError(null)
    const res = await fetch('/api/admin/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sort_order: shifts.length }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setShifts(prev => [...prev, data.shift])
    setCreating(false); setSaving(false)
  }

  async function handleUpdate(shift: Shift, form: ShiftForm) {
    setSaving(true); setError(null)
    const res = await fetch(`/api/admin/shifts/${shift.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setShifts(prev => prev.map(s => s.id === shift.id ? { ...s, ...data.shift } : s))
    setEditing(null); setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this shift? Any campers signed up for it will lose their shift assignment.')) return
    const res = await fetch(`/api/admin/shifts/${id}`, { method: 'DELETE' })
    if (res.ok) setShifts(prev => prev.filter(s => s.id !== id))
  }

  // Group by date for display
  const byDate = SHIFT_DAYS.map(day => ({
    ...day,
    shifts: shifts.filter(s => s.date === day.value),
  })).filter(d => d.shifts.length > 0)

  const undated = shifts.filter(s => !s.date)

  if (loading) return <p style={{ opacity: 0.4, fontSize: '0.85rem' }}>Loading…</p>

  return (
    <div>
      {shifts.length === 0 && (
        <p style={{ opacity: 0.4, fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '1.5rem' }}>No shifts yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {byDate.map(day => (
          <div key={day.value}>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, marginBottom: '0.5rem' }}>{day.label}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {day.shifts.map(shift => (
                <ShiftRow key={shift.id} shift={shift} onEdit={() => { setEditing(shift); setError(null) }} onDelete={() => handleDelete(shift.id)} />
              ))}
            </div>
          </div>
        ))}
        {undated.length > 0 && (
          <div>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.4, marginBottom: '0.5rem' }}>No date set</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {undated.map(shift => (
                <ShiftRow key={shift.id} shift={shift} onEdit={() => { setEditing(shift); setError(null) }} onDelete={() => handleDelete(shift.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => { setCreating(true); setError(null) }}
        style={{ padding: '0.6rem 1.4rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.3)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.05em' }}
      >
        + Add shift
      </button>

      {creating && <ShiftModal initial={blankShift()} onSave={handleCreate} onClose={() => setCreating(false)} saving={saving} error={error} />}
      {editing && (
        <ShiftModal
          initial={{ label: editing.label, date: editing.date, start_time: editing.start_time, end_time: editing.end_time, capacity: editing.capacity }}
          onSave={(form) => handleUpdate(editing, form)}
          onClose={() => setEditing(null)}
          saving={saving}
          error={error}
        />
      )}
    </div>
  )
}

function ShiftRow({ shift, onEdit, onDelete }: { shift: Shift; onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.65rem', border: '1px solid rgba(200,168,72,0.12)', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.9rem', color: '#F3EDE6', margin: 0 }}>{shift.label}</p>
        <p style={{ fontSize: '0.78rem', opacity: 0.45, margin: '0.2rem 0 0' }}>{shift.start_time} – {shift.end_time}</p>
      </div>
      <span style={{ fontSize: '0.75rem', color: '#C8A848', opacity: 0.6, flexShrink: 0 }}>cap. {shift.capacity}</span>
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <button onClick={onEdit} style={{ background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.7 }}>Edit</button>
        <button onClick={onDelete} style={{ background: 'none', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '0.4rem', color: '#ff8a8a', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.7 }}>Del</button>
      </div>
    </div>
  )
}
