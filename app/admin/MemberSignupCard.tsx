'use client'

import { useState } from 'react'

type Props = {
  clerkUserId: string
  role: { name: string; department: string | null; department_icon: string | null; commitment: string | null; approval_status: string | null } | null
  shift: { title: string; time: string | null; day: string } | null
}

export function MemberSignupCard({ clerkUserId, role, shift }: Props) {
  const [currentRole, setCurrentRole] = useState(role)
  const [currentShift, setCurrentShift] = useState(shift)
  const [clearing, setClearing] = useState<'role' | 'shift' | null>(null)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setApproving(true)
    setError(null)
    const res = await fetch(`/api/admin/role-requests/${clerkUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved' }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Something went wrong')
    } else {
      setCurrentRole(prev => prev ? { ...prev, approval_status: 'approved' } : prev)
    }
    setApproving(false)
  }

  async function handleClear(type: 'role' | 'shift') {
    if (!confirm(`Remove this member's ${type}? They will be notified to choose a new one.`)) return
    setClearing(type)
    setError(null)
    const res = await fetch(`/api/admin/signups/${clerkUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(type === 'role' ? { clear_role: true } : { clear_shift: true }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Something went wrong')
    } else {
      if (type === 'role') setCurrentRole(null)
      if (type === 'shift') setCurrentShift(null)
    }
    setClearing(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Role card */}
      <div style={{
        padding: '1rem 1.25rem',
        border: '1px solid rgba(200,168,72,0.15)',
        borderRadius: '0.75rem',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, margin: '0 0 0.3rem' }}>Role</p>
          {currentRole ? (
            <>
              {currentRole.department && (
                <p style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.5, margin: '0 0 0.15rem' }}>
                  {currentRole.department_icon && `${currentRole.department_icon} `}{currentRole.department}
                </p>
              )}
              <p style={{ fontSize: '0.92rem', color: '#F3EDE6', margin: 0 }}>{currentRole.name}</p>
              {currentRole.commitment && (
                <p style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.45, margin: '0.2rem 0 0' }}>{currentRole.commitment}</p>
              )}
              {currentRole.approval_status === 'pending' && (
                <span style={{ display: 'inline-block', marginTop: '0.3rem', fontSize: '0.65rem', color: '#D239F8', border: '1px solid rgba(210,57,248,0.3)', borderRadius: '9999px', padding: '0.1rem 0.4rem' }}>
                  pending approval
                </span>
              )}
            </>
          ) : (
            <p style={{ fontSize: '0.85rem', opacity: 0.35, fontStyle: 'italic', margin: 0 }}>Not assigned</p>
          )}
        </div>
        {currentRole && (
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            {currentRole.approval_status === 'pending' && (
              <button
                onClick={handleApprove}
                disabled={approving}
                style={{
                  background: 'rgba(100,200,120,0.08)', border: '1px solid rgba(100,200,120,0.35)', borderRadius: '9999px',
                  color: '#7dcf8e', cursor: 'pointer', padding: '0.35rem 0.85rem',
                  fontSize: '0.75rem', opacity: approving ? 0.4 : 1,
                }}
              >
                {approving ? 'Approving…' : 'Approve role'}
              </button>
            )}
            <button
              onClick={() => handleClear('role')}
              disabled={clearing === 'role'}
              style={{
                background: 'none', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '9999px',
                color: '#ff8a8a', cursor: 'pointer', padding: '0.35rem 0.85rem',
                fontSize: '0.75rem', opacity: clearing === 'role' ? 0.4 : 0.75,
              }}
            >
              {clearing === 'role' ? 'Removing…' : 'Remove role'}
            </button>
          </div>
        )}
      </div>

      {/* Shift card */}
      <div style={{
        padding: '1rem 1.25rem',
        border: '1px solid rgba(210,57,248,0.15)',
        borderRadius: '0.75rem',
        background: 'rgba(210,57,248,0.02)',
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.5, margin: '0 0 0.3rem' }}>Shift</p>
          {currentShift ? (
            <>
              <p style={{ fontSize: '0.92rem', color: '#F3EDE6', margin: 0 }}>{currentShift.title}</p>
              {currentShift.time && <p style={{ fontSize: '0.77rem', opacity: 0.45, margin: '0.2rem 0 0' }}>{currentShift.time}</p>}
              <p style={{ fontSize: '0.72rem', color: '#D239F8', opacity: 0.4, margin: '0.2rem 0 0' }}>{currentShift.day}</p>
            </>
          ) : (
            <p style={{ fontSize: '0.85rem', opacity: 0.35, fontStyle: 'italic', margin: 0 }}>Not assigned</p>
          )}
        </div>
        {currentShift && (
          <button
            onClick={() => handleClear('shift')}
            disabled={clearing === 'shift'}
            style={{
              background: 'none', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '9999px',
              color: '#ff8a8a', cursor: 'pointer', padding: '0.35rem 0.85rem',
              fontSize: '0.75rem', flexShrink: 0,
              opacity: clearing === 'shift' ? 0.4 : 0.75,
            }}
          >
            {clearing === 'shift' ? 'Removing…' : 'Remove shift'}
          </button>
        )}
      </div>

      {error && <p style={{ color: '#ff8a8a', fontSize: '0.8rem' }}>{error}</p>}
    </div>
  )
}
