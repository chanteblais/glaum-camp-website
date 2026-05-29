'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Volunteer = {
  id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  email: string
  phone: string | null
  days_available: string[]
  preferred_times: string[]
  shift_interests: string[]
  other_notes: string | null
  signup_intent: string | null
  status: string
  created_at: string
}

type CampMember = {
  id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  email: string
  contributions: string[] | null
  attendance: string | null
  // shifts_satisfied will be computed here — always true for now
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function ShiftStatus({ satisfied }: { satisfied: boolean }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.2rem 0.65rem',
      borderRadius: '9999px',
      fontSize: '0.7rem',
      letterSpacing: '0.06em',
      border: satisfied
        ? '1px solid rgba(100,220,130,0.35)'
        : '1px solid rgba(210,57,248,0.25)',
      color: satisfied ? 'rgba(100,220,130,0.9)' : 'rgba(210,57,248,0.7)',
      background: satisfied
        ? 'rgba(100,220,130,0.07)'
        : 'rgba(210,57,248,0.06)',
      flexShrink: 0,
    }}>
      {satisfied ? '✓ Shifts complete' : '○ Shifts incomplete'}
    </span>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '0.65rem',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: '#F3EDE6',
      opacity: 0.3,
      marginBottom: '0.75rem',
      marginTop: '0.25rem',
    }}>
      {children}
    </p>
  )
}

// ── Camp Member Row ─────────────────────────────────────────────────────────

