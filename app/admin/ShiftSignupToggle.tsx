'use client'

import { useState } from 'react'

export function ShiftSignupToggle({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    const next = !open
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/page-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_shift_signup_open: String(next) }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to save')
      } else {
        setOpen(next)
      }
    } catch {
      setError('Network error')
    }
    setSaving(false)
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: '0.65rem',
        border: `1px solid ${open ? 'rgba(200,168,72,0.3)' : 'rgba(255,80,80,0.3)'}`,
        background: open ? 'rgba(200,168,72,0.05)' : 'rgba(255,80,80,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem',
      }}>
        <div>
          <p style={{ margin: '0 0 0.15rem', fontSize: '0.88rem', fontWeight: 600, color: open ? '#C8A848' : '#ff8080' }}>
            Shift signup {open ? 'open' : 'closed'}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.5 }}>
            {open
              ? 'Members can choose and change their shifts.'
              : 'The shift picker is hidden from members until times are confirmed. Existing shifts can still be cancelled.'}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          aria-pressed={open}
          style={{
            width: '40px', height: '22px', borderRadius: '9999px', flexShrink: 0,
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            background: open ? '#C8A848' : 'rgba(255,80,80,0.6)',
            transition: 'background 0.2s', position: 'relative', opacity: saving ? 0.5 : 1,
          }}
        >
          <div style={{
            position: 'absolute', top: '3px', left: open ? '21px' : '3px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: '#1A0A24', transition: 'left 0.2s',
          }} />
        </button>
      </div>
      {error && <p style={{ fontSize: '0.78rem', color: '#ff8a8a', margin: '0.5rem 0 0' }}>{error}</p>}
    </div>
  )
}
