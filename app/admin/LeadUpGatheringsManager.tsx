'use client'

import { useState, useEffect, useRef } from 'react'
import { normaliseToken } from '@/lib/time-format'

type LeadUpEvent = {
  id: string
  title: string
  description: string | null
  event_date: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  link: string | null
  host: string | null
  image_url: string | null
  visible: boolean
  sort_order: number
  notified_at: string | null
  rsvp_count?: number
}

type Draft = Omit<LeadUpEvent, 'id' | 'sort_order' | 'rsvp_count' | 'notified_at'>

const blank = (): Draft => ({
  title: '', description: '', event_date: null, start_time: '', end_time: '',
  location: '', link: '', host: '', image_url: null, visible: true,
})

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,168,72,0.2)',
  borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#F3EDE6', fontSize: '0.875rem',
  fontFamily: 'var(--font-libre-baskerville), Georgia, serif', outline: 'none', boxSizing: 'border-box',
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

// "2026-07-08" → "Tue, Jul 8"
function formatDate(d: string | null): string {
  if (!d) return 'Date TBD'
  const dt = new Date(d + 'T00:00:00')
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function GatheringModal({ initial, isCreate, onSave, onClose, saving, error }: {
  initial: Draft
  isCreate: boolean
  onSave: (form: Draft, notify: boolean) => void
  onClose: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const [notify, setNotify] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const set = (k: keyof Draft, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    setImageError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/admin/lead-up-events/image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set('image_url', data.url)
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setImageUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const handleImageRemove = () => {
    const url = form.image_url
    set('image_url', null)
    // Best-effort storage cleanup; the field is already cleared regardless.
    if (url) {
      fetch('/api/admin/lead-up-events/image', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }),
      }).catch(() => {})
    }
  }

  // A time field is invalid only when it's non-empty and unparseable.
  const startInvalid = !!form.start_time?.trim() && normaliseToken(form.start_time) === null
  const endInvalid = !!form.end_time?.trim() && normaliseToken(form.end_time) === null

  // On blur, snap a valid entry to canonical form ("7pm" → "7:00 PM").
  const normaliseField = (k: 'start_time' | 'end_time') => {
    const v = form[k]
    if (!v?.trim()) return
    const n = normaliseToken(v)
    if (n) set(k, n)
  }

  const timeInputStyle = (invalid: boolean): React.CSSProperties =>
    invalid ? { ...inputStyle, borderColor: 'rgba(255,120,120,0.6)' } : inputStyle

  const handleSubmit = () => {
    // Saves are gated on validity, so normaliseToken returns a value here.
    // A hidden gathering can't be notified, so only fan out when it's visible.
    onSave({
      ...form,
      start_time: form.start_time?.trim() ? (normaliseToken(form.start_time) ?? form.start_time) : form.start_time,
      end_time: form.end_time?.trim() ? (normaliseToken(form.end_time) ?? form.end_time) : form.end_time,
    }, notify && form.visible)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(95vw, 560px)', maxHeight: '88vh', overflowY: 'auto',
        background: '#1A0A24', border: '1px solid rgba(200,168,72,0.25)',
        borderRadius: '1rem', padding: '1.5rem', zIndex: 50,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.15rem', color: '#C8A848', margin: 0 }}>
            {initial.title ? 'Edit gathering' : 'New lead-up gathering'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#C8A848', fontSize: '1.4rem', cursor: 'pointer', opacity: 0.7 }}>×</button>
        </div>

        <Field label="Title">
          <input style={inputStyle} value={form.title} placeholder="e.g. Decor brainstorm" onChange={e => set('title', e.target.value)} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 1rem' }}>
          <Field label="Date">
            <input style={inputStyle} type="date" value={form.event_date ?? ''} onChange={e => set('event_date', e.target.value || null)} />
          </Field>
          <Field label="Start">
            <input style={timeInputStyle(startInvalid)} value={form.start_time ?? ''} placeholder="7:00 PM" onChange={e => set('start_time', e.target.value)} onBlur={() => normaliseField('start_time')} />
          </Field>
          <Field label="End">
            <input style={timeInputStyle(endInvalid)} value={form.end_time ?? ''} placeholder="optional" onChange={e => set('end_time', e.target.value)} onBlur={() => normaliseField('end_time')} />
          </Field>
        </div>
        {(startInvalid || endInvalid) && (
          <p style={{ color: '#ff8a8a', fontSize: '0.72rem', margin: '-0.5rem 0 1rem' }}>
            Enter a time like “7:00 PM”, “7pm”, “noon”, or “19:00”.
          </p>
        )}

        <Field label="Description">
          <textarea rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} value={form.description ?? ''} placeholder="What's this session for?" onChange={e => set('description', e.target.value)} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
          <Field label="Location (optional)">
            <input style={inputStyle} value={form.location ?? ''} placeholder="Physical place" onChange={e => set('location', e.target.value)} />
          </Field>
          <Field label="Link (optional)">
            <input style={inputStyle} value={form.link ?? ''} placeholder="Zoom / Meet URL" onChange={e => set('link', e.target.value)} />
          </Field>
        </div>

        <Field label="Host (optional)">
          <input style={inputStyle} value={form.host ?? ''} placeholder="Who's running it" onChange={e => set('host', e.target.value)} />
        </Field>

        <Field label="Image (optional)">
          {form.image_url ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url} alt="" style={{ width: '88px', height: '64px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid rgba(200,168,72,0.25)' }} />
              <button type="button" onClick={handleImageRemove} style={{ background: 'none', border: '1px solid rgba(255,100,100,0.3)', borderRadius: '0.4rem', color: '#ff8a8a', cursor: 'pointer', padding: '0.3rem 0.7rem', fontSize: '0.72rem', opacity: 0.7 }}>
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={imageUploading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(200,168,72,0.08)', border: '1px dashed rgba(200,168,72,0.35)', borderRadius: '0.5rem', color: '#C8A848', cursor: 'pointer', padding: '0.5rem 0.9rem', fontSize: '0.78rem', opacity: imageUploading ? 0.5 : 0.85 }}
            >
              {imageUploading ? 'Uploading…' : '＋ Upload image'}
            </button>
          )}
          <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} style={{ display: 'none' }} />
          {imageError && <p style={{ color: '#ff8a8a', fontSize: '0.72rem', marginTop: '0.4rem' }}>{imageError}</p>}
        </Field>

        <div style={{ marginBottom: isCreate ? '0.75rem' : '1.25rem' }}>
          <Toggle checked={form.visible} onChange={v => set('visible', v)} label="Visible to members" />
        </div>

        {isCreate && (
          <div style={{ marginBottom: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(200,168,72,0.1)' }}>
            {form.visible ? (
              <Toggle checked={notify} onChange={setNotify} label="Notify members on save (bell + email)" />
            ) : (
              <p style={{ fontSize: '0.76rem', opacity: 0.4, margin: 0 }}>Turn on “Visible to members” to alert members on save.</p>
            )}
          </div>
        )}

        {error && <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7 }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !form.title || startInvalid || endInvalid} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.05em', opacity: saving || !form.title || startInvalid || endInvalid ? 0.5 : 1 }}>
            {saving ? 'Saving…' : 'Save gathering'}
          </button>
        </div>
      </div>
    </>
  )
}