function CampMemberRow({ member }: { member: CampMember }) {
  const [expanded, setExpanded] = useState(false)

  // TODO: replace with real shift sign-up check when shifts are built
  const shiftsSatisfied = true

  const displayName = member.preferred_name || member.first_name

  return (
    <div style={{
      border: '1px solid rgba(200,168,72,0.12)',
      borderRadius: '0.75rem',
      background: 'rgba(255,255,255,0.02)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.25rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '160px' }}>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.15rem' }}>
            {displayName} {member.last_name}
          </p>
          <p style={{ fontSize: '0.8rem', opacity: 0.45 }}>{member.email}</p>
        </div>
        <ShiftStatus satisfied={shiftsSatisfied} />
        {member.attendance && (
          <span style={{ fontSize: '0.75rem', opacity: 0.45, flexShrink: 0 }}>{member.attendance}</span>
        )}
        <span style={{ fontSize: '0.65rem', opacity: 0.3, flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(200,168,72,0.08)' }}>
          {member.contributions?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.5rem' }}>
                Contributions
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {member.contributions.map(c => (
                  <span key={c} style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(200,168,72,0.2)',
                    fontSize: '0.78rem',
                    opacity: 0.8,
                  }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            <a
              href={`/admin/${member.id}`}
              style={{ fontSize: '0.78rem', color: '#C8A848', opacity: 0.5, textDecoration: 'none', letterSpacing: '0.06em' }}
            >
              View full application →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Pending Volunteer Row ───────────────────────────────────────────────────

function PendingVolunteerRow({ volunteer }: { volunteer: Volunteer }) {
  const [expanded, setExpanded] = useState(false)
  const [approving, setApproving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const router = useRouter()

  const displayName = volunteer.preferred_name || volunteer.first_name
  const signed = new Date(volunteer.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })

  const handleApprove = async () => {
    setApproving(true)
    await fetch(`/api/admin/volunteer/${volunteer.id}/approve`, { method: 'POST' })
    router.refresh()
  }

  const handleRemove = async () => {
    if (!confirm(`Decline ${displayName} ${volunteer.last_name}?`)) return
    setRemoving(true)
    await fetch(`/api/admin/volunteer/${volunteer.id}`, { method: 'DELETE' })
    router.refresh()
  }

  const INTENT_LABELS: Record<string, string> = {
    shift: 'Shift',
    role: 'Role',
    other: 'Other',
  }

  return (
    <div style={{
      border: '1px solid rgba(210,57,248,0.25)',
      borderRadius: '0.75rem',
      background: 'rgba(210,57,248,0.04)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.25rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '160px' }}>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.15rem' }}>
            {displayName} {volunteer.last_name}
          </p>
          <p style={{ fontSize: '0.8rem', opacity: 0.45 }}>{volunteer.email}</p>
        </div>
        {volunteer.signup_intent && (
          <span style={{ fontSize: '0.72rem', color: '#D239F8', opacity: 0.7, flexShrink: 0, letterSpacing: '0.06em' }}>
            {INTENT_LABELS[volunteer.signup_intent] ?? volunteer.signup_intent}
          </span>
        )}
        <span style={{ fontSize: '0.78rem', opacity: 0.4, flexShrink: 0 }}>{signed}</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.3, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(210,57,248,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem', marginBottom: '1.25rem' }}>
            {volunteer.days_available?.length > 0 && (
              <div>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.4rem' }}>Days Available</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {volunteer.days_available.map(d => (
                    <span key={d} style={{ fontSize: '0.82rem', opacity: 0.8 }}>{d}</span>
                  ))}
                </div>
              </div>
            )}
            {volunteer.phone && (
              <div>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.4rem' }}>Phone</p>
                <p style={{ fontSize: '0.82rem', opacity: 0.8 }}>{volunteer.phone}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              onClick={handleRemove}
              disabled={removing}
              style={{ padding: '0.45rem 1.1rem', borderRadius: '9999px', border: '1px solid rgba(255,100,100,0.25)', background: 'transparent', color: '#F3EDE6', fontSize: '0.78rem', opacity: removing ? 0.4 : 0.5, cursor: removing ? 'not-allowed' : 'pointer' }}
            >
              {removing ? 'Declining…' : 'Decline'}
            </button>
            <button
              onClick={handleApprove}
              disabled={approving}
              style={{ padding: '0.45rem 1.25rem', borderRadius: '9999px', border: '1px solid rgba(210,57,248,0.5)', background: 'rgba(210,57,248,0.08)', color: '#D239F8', fontSize: '0.78rem', fontWeight: 600, cursor: approving ? 'not-allowed' : 'pointer', opacity: approving ? 0.5 : 1, letterSpacing: '0.04em' }}
            >
              {approving ? 'Approving…' : 'Approve'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Outside Volunteer Row ───────────────────────────────────────────────────

function VolunteerRow({ volunteer }: { volunteer: Volunteer }) {
  const [expanded, setExpanded] = useState(false)
  const [removing, setRemoving] = useState(false)
  const router = useRouter()

  const handleRemove = async () => {
    if (!confirm(`Remove ${volunteer.first_name} ${volunteer.last_name} from volunteers?`)) return
    setRemoving(true)
    await fetch(`/api/admin/volunteer/${volunteer.id}`, { method: 'DELETE' })
    router.refresh()
  }

  const signed = new Date(volunteer.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  const displayName = volunteer.preferred_name || volunteer.first_name

  return (
    <div style={{
      border: '1px solid rgba(210,57,248,0.12)',
      borderRadius: '0.75rem',
      background: 'rgba(255,255,255,0.02)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.25rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '160px' }}>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.15rem' }}>
            {displayName} {volunteer.last_name}
          </p>
          <p style={{ fontSize: '0.8rem', opacity: 0.45 }}>{volunteer.email}</p>
        </div>
        <span style={{ fontSize: '0.78rem', opacity: 0.4, flexShrink: 0 }}>{signed}</span>
        {volunteer.days_available?.length > 0 && (
          <span style={{ fontSize: '0.75rem', color: '#D239F8', opacity: 0.65, flexShrink: 0 }}>
            {volunteer.days_available.length} {volunteer.days_available.length === 1 ? 'day' : 'days'}
          </span>
        )}
        <span style={{ fontSize: '0.65rem', opacity: 0.3, flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(210,57,248,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
            {volunteer.days_available?.length > 0 && (
              <div>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.4rem' }}>Days Available</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {volunteer.days_available.map(d => (
                    <span key={d} style={{ fontSize: '0.82rem', opacity: 0.8 }}>{d}</span>
                  ))}
                </div>
              </div>
            )}
            {volunteer.preferred_times?.length > 0 && (
              <div>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.4rem' }}>Preferred Times</p>
                <p style={{ fontSize: '0.82rem', opacity: 0.8 }}>{volunteer.preferred_times.join(', ')}</p>
              </div>
            )}
            {volunteer.shift_interests?.length > 0 && (
              <div>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.4rem' }}>Shift Interests</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {volunteer.shift_interests.map(s => (
                    <span key={s} style={{ padding: '0.15rem 0.6rem', borderRadius: '9999px', border: '1px solid rgba(210,57,248,0.2)', fontSize: '0.78rem', color: '#D239F8', opacity: 0.75 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {volunteer.phone && (
              <div>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.4rem' }}>Phone</p>
                <p style={{ fontSize: '0.82rem', opacity: 0.8 }}>{volunteer.phone}</p>
              </div>
            )}
          </div>
          {volunteer.other_notes && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(200,168,72,0.08)', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>Notes</p>
              <p style={{ fontSize: '0.85rem', opacity: 0.75, lineHeight: 1.6 }}>{volunteer.other_notes}</p>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleRemove}
              disabled={removing}
              style={{
                padding: '0.35rem 1rem',
                borderRadius: '9999px',
                border: '1px solid rgba(255,100,100,0.25)',
                background: 'transparent',
                color: '#F3EDE6',
                fontSize: '0.75rem',
                opacity: removing ? 0.4 : 0.5,
                cursor: removing ? 'not-allowed' : 'pointer',
                letterSpacing: '0.06em',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { if (!removing) e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={e => { if (!removing) e.currentTarget.style.opacity = '0.5' }}
            >
              {removing ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────

export function VolunteersSection({
  volunteers,
  pendingVolunteers,
  campMembers,
}: {
  volunteers: Volunteer[]
  pendingVolunteers: Volunteer[]
  campMembers: CampMember[]
}) {
  const noOne = campMembers.length === 0 && volunteers.length === 0 && pendingVolunteers.length === 0

  if (noOne) {
    return <p style={{ opacity: 0.4, fontStyle: 'italic', fontSize: '0.875rem' }}>No volunteers or camp members yet.</p>
  }

  return (
    <div>
      {pendingVolunteers.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <SubHeading>Pending Approval — {pendingVolunteers.length}</SubHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {pendingVolunteers.map(v => <PendingVolunteerRow key={v.id} volunteer={v} />)}
          </div>
          {(campMembers.length > 0 || volunteers.length > 0) && (
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(210,57,248,0.15), transparent)', marginTop: '2rem' }} />
          )}
        </div>
      )}

      {campMembers.length > 0 && (
        <div style={{ marginBottom: volunteers.length > 0 ? '2rem' : 0 }}>
          <SubHeading>Camp Members — {campMembers.length}</SubHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {campMembers.map(m => <CampMemberRow key={m.id} member={m} />)}
          </div>
        </div>
      )}

      {volunteers.length > 0 && (
        <div>
          {campMembers.length > 0 && (
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.1), transparent)', marginBottom: '2rem' }} />
          )}
          <SubHeading>Helping Hands — {volunteers.length}</SubHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {volunteers.map(v => <VolunteerRow key={v.id} volunteer={v} />)}
          </div>
        </div>
      )}
    </div>
  )
}
