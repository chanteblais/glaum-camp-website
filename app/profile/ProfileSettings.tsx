'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ATTENDANCE_OPTIONS,
  CAMP_RELATIONSHIP_OPTIONS,
  CONTRIBUTION_OPTIONS,
  RIDESHARE_OPTIONS,
} from '@/lib/application-options'

type ApplicationData = {
  id: string
  status: string
  preferred_name?: string | null
  pronouns?: string | null
  phone?: string | null
  instagram?: string | null
  location?: string | null
  attendance?: string | null
  arrival_date?: string | null
  departure_date?: string | null
  camp_relationship?: string | null
  vehicle?: string | null
  space_requirements?: string | null
  structures?: string | null
  rideshare?: string | null
  contributions?: string[] | null
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(200,168,72,0.25)',
  borderRadius: '0.5rem',
  padding: '0.75rem 1rem',
  color: '#F3EDE6',
  fontSize: '0.9rem',
  fontFamily: 'var(--font-libre-baskerville), Georgia, serif',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  color: '#C8A848',
  marginBottom: '0.45rem',
  textTransform: 'uppercase',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export function ProfileSettings({ application }: { application: ApplicationData }) {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [view, setView] = useState<'menu' | 'edit' | 'cancel' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const [form, setForm] = useState({
    preferred_name: application.preferred_name ?? '',
    pronouns: application.pronouns ?? '',
    phone: application.phone ?? '',
    instagram: application.instagram ?? '',
    location: application.location ?? '',
    attendance: application.attendance ?? '',
    arrival_date: application.arrival_date ?? '',
    departure_date: application.departure_date ?? '',
    camp_relationship: application.camp_relationship ?? '',
    vehicle: application.vehicle ?? '',
    space_requirements: application.space_requirements ?? '',
    structures: application.structures ?? '',
    rideshare: application.rideshare ?? '',
    contributions: application.contributions ?? [],
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        if (view === 'menu') setView(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [view])

  const closeAll = () => {
    setMenuOpen(false)
    setView(null)
    setError(null)
    setSuccess(null)
  }

  const openPanel = (next: 'edit' | 'cancel') => {
    setMenuOpen(false)
    setView(next)
    setError(null)
    setSuccess(null)
  }

  const toggleContribution = (option: string) => {
    setForm((prev) => ({
      ...prev,
      contributions: prev.contributions.includes(option)
        ? prev.contributions.filter((c) => c !== option)
        : [...prev.contributions, option],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/profile/application', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save changes')

      setSuccess('Your profile has been updated.')
      router.refresh()
      setTimeout(() => closeAll(), 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/profile/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel attendance')

      router.refresh()
      closeAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const canEdit = application.status === 'approved' || application.status === 'pending'

  if (!canEdit) return null

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Profile settings"
        aria-expanded={menuOpen || view !== null}
        onClick={() => {
          if (view && view !== 'menu') {
            setView('menu')
            setMenuOpen(true)
            return
          }
          setMenuOpen((open) => !open)
          setView((v) => (v ? null : 'menu'))
        }}
        style={{
          width: '2.25rem',
          height: '2.25rem',
          borderRadius: '9999px',
          border: '1px solid rgba(200,168,72,0.35)',
          background: 'rgba(255,255,255,0.04)',
          color: '#C8A848',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {menuOpen && view === 'menu' && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            minWidth: '12rem',
            border: '1px solid rgba(200,168,72,0.25)',
            borderRadius: '0.75rem',
            background: '#1A0A24',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            overflow: 'hidden',
            zIndex: 20,
          }}
        >
          <button
            type="button"
            onClick={() => openPanel('edit')}
            style={menuItemStyle}
          >
            Edit profile
          </button>
          <button
            type="button"
            onClick={() => openPanel('cancel')}
            style={{ ...menuItemStyle, color: '#ff8a8a', borderTop: '1px solid rgba(200,168,72,0.12)' }}
          >
            Cancel attendance
          </button>
        </div>
      )}

      {view === 'edit' && (
        <Panel title="Edit profile" onClose={closeAll}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <Field label="Preferred name">
              <input
                style={inputStyle}
                value={form.preferred_name}
                onChange={(e) => setForm({ ...form, preferred_name: e.target.value })}
              />
            </Field>
            <Field label="Pronouns">
              <input
                style={inputStyle}
                value={form.pronouns}
                onChange={(e) => setForm({ ...form, pronouns: e.target.value })}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <Field label="Phone">
              <input
                style={inputStyle}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Instagram">
              <input
                style={inputStyle}
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Traveling from">
            <input
              style={inputStyle}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>

          <Field label="Attendance">
            <select
              style={inputStyle}
              value={form.attendance}
              onChange={(e) => setForm({ ...form, attendance: e.target.value })}
            >
              <option value="">Select…</option>
              {ATTENDANCE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <Field label="Arrival">
              <input
                style={inputStyle}
                value={form.arrival_date}
                onChange={(e) => setForm({ ...form, arrival_date: e.target.value })}
              />
            </Field>
            <Field label="Departure">
              <input
                style={inputStyle}
                value={form.departure_date}
                onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Camp relationship">
            <select
              style={inputStyle}
              value={form.camp_relationship}
              onChange={(e) => setForm({ ...form, camp_relationship: e.target.value })}
            >
              <option value="">Select…</option>
              {CAMP_RELATIONSHIP_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>

          <Field label="Vehicle">
            <input
              style={inputStyle}
              value={form.vehicle}
              onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
            />
          </Field>

          <Field label="Space requirements">
            <input
              style={inputStyle}
              value={form.space_requirements}
              onChange={(e) => setForm({ ...form, space_requirements: e.target.value })}
            />
          </Field>

          <Field label="Structures">
            <input
              style={inputStyle}
              value={form.structures}
              onChange={(e) => setForm({ ...form, structures: e.target.value })}
            />
          </Field>

          <Field label="Rideshare">
            <select
              style={inputStyle}
              value={form.rideshare}
              onChange={(e) => setForm({ ...form, rideshare: e.target.value })}
            >
              <option value="">Select…</option>
              {RIDESHARE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>

          <Field label="Contributions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '10rem', overflowY: 'auto' }}>
              {CONTRIBUTION_OPTIONS.map((option) => (
                <label
                  key={option}
                  style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={form.contributions.includes(option)}
                    onChange={() => toggleContribution(option)}
                    style={{ marginTop: '0.15rem', accentColor: '#D239F8' }}
                  />
                  {option}
                </label>
              ))}
            </div>
          </Field>

          {error && <p style={{ color: '#ff8a8a', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}
          {success && <p style={{ color: '#8fd48f', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{success}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeAll} style={secondaryBtnStyle}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Panel>
      )}

      {view === 'cancel' && (
        <Panel title="Cancel attendance" onClose={closeAll}>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.7, marginBottom: '1.25rem' }}>
            We're sorry to see you go. Please share why you're cancelling so the camp can plan accordingly.
          </p>
          <Field label="Reason (required)">
            <textarea
              rows={5}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Tell us what's changed…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </Field>
          {error && <p style={{ color: '#ff8a8a', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeAll} style={secondaryBtnStyle}>Keep my spot</button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving || cancelReason.trim().length < 10}
              style={{ ...primaryBtnStyle, borderColor: 'rgba(255,120,120,0.5)', color: '#ffb4b4' }}
            >
              {saving ? 'Cancelling…' : 'Confirm cancellation'}
            </button>
          </div>
        </Panel>
      )}
    </div>
  )
}

function Panel({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 30,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(92vw, 640px)',
          maxHeight: '85vh',
          overflowY: 'auto',
          border: '1px solid rgba(200,168,72,0.25)',
          borderRadius: '1rem',
          background: '#1A0A24',
          padding: '1.5rem',
          zIndex: 40,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.25rem', color: '#C8A848', margin: 0 }}>
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={closeBtnStyle}>×</button>
        </div>
        {children}
      </div>
    </>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.85rem 1rem',
  border: 'none',
  background: 'transparent',
  color: '#F3EDE6',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: '0.85rem',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '0.65rem 1.25rem',
  borderRadius: '9999px',
  border: '1px solid rgba(200,168,72,0.45)',
  background: 'transparent',
  color: '#FFFACD',
  cursor: 'pointer',
  fontSize: '0.82rem',
  letterSpacing: '0.06em',
}

const secondaryBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  borderColor: 'rgba(200,168,72,0.2)',
  color: '#F3EDE6',
  opacity: 0.75,
}

const closeBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#C8A848',
  fontSize: '1.5rem',
  lineHeight: 1,
  cursor: 'pointer',
  opacity: 0.7,
}