export function LeadUpGatheringsManager() {
  const [events, setEvents] = useState<LeadUpEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; event: LeadUpEvent } | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [notifyResult, setNotifyResult] = useState<{ id: string; text: string } | null>(null)

  const load = async () => {
    const res = await fetch('/api/admin/lead-up-events')
    if (res.ok) {
      const json = await res.json()
      setEvents(json.events)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form: Draft, notify = false) => {
    setSaving(true)
    setModalError(null)
    try {
      let res: Response
      if (modal?.mode === 'edit') {
        res = await fetch(`/api/admin/lead-up-events/${modal.event.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
      } else {
        res = await fetch('/api/admin/lead-up-events', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
      }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }

      // New gatherings can fan out the alert immediately if requested.
      if (modal?.mode === 'add' && notify) {
        const created = (await res.json()).event
        if (created?.id) {
          const nres = await fetch(`/api/admin/lead-up-events/${created.id}/notify`, { method: 'POST' })
          const ndata = await nres.json().catch(() => ({}))
          setNotifyResult({
            id: created.id,
            text: nres.ok ? `Notified ${ndata.notified} · emailed ${ndata.emailed}` : (ndata.error || 'Saved, but notify failed'),
          })
        }
      }

      await load()
      setModal(null)
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this gathering? Its RSVPs will be removed too.')) return
    await fetch(`/api/admin/lead-up-events/${id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const handleNotify = async (event: LeadUpEvent) => {
    if (!event.visible) { alert('Make the gathering visible before notifying members.'); return }
    const already = !!event.notified_at
    if (!confirm(already
      ? `Re-send the alert for “${event.title}” to all members? They'll get another bell notification and email.`
      : `Alert all members about “${event.title}”? They'll get a bell notification and an email (members who turned off announcement emails won't be emailed).`)) return

    setNotifyingId(event.id)
    setNotifyResult(null)
    try {
      const res = await fetch(`/api/admin/lead-up-events/${event.id}/notify`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, notified_at: data.notified_at } : e))
      setNotifyResult({ id: event.id, text: `Notified ${data.notified} · emailed ${data.emailed}` })
    } catch (e: unknown) {
      setNotifyResult({ id: event.id, text: e instanceof Error ? e.message : 'Failed to notify' })
    } finally {
      setNotifyingId(null)
    }
  }

  const handleToggleVisible = async (event: LeadUpEvent) => {
    await fetch(`/api/admin/lead-up-events/${event.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !event.visible }),
    })
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, visible: !e.visible } : e))
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, margin: 0 }}>
          Lead-Up Gatherings — {events.length}
        </p>
        <button style={addBtnStyle} onClick={() => { setModal({ mode: 'add' }); setModalError(null) }}>
          + Add gathering
        </button>
      </div>

      <p style={{ fontSize: '0.78rem', opacity: 0.45, lineHeight: 1.6, margin: '0 0 1rem' }}>
        Planning &amp; brainstorming sessions on the runway to the event. Members RSVP per session — these are separate from the at-camp schedule and never affect shifts or attunement.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {events.length === 0 && <p style={{ opacity: 0.35, fontStyle: 'italic', fontSize: '0.82rem' }}>No gatherings yet.</p>}
        {events.map(ev => (
          <div
            key={ev.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: '0.65rem',
              border: '1px solid rgba(200,168,72,0.12)',
              background: ev.visible ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.005)',
              opacity: ev.visible ? 1 : 0.5,
            }}
          >
            <div style={{
              flexShrink: 0, width: '70px', textAlign: 'center',
              padding: '0.35rem 0.4rem', border: '1px solid rgba(200,168,72,0.2)',
              borderRadius: '0.5rem', background: 'rgba(200,168,72,0.06)',
            }}>
              <p style={{ fontSize: '0.62rem', color: '#C8A848', margin: 0, letterSpacing: '0.03em' }}>{formatDate(ev.event_date)}</p>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F3EDE6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
              <p style={{ fontSize: '0.7rem', opacity: 0.45, margin: '0.15rem 0 0' }}>
                {[ev.start_time, ev.location || (ev.link ? 'Online' : null), ev.host].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>

            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', minWidth: '64px' }}>
              <span title="RSVPs" style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.7, border: '1px solid rgba(200,168,72,0.2)', borderRadius: '9999px', padding: '0.15rem 0.55rem' }}>
                {ev.rsvp_count ?? 0} going
              </span>
              {notifyResult?.id === ev.id ? (
                <span style={{ fontSize: '0.62rem', opacity: 0.55, textAlign: 'right' }}>{notifyResult.text}</span>
              ) : ev.notified_at ? (
                <span style={{ fontSize: '0.62rem', opacity: 0.4, textAlign: 'right' }}>Notified {new Date(ev.notified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              <button
                onClick={() => handleNotify(ev)}
                disabled={notifyingId === ev.id}
                title={ev.notified_at ? 'Re-send alert to members' : 'Alert all members (bell + email)'}
                style={{
                  background: ev.notified_at ? 'none' : 'rgba(200,168,72,0.1)',
                  border: '1px solid rgba(200,168,72,0.3)', borderRadius: '0.4rem',
                  color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.55rem',
                  fontSize: '0.7rem', opacity: notifyingId === ev.id ? 0.4 : ev.notified_at ? 0.55 : 0.9, whiteSpace: 'nowrap',
                }}
              >
                {notifyingId === ev.id ? 'Sending…' : ev.notified_at ? '↻ Notify' : '🔔 Notify'}
              </button>
              <button onClick={() => handleToggleVisible(ev)} title={ev.visible ? 'Hide' : 'Show'} style={{ background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.6 }}>
                {ev.visible ? '●' : '○'}
              </button>
              <button onClick={() => { setModal({ mode: 'edit', event: ev }); setModalError(null) }} style={{ background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.6 }}>
                Edit
              </button>
              <button onClick={() => handleDelete(ev.id)} style={{ background: 'none', border: '1px solid rgba(255,100,100,0.2)', borderRadius: '0.4rem', color: '#ff8a8a', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.5 }}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <GatheringModal
          initial={modal.mode === 'edit'
            ? { title: modal.event.title, description: modal.event.description, event_date: modal.event.event_date, start_time: modal.event.start_time, end_time: modal.event.end_time, location: modal.event.location, link: modal.event.link, host: modal.event.host, image_url: modal.event.image_url, visible: modal.event.visible }
            : blank()}
          isCreate={modal.mode === 'add'}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
          error={modalError}
        />
      )}
    </div>
  )
}
