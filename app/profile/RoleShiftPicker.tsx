'use client'

import { useState, useEffect } from 'react'

type Role = {
  id: string
  name: string
  description: string | null
  capacity: number
  signed_up: number
}

type Shift = {
  id: string
  label: string
  start_time: string
  end_time: string
  capacity: number
  signed_up: number
}

type Signup = {
  role_id: string | null
  shift_id: string | null
}

export function RoleShiftPicker() {
  const [roles, setRoles] = useState<Role[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [signup, setSignup] = useState<Signup | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedShift, setSelectedShift] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/signup')
      .then(r => r.json())
      .then(d => {
        setRoles(d.roles ?? [])
        setShifts(d.shifts ?? [])
        setSignup(d.signup)
        setSelectedRole(d.signup?.role_id ?? null)
        setSelectedShift(d.signup?.shift_id ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  const hasChanges = selectedRole !== (signup?.role_id ?? null) || selectedShift !== (signup?.shift_id ?? null)
  const canSave = selectedRole && selectedShift && hasChanges

  async function handleSave() {
    if (!selectedRole || !selectedShift) return
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: selectedRole, shift_id: selectedShift }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      setSaving(false)
      return
    }

    setSignup({ role_id: selectedRole, shift_id: selectedShift })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '1rem', background: 'rgba(255,255,255,0.02)' }}>
        <p style={{ opacity: 0.4, fontSize: '0.85rem', textAlign: 'center' }}>Loading…</p>
      </div>
    )
  }

  if (roles.length === 0 && shifts.length === 0) {
    return (
      <div style={{ padding: '2rem', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '1rem', background: 'rgba(255,255,255,0.02)' }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', marginBottom: '0.75rem' }}>
          Role & Shift Signup
        </p>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.8, opacity: 0.5, fontStyle: 'italic' }}>
          Role and shift options will be available closer to the event.
        </p>
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid rgba(200,168,72,0.18)', borderRadius: '1rem', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(200,168,72,0.1)' }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', margin: 0 }}>
          Role & Shift
        </p>
        {signup?.role_id && signup?.shift_id ? (
          <p style={{ fontSize: '0.8rem', opacity: 0.45, marginTop: '0.25rem' }}>You're signed up. You can change your selection below.</p>
        ) : (
          <p style={{ fontSize: '0.8rem', opacity: 0.45, marginTop: '0.25rem' }}>Choose one role and one shift.</p>
        )}
      </div>

      <div style={{ padding: '1.5rem 1.75rem' }}>

        {/* Roles */}
        {roles.length > 0 && (
          <div style={{ marginBottom: '1.75rem' }}>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, marginBottom: '0.85rem' }}>
              Choose a Role
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {roles.map(role => {
                const full = role.signed_up >= role.capacity && role.id !== signup?.role_id
                const selected = selectedRole === role.id
                return (
                  <button
                    key={role.id}
                    onClick={() => !full && setSelectedRole(role.id)}
                    disabled={full}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.85rem 1rem', borderRadius: '0.65rem', textAlign: 'left',
                      border: selected
                        ? '1px solid rgba(200,168,72,0.55)'
                        : '1px solid rgba(200,168,72,0.12)',
                      background: selected
                        ? 'rgba(200,168,72,0.08)'
                        : full ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                      cursor: full ? 'not-allowed' : 'pointer',
                      opacity: full ? 0.4 : 1,
                      transition: 'border-color 0.15s, background 0.15s',
                      width: '100%',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.88rem', color: '#F3EDE6', margin: 0 }}>{role.name}</p>
                      {role.description && (
                        <p style={{ fontSize: '0.77rem', opacity: 0.5, margin: '0.2rem 0 0', lineHeight: 1.5 }}>{role.description}</p>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: full ? '#ff8a8a' : '#C8A848', opacity: full ? 0.7 : 0.5, flexShrink: 0, marginLeft: '1rem' }}>
                      {full ? 'Full' : `${role.capacity - role.signed_up} open`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Shifts */}
        {shifts.length > 0 && (
          <div style={{ marginBottom: '1.75rem' }}>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, marginBottom: '0.85rem' }}>
              Choose a Shift
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {shifts.map(shift => {
                const full = shift.signed_up >= shift.capacity && shift.id !== signup?.shift_id
                const selected = selectedShift === shift.id
                return (
                  <button
                    key={shift.id}
                    onClick={() => !full && setSelectedShift(shift.id)}
                    disabled={full}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.85rem 1rem', borderRadius: '0.65rem', textAlign: 'left',
                      border: selected
                        ? '1px solid rgba(210,57,248,0.45)'
                        : '1px solid rgba(200,168,72,0.12)',
                      background: selected
                        ? 'rgba(210,57,248,0.07)'
                        : full ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                      cursor: full ? 'not-allowed' : 'pointer',
                      opacity: full ? 0.4 : 1,
                      transition: 'border-color 0.15s, background 0.15s',
                      width: '100%',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.88rem', color: '#F3EDE6', margin: 0 }}>{shift.label}</p>
                      <p style={{ fontSize: '0.77rem', opacity: 0.5, margin: '0.2rem 0 0' }}>
                        {shift.start_time} – {shift.end_time}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: full ? '#ff8a8a' : '#C8A848', opacity: full ? 0.7 : 0.5, flexShrink: 0, marginLeft: '1rem' }}>
                      {full ? 'Full' : `${shift.capacity - shift.signed_up} open`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            padding: '0.7rem 1.75rem', borderRadius: '9999px',
            border: `1px solid ${canSave ? 'rgba(200,168,72,0.5)' : 'rgba(200,168,72,0.15)'}`,
            background: 'transparent', color: '#FFFACD', cursor: canSave ? 'pointer' : 'not-allowed',
            fontSize: '0.82rem', letterSpacing: '0.05em',
            opacity: !canSave || saving ? 0.4 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : signup?.role_id ? 'Update signup' : 'Confirm signup'}
        </button>
      </div>
    </div>
  )
}
