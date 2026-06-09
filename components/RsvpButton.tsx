'use client'

import { useState, useEffect, useCallback } from 'react'

type RsvpResponse = { rsvped?: boolean; count?: number; error?: string }

export function RsvpButton({ eventId }: { eventId: string }) {
  const [rsvped, setRsvped] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/schedule/${eventId}/rsvp`, { cache: 'no-store' })
      const data: RsvpResponse = await res.json()
      if (res.ok) {
        setRsvped(!!data.rsvped)
        setCount(data.count ?? 0)
      }
    } catch {
      // Non-fatal — leave defaults.
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  const toggle = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    // Optimistic update
    const next = !rsvped
    setRsvped(next)
    setCount(c => Math.max(0, c + (next ? 1 : -1)))
    try {
      const res = await fetch(`/api/schedule/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvp: next }),
      })
      const data: RsvpResponse = await res.json()
      if (!res.ok) {
        // Roll back on failure
        setRsvped(!next)
        setCount(c => Math.max(0, c + (next ? -1 : 1)))
        setError(data.error ?? 'Could not save RSVP')
      } else {
        setRsvped(!!data.rsvped)
        setCount(data.count ?? 0)
      }
    } catch {
      setRsvped(!next)
      setCount(c => Math.max(0, c + (next ? -1 : 1)))
      setError('Could not save RSVP')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
      <button
        type="button"
        onClick={toggle}
        disabled={loading || saving}
        aria-pressed={rsvped}
        style={{
          padding: '0.45rem 1.1rem',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 700,
          cursor: loading || saving ? 'default' : 'pointer',
          border: rsvped ? '1px solid rgba(200,168,72,0.7)' : '1px solid rgba(200,168,72,0.35)',
          background: rsvped ? '#C8A848' : 'transparent',
          color: rsvped ? '#1A0A24' : '#C8A848',
          opacity: loading ? 0.5 : 1,
          transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        }}
      >
        {loading ? '…' : rsvped ? '✓ Going' : 'RSVP'}
      </button>
      <span style={{ fontSize: '0.62rem', letterSpacing: '0.04em', color: '#C8A848', opacity: 0.5 }}>
        {count === 0 ? 'Be the first to RSVP' : `${count} ${count === 1 ? 'person' : 'people'} going`}
      </span>
      {error && (
        <span role="alert" style={{ fontSize: '0.62rem', color: '#D239F8', opacity: 0.85 }}>{error}</span>
      )}
    </div>
  )
}
