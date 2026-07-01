'use client'

import { useState, useEffect } from 'react'
import { SuggestRoleModal } from './SuggestRoleModal'
import { isImageIcon } from '@/lib/icon-src'

type Role = {
  id: string
  name: string
  description: string | null
  capacity: number
  signed_up: number
  department_id: string
  purpose: string | null
  responsibilities_before: string | null
  responsibilities_during: string | null
  ideal_for: string | null
  commitment: string | null
  commitment_period: string | null
  requires_approval: boolean
}

type Department = {
  id: string
  name: string
  description: string | null
  icon: string | null
  roles: Role[]
}

type ScheduleEvent = {
  id: string
  day: string
  time: string
  title: string
  subtitle: string | null
  icon_type: string
  highlight: boolean
  is_recurring: boolean
  capacity: number | null
  signed_up: number | null  // null = no capacity set (not signable)
}

type Signup = {
  role_id: string | null
  schedule_event_id: string | null
  role_approval_status: string | null
}

// ── Status Banner ─────────────────────────────────────────────────────────────

function SignupStatusBanner({
  signup, hasRoles, hasShiftableEvents,
}: {
  signup: Signup | null
  hasRoles: boolean
  hasShiftableEvents: boolean
}) {
  if (!hasRoles && !hasShiftableEvents) return null

  const hasRole = !!signup?.role_id
  const hasShift = !!signup?.schedule_event_id
  const isPending = signup?.role_approval_status === 'pending'
  const allDone = (!hasRoles || (hasRole && !isPending)) && (!hasShiftableEvents || hasShift)

  if (isPending) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.65rem 1rem', borderRadius: '9999px',
        border: '1px solid rgba(210,57,248,0.3)',
        background: 'rgba(210,57,248,0.06)',
        marginBottom: '2rem', width: 'fit-content',
      }}>
        <span style={{ color: '#D239F8', fontSize: '0.75rem' }}>○</span>
        <span style={{ fontSize: '0.78rem', color: '#D239F8', opacity: 0.85, letterSpacing: '0.04em' }}>
          Role request pending approval
        </span>
      </div>
    )
  }

  if (allDone) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.65rem 1rem', borderRadius: '9999px',
        border: '1px solid rgba(100,200,120,0.3)',
        background: 'rgba(100,200,120,0.06)',
        marginBottom: '2rem', width: 'fit-content',
      }}>
        <span style={{ color: '#7dcf8e', fontSize: '0.75rem' }}>✓</span>
        <span style={{ fontSize: '0.78rem', color: '#7dcf8e', opacity: 0.85, letterSpacing: '0.04em' }}>
          Role &amp; shift confirmed
        </span>
      </div>
    )
  }

  const missing = []
  if (hasRoles && !hasRole) missing.push('a role')
  if (hasShiftableEvents && !hasShift) missing.push('a shift')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
      padding: '0.75rem 1.1rem', borderRadius: '0.75rem',
      border: '1px solid rgba(210,168,50,0.35)',
      background: 'rgba(210,168,50,0.06)',
      marginBottom: '2rem',
    }}>
      <span style={{ fontSize: '0.82rem', color: '#C8A848', opacity: 0.9 }}>
        ⚠ You still need to choose {missing.join(' and ')}.
      </span>
      <a href="#role-signup" style={{ fontSize: '0.78rem', color: '#C8A848', opacity: 0.65, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
        Sign up below →
      </a>
    </div>
  )
}

// ── Current Signup Cards ──────────────────────────────────────────────────────

function CurrentSignupCards({
  signup, departments, scheduleEvents, onOptOut, onCancelShift,
}: {
  signup: Signup | null
  departments: Department[]
  scheduleEvents: ScheduleEvent[]
  onOptOut: () => void
  onCancelShift: () => void
}) {
  const [roleExpanded, setRoleExpanded] = useState(false)
  const [shiftExpanded, setShiftExpanded] = useState(false)
  const [optingOut, setOptingOut] = useState(false)
  const [cancellingShift, setCancellingShift] = useState(false)

  const allRoles = departments.flatMap(d => d.roles)
  const role = allRoles.find(r => r.id === signup?.role_id)
  const dept = role ? departments.find(d => d.id === role.department_id) : null
  const event = scheduleEvents.find(e => e.id === signup?.schedule_event_id)

  const hasRoleDetail = role && (role.purpose || role.responsibilities_before || role.responsibilities_during || role.ideal_for || role.commitment || role.commitment_period)

  async function handleOptOut() {
    if (!confirm('Remove your role selection? You can choose a new one below.')) return
    setOptingOut(true)
    await onOptOut()
    setRoleExpanded(false)
    setOptingOut(false)
  }

  async function handleCancelShift() {
    if (!confirm('Cancel your shift? You can choose a new one below.')) return
    setCancellingShift(true)
    await onCancelShift()
    setShiftExpanded(false)
    setCancellingShift(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>

      {/* Role card — plain, since the badge now lives in the profile header */}
      <div style={{ border: '1px solid rgba(200,168,72,0.15)', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
        <button
          onClick={() => role && setRoleExpanded(o => !o)}
          style={{ width: '100%', textAlign: 'left', padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: role ? 'pointer' : 'default', display: 'block' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.85, margin: '0 0 0.4rem' }}>
              Your Role
            </p>
            {role && <span style={{ fontSize: '0.6rem', color: '#C8A848', opacity: 0.4 }}>{roleExpanded ? '▲' : '▼'}</span>}
          </div>
          {role ? (
            <>
              {dept && (
                <p style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.75, margin: '0 0 0.2rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {dept.icon && (isImageIcon(dept.icon) ? <img src={dept.icon} alt="" aria-hidden style={{ width: '1rem', height: '1rem', objectFit: 'contain', flexShrink: 0 }} /> : <span>{dept.icon}</span>)}
                  {dept.name}
                </p>
              )}
              <p style={{ fontSize: '0.92rem', color: '#F3EDE6', margin: 0 }}>{role.name}</p>
              {(role.commitment || role.commitment_period) && (
                <div style={{ marginTop: '0.4rem' }}><CommitmentPill commitment={role.commitment} period={role.commitment_period} /></div>
              )}
            </>
          ) : (
            <p style={{ fontSize: '0.85rem', opacity: 0.35, fontStyle: 'italic', margin: 0 }}>Not chosen</p>
          )}
        </button>

        {role && roleExpanded && (
          <div style={{ borderTop: '1px solid rgba(200,168,72,0.1)' }}>
            {hasRoleDetail && (
              <div style={{ padding: '0.85rem 1.25rem' }}>
                {role.purpose && <div style={{ marginBottom: '0.75rem' }}><p style={{ fontSize: '0.63rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>Purpose</p><p style={{ fontSize: '0.8rem', lineHeight: 1.65, opacity: 0.7, margin: 0 }}>{role.purpose}</p></div>}
                {role.responsibilities_before && <div style={{ marginBottom: '0.75rem' }}><p style={{ fontSize: '0.63rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>Before Event</p><ul style={{ margin: 0, paddingLeft: '1.1rem' }}>{role.responsibilities_before.split('\n').filter(Boolean).map((l, i) => <li key={i} style={{ fontSize: '0.8rem', lineHeight: 1.65, opacity: 0.7 }}>{l}</li>)}</ul></div>}
                {role.responsibilities_during && <div style={{ marginBottom: '0.75rem' }}><p style={{ fontSize: '0.63rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>During Event</p><ul style={{ margin: 0, paddingLeft: '1.1rem' }}>{role.responsibilities_during.split('\n').filter(Boolean).map((l, i) => <li key={i} style={{ fontSize: '0.8rem', lineHeight: 1.65, opacity: 0.7 }}>{l}</li>)}</ul></div>}
                {role.ideal_for && <div><p style={{ fontSize: '0.63rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>Ideal For</p><p style={{ fontSize: '0.8rem', lineHeight: 1.65, opacity: 0.7, fontStyle: 'italic', margin: 0 }}>{role.ideal_for}</p></div>}
              </div>
            )}
            <div style={{ padding: '0.75rem 1.25rem', borderTop: hasRoleDetail ? '1px solid rgba(200,168,72,0.08)' : undefined }}>
              <button onClick={handleOptOut} disabled={optingOut} style={{ background: 'none', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '9999px', color: '#ff8a8a', cursor: 'pointer', padding: '0.35rem 0.85rem', fontSize: '0.75rem', opacity: optingOut ? 0.4 : 0.75 }}>
                {optingOut ? 'Removing…' : 'Opt out of this role'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shift card — expandable */}
      <div style={{
        border: '1px solid rgba(210,57,248,0.15)', borderRadius: '0.75rem',
        background: 'rgba(210,57,248,0.02)', overflow: 'hidden',
      }}>
        <button
          onClick={() => event && setShiftExpanded(o => !o)}
          style={{
            width: '100%', textAlign: 'left', padding: '1rem 1.25rem',
            background: 'none', border: 'none', cursor: event ? 'pointer' : 'default', display: 'block',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.85, margin: '0 0 0.4rem' }}>
              Your Shift
            </p>
            {event && (
              <span style={{ fontSize: '0.6rem', color: '#D239F8', opacity: 0.4 }}>{shiftExpanded ? '▲' : '▼'}</span>
            )}
          </div>
          {event ? (
            <>
              <p style={{ fontSize: '0.92rem', color: '#F3EDE6', margin: 0 }}>{event.title}</p>
              {event.time && <p style={{ fontSize: '0.77rem', opacity: 0.7, margin: '0.25rem 0 0' }}>{event.time}</p>}
              <p style={{ fontSize: '0.72rem', color: '#D239F8', opacity: 0.75, margin: '0.25rem 0 0', letterSpacing: '0.04em' }}>
                {DAY_TO_DATE_LABEL[event.day] ?? event.day}
              </p>
            </>
          ) : (
            <p style={{ fontSize: '0.85rem', opacity: 0.35, fontStyle: 'italic', margin: 0 }}>Not chosen</p>
          )}
        </button>

        {event && shiftExpanded && (
          <div style={{ borderTop: '1px solid rgba(210,57,248,0.12)' }}>
            {event.subtitle && (
              <div style={{ padding: '0.85rem 1.25rem' }}>
                <p style={{ fontSize: '0.8rem', lineHeight: 1.65, opacity: 0.7, margin: 0 }}>{event.subtitle}</p>
              </div>
            )}
            <div style={{ padding: '0.75rem 1.25rem', borderTop: event.subtitle ? '1px solid rgba(210,57,248,0.08)' : undefined }}>
              <button
                onClick={handleCancelShift}
                disabled={cancellingShift}
                style={{
                  background: 'none', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '9999px',
                  color: '#ff8a8a', cursor: 'pointer', padding: '0.35rem 0.85rem',
                  fontSize: '0.75rem', opacity: cancellingShift ? 0.4 : 0.75,
                  transition: 'opacity 0.15s',
                }}
              >
                {cancellingShift ? 'Cancelling…' : 'Cancel this shift'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Role Detail Panel ─────────────────────────────────────────────────────────

function RoleDetailPanel({ role }: { role: Role }) {
  const hasDetail = role.purpose || role.responsibilities_before || role.responsibilities_during || role.ideal_for
  if (!hasDetail && !role.commitment && !role.commitment_period) return null

  return (
    <div style={{ marginTop: '0.75rem', padding: '1rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(200,168,72,0.1)' }}>
      {(role.commitment || role.commitment_period) && (
        <p style={{ fontSize: '0.75rem', color: '#C8A848', opacity: 0.7, marginBottom: hasDetail ? '0.85rem' : 0 }}>
          Time Commitment: {[role.commitment, role.commitment_period].filter(Boolean).join(' · ')}
        </p>
      )}
      {role.purpose && (
        <div style={{ marginBottom: '0.85rem' }}>
          <p style={{ fontSize: '0.63rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>Purpose</p>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.7, opacity: 0.7, margin: 0 }}>{role.purpose}</p>
        </div>
      )}
      {role.responsibilities_before && (
        <div style={{ marginBottom: '0.85rem' }}>
          <p style={{ fontSize: '0.63rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>Before Event</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {role.responsibilities_before.split('\n').filter(Boolean).map((line, i) => (
              <li key={i} style={{ fontSize: '0.82rem', lineHeight: 1.7, opacity: 0.7 }}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {role.responsibilities_during && (
        <div style={{ marginBottom: '0.85rem' }}>
          <p style={{ fontSize: '0.63rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>During Event</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {role.responsibilities_during.split('\n').filter(Boolean).map((line, i) => (
              <li key={i} style={{ fontSize: '0.82rem', lineHeight: 1.7, opacity: 0.7 }}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {role.ideal_for && (
        <div>
          <p style={{ fontSize: '0.63rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>Ideal For</p>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.7, opacity: 0.7, fontStyle: 'italic', margin: 0 }}>{role.ideal_for}</p>
        </div>
      )}
    </div>
  )
}

// ── Commitment Pill ───────────────────────────────────────────────────────────

const COMMITMENT_COLORS: Record<string, string> = {
  'Low':         'rgba(100,200,120,0.15)',
  'Low–Medium':  'rgba(150,200,100,0.15)',
  'Medium':      'rgba(200,180,80,0.15)',
  'Medium–High': 'rgba(220,140,60,0.15)',
  'High':        'rgba(220,80,80,0.15)',
}
const COMMITMENT_TEXT: Record<string, string> = {
  'Low':         '#7dcf8e',
  'Low–Medium':  '#a8cf6e',
  'Medium':      '#c8a848',
  'Medium–High': '#d48c3c',
  'High':        '#dc5050',
}

function CommitmentPill({ commitment, period }: { commitment: string | null; period: string | null }) {
  if (!commitment && !period) return null
  const label = [commitment, period].filter(Boolean).join(' · ')
  const bg = commitment ? COMMITMENT_COLORS[commitment] ?? 'rgba(200,168,72,0.1)' : 'rgba(200,168,72,0.1)'
  const color = commitment ? COMMITMENT_TEXT[commitment] ?? '#C8A848' : '#C8A848'
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: '9999px',
      fontSize: '0.65rem', letterSpacing: '0.05em', background: bg, color, flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

// ── Department Card (collapsible) ─────────────────────────────────────────────

function DeptCard({
  dept, selectedRole, selectedShiftEvent, signup, saving, error, onChange, onDeselect, onConfirm, canConfirm,
}: {
  dept: Department
  selectedRole: string | null
  selectedShiftEvent: ScheduleEvent | null
  signup: Signup | null
  saving: boolean
  error: string | null
  onChange: (id: string) => void
  onDeselect: () => void
  onConfirm: () => void
  canConfirm: boolean
}) {
  const hasSelectedRole = dept.roles.some(r => r.id === selectedRole)
  const [open, setOpen] = useState(false)
  const [expandedRole, setExpandedRole] = useState<string | null>(null)

  return (
    <div style={{
      borderRadius: '0.85rem', overflow: 'hidden',
      border: '1px solid rgba(200,168,72,0.15)',
      background: 'rgba(255,255,255,0.01)',
    }}>
      {/* Department header — clickable to collapse */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '1rem 1.1rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.65rem',
        }}
      >
        {dept.icon && (isImageIcon(dept.icon) ? <img src={dept.icon} alt="" aria-hidden style={{ width: '1.4rem', height: '1.4rem', objectFit: 'contain', flexShrink: 0 }} /> : <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{dept.icon}</span>)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.9rem', color: '#C8A848', margin: 0, fontWeight: 600, letterSpacing: '0.03em' }}>
            {dept.name}
          </p>
          {dept.description && (
            <p style={{ fontSize: '0.75rem', opacity: 0.45, margin: '0.15rem 0 0', lineHeight: 1.4 }}>{dept.description}</p>
          )}
        </div>
        <span style={{ fontSize: '0.7rem', color: '#C8A848', opacity: 0.4, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Roles list */}
      {open && (
        <div style={{
          borderTop: '1px solid rgba(200,168,72,0.1)',
          padding: '0.75rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          {dept.roles.length === 0 && (
            <p style={{ fontSize: '0.78rem', opacity: 0.3, fontStyle: 'italic', padding: '0.25rem 0.25rem' }}>No roles in this department yet.</p>
          )}
          {dept.roles.map(role => {
            const full = role.signed_up >= role.capacity && role.id !== signup?.role_id
            const selected = selectedRole === role.id
            const isPendingApproval = selected && signup?.role_approval_status === 'pending'
            return (
              <div key={role.id}>
                <button
                  onClick={() => {
                    if (full) return
                    if (!selected) onChange(role.id)
                    setExpandedRole(expandedRole === role.id ? null : role.id)
                  }}
                  disabled={full}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '0.7rem 0.85rem',
                    borderRadius: expandedRole === role.id ? '0.55rem 0.55rem 0 0' : '0.55rem',
                    border: '1px solid rgba(200,168,72,0.08)',
                    borderBottom: expandedRole === role.id ? '1px solid rgba(200,168,72,0.08)' : undefined,
                    background: full ? 'transparent' : 'rgba(255,255,255,0.02)',
                    cursor: full ? 'not-allowed' : 'pointer',
                    opacity: full ? 0.4 : 1,
                    transition: 'border-color 0.15s',
                    display: 'block',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.87rem', color: '#F3EDE6', margin: 0 }}>{role.name}</p>
                      {role.description && (
                        <p style={{ fontSize: '0.75rem', opacity: 0.5, margin: '0.2rem 0 0', lineHeight: 1.5 }}>{role.description}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isPendingApproval ? (
                          <span style={{ fontSize: '0.68rem', color: '#D239F8', opacity: 0.85, whiteSpace: 'nowrap', border: '1px solid rgba(210,57,248,0.3)', borderRadius: '9999px', padding: '0.1rem 0.45rem' }}>
                            pending approval
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: full ? '#ff8a8a' : '#C8A848', opacity: full ? 0.8 : 0.5, whiteSpace: 'nowrap' }}>
                            {full ? 'Full' : `${role.capacity - role.signed_up} open`}
                          </span>
                        )}
                        {role.requires_approval && !isPendingApproval && (
                          <span style={{ fontSize: '0.65rem', opacity: 0.45 }} title="Requires admin approval">🔒</span>
                        )}
                        <span style={{ fontSize: '0.6rem', color: '#C8A848', opacity: 0.35 }}>
                          {expandedRole === role.id ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                {expandedRole === role.id && (
                  <>
                    <div style={{ padding: '0.5rem 1rem 0', borderTop: '1px solid rgba(200,168,72,0.08)' }}>
                      <CommitmentPill commitment={role.commitment} period={role.commitment_period} />
                    </div>
                    <RoleDetailPanel role={role} />
                    {/* Confirm footer */}
                    <div style={{
                      padding: '0.85rem 1rem',
                      borderTop: '1px solid rgba(200,168,72,0.1)',
                      background: 'rgba(200,168,72,0.04)',
                      borderRadius: '0 0 0.55rem 0.55rem',
                    }}>
                      {/* Approval notice */}
                      {role.requires_approval && (
                        <div style={{
                          padding: '0.6rem 0.75rem', borderRadius: '0.5rem', marginBottom: '0.75rem',
                          background: 'rgba(210,57,248,0.07)', border: '1px solid rgba(210,57,248,0.2)',
                        }}>
                          <p style={{ fontSize: '0.78rem', color: '#D239F8', opacity: 0.9, margin: 0, lineHeight: 1.5 }}>
                            This role requires admin approval. Your request will be reviewed before it's confirmed.
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          {selectedShiftEvent ? (
                            <p style={{ fontSize: '0.78rem', color: '#D239F8', opacity: 0.8, margin: 0 }}>
                              Shift: <span style={{ color: '#F3EDE6' }}>{selectedShiftEvent.title}</span>
                              {selectedShiftEvent.time && <span style={{ opacity: 0.5 }}> · {selectedShiftEvent.time}</span>}
                            </p>
                          ) : role.requires_approval ? (
                            <p style={{ fontSize: '0.78rem', opacity: 0.4, margin: 0, fontStyle: 'italic' }}>
                              You can pick a shift after your role is approved.
                            </p>
                          ) : (
                            <p style={{ fontSize: '0.78rem', opacity: 0.4, margin: 0, fontStyle: 'italic' }}>
                              You can also select a shift below.
                            </p>
                          )}
                          {error && <p style={{ color: '#ff8a8a', fontSize: '0.75rem', margin: '0.35rem 0 0' }}>{error}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0, alignItems: 'center' }}>
                          {/* Cancel selection */}
                          <button
                            onClick={() => { onDeselect(); setExpandedRole(null) }}
                            style={{
                              background: 'none', border: 'none', color: '#F3EDE6',
                              cursor: 'pointer', fontSize: '0.75rem', opacity: 0.4, padding: '0.5rem 0',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={onConfirm}
                            disabled={saving}
                            style={{
                              padding: '0.5rem 1.25rem', borderRadius: '9999px',
                              border: '1px solid rgba(200,168,72,0.5)',
                              background: 'rgba(200,168,72,0.1)',
                              color: '#FFFACD', cursor: saving ? 'not-allowed' : 'pointer',
                              fontSize: '0.8rem', letterSpacing: '0.05em',
                              opacity: saving ? 0.5 : 1,
                              transition: 'opacity 0.15s',
                            }}
                          >
                            {saving ? 'Saving…' : role.requires_approval ? 'Request Role' : signup?.role_id ? 'Update' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Role Picker (departments + roles) ─────────────────────────────────────────

function RolePicker({
  departments, selectedRole, selectedShiftEvent, signup, saving, error, onChange, onDeselect, onConfirm, canConfirm,
}: {
  departments: Department[]
  selectedRole: string | null
  selectedShiftEvent: ScheduleEvent | null
  signup: Signup | null
  saving: boolean
  error: string | null
  onChange: (id: string) => void
  onDeselect: () => void
  onConfirm: () => void
  canConfirm: boolean
}) {
  if (departments.length === 0) return null

  return (
    <div>
      <p style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.85, marginBottom: '1rem', textAlign: 'center' }}>
        Choose a Role
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {departments.map(dept => (
          <DeptCard
            key={dept.id}
            dept={dept}
            selectedRole={selectedRole}
            selectedShiftEvent={selectedShiftEvent}
            signup={signup}
            saving={saving}
            error={error}
            onChange={onChange}
            onDeselect={onDeselect}
            onConfirm={onConfirm}
            canConfirm={canConfirm}
          />
        ))}
      </div>
    </div>
  )
}

// ── Calendar Shift Picker ─────────────────────────────────────────────────────

const CALENDAR_DAYS = [
  { day: 'Thursday', short: 'Thu', dayNum: 23 },
  { day: 'Friday',   short: 'Fri', dayNum: 24 },
  { day: 'Saturday', short: 'Sat', dayNum: 25 },
  { day: 'Sunday',   short: 'Sun', dayNum: 26 },
]

const DAY_TO_DATE_LABEL: Record<string, string> = {
  Thursday:  'Thursday, July 23',
  Friday:    'Friday, July 24',
  Saturday:  'Saturday, July 25',
  Sunday:    'Sunday, July 26',
}

function ShiftPicker({
  scheduleEvents, selectedShift, signup, onChange, onConfirm, saving, error,
}: {
  scheduleEvents: ScheduleEvent[]
  selectedShift: string | null
  signup: Signup | null
  onChange: (id: string) => void
  onConfirm: () => void
  saving: boolean
  error: string | null
}) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  if (scheduleEvents.length === 0) return null

  return (
    <div>
      {signup?.schedule_event_id ? (
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.85, marginBottom: '0.25rem' }}>
            Your Shift
          </p>
          <p style={{ fontSize: '0.9rem', color: '#F3EDE6', margin: 0 }}>
            {scheduleEvents.find(e => e.id === signup.schedule_event_id)?.title ?? 'Shift confirmed'}
          </p>
        </div>
      ) : (
        <p style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.85, marginBottom: '1rem', textAlign: 'center' }}>
          Choose a Shift
        </p>
      )}

      {/* Horizontally scrollable on mobile */}
      <div style={{ overflowX: 'auto', marginLeft: '-1.5rem', marginRight: '-1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: '0.75rem', minWidth: '640px' }}>
          {CALENDAR_DAYS.map(day => {
            const dayEvents = scheduleEvents.filter(e => e.day === day.day && !e.is_recurring)

            return (
              <div key={day.day} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Day header */}
                <div style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.6rem 0.6rem 0 0',
                  background: 'rgba(210,57,248,0.08)',
                  border: '1px solid rgba(210,57,248,0.18)',
                  borderBottom: 'none',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.7, margin: 0 }}>{day.short}</p>
                  <p style={{ fontSize: '1rem', color: '#F3EDE6', margin: '0.1rem 0 0', fontFamily: 'TokyoDreams, serif' }}>{day.dayNum}</p>
                </div>

                {/* Column body */}
                <div style={{
                  flex: 1, padding: '0.6rem',
                  border: '1px solid rgba(210,57,248,0.12)',
                  borderRadius: '0 0 0.6rem 0.6rem',
                  background: 'rgba(255,255,255,0.01)',
                  display: 'flex', flexDirection: 'column', gap: '0.4rem',
                }}>
                  {dayEvents.map(ev => {
                    const isSignable = ev.capacity != null
                    const full = isSignable && ev.signed_up != null && ev.signed_up >= ev.capacity! && ev.id !== signup?.schedule_event_id
                    const selected = selectedShift === ev.id
                    const isExpanded = expandedEvent === ev.id
                    const hasDetail = !!ev.subtitle

                    // Signable events get selectable treatment; others are context-only
                    if (isSignable) {
                      return (
                        <div key={ev.id} style={{ borderRadius: '0.4rem', overflow: 'hidden' }}>
                          <button
                            onClick={() => {
                              if (full) return
                              onChange(ev.id)
                              setExpandedEvent(isExpanded ? null : ev.id)
                            }}
                            style={{
                              width: '100%', textAlign: 'left', padding: '0.5rem 0.6rem',
                              borderRadius: isExpanded ? '0.4rem 0.4rem 0 0' : '0.4rem',
                              border: selected && ev.id === signup?.schedule_event_id
                                ? '1px solid rgba(210,57,248,0.9)'
                                : selected
                                ? '1px solid rgba(210,57,248,0.6)'
                                : full
                                  ? '1px solid rgba(255,80,80,0.2)'
                                  : '1px solid rgba(210,57,248,0.3)',
                              borderBottom: isExpanded ? 'none' : undefined,
                              background: selected && ev.id === signup?.schedule_event_id
                                ? 'rgba(210,57,248,0.22)'
                                : selected
                                ? 'rgba(210,57,248,0.12)'
                                : full ? 'rgba(255,255,255,0.01)' : 'rgba(210,57,248,0.05)',
                              cursor: full ? 'not-allowed' : 'pointer',
                              transition: 'border-color 0.15s, background 0.15s',
                              display: 'block',
                            }}
                          >
                            {ev.time && <p style={{ fontSize: '0.6rem', color: '#D239F8', opacity: 0.55, margin: '0 0 0.15rem', letterSpacing: '0.05em' }}>{ev.time}</p>}
                            <p style={{ fontSize: '0.75rem', color: full ? 'rgba(243,237,230,0.4)' : '#F3EDE6', margin: 0, lineHeight: 1.3 }}>{ev.title}</p>
                            <p style={{ fontSize: '0.65rem', margin: '0.25rem 0 0', color: full ? '#ff8a8a' : '#D239F8', opacity: full ? 0.8 : 0.65 }}>
                              {full
                                ? 'Full'
                                : `${ev.capacity! - (ev.signed_up ?? 0)} of ${ev.capacity} open`}
                            </p>
                          </button>
                          {isExpanded && hasDetail && (
                            <div style={{
                              padding: '0.4rem 0.6rem',
                              border: '1px solid rgba(210,57,248,0.3)',
                              borderTop: 'none',
                              borderRadius: '0 0 0.4rem 0.4rem',
                              background: 'rgba(210,57,248,0.04)',
                            }}>
                              <p style={{ fontSize: '0.7rem', opacity: 0.6, margin: 0, lineHeight: 1.5 }}>{ev.subtitle}</p>
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Non-signable events: muted context only, click to expand subtitle
                    return (
                      <div key={ev.id} style={{ borderRadius: '0.35rem', overflow: 'hidden', opacity: 0.45 }}>
                        <button
                          onClick={() => hasDetail && setExpandedEvent(isExpanded ? null : ev.id)}
                          style={{
                            width: '100%', textAlign: 'left', padding: '0.3rem 0.45rem',
                            borderRadius: isExpanded ? '0.35rem 0.35rem 0 0' : '0.35rem',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderBottom: isExpanded ? 'none' : undefined,
                            cursor: hasDetail ? 'pointer' : 'default',
                            display: 'block',
                          }}
                        >
                          {ev.time && <p style={{ fontSize: '0.58rem', color: '#F3EDE6', opacity: 0.5, margin: '0 0 0.1rem', letterSpacing: '0.03em' }}>{ev.time}</p>}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
                            <p style={{ fontSize: '0.7rem', color: '#F3EDE6', margin: 0, lineHeight: 1.3 }}>{ev.title}</p>
                            {hasDetail && <span style={{ fontSize: '0.5rem', color: '#F3EDE6', opacity: 0.5, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>}
                          </div>
                        </button>
                        {isExpanded && ev.subtitle && (
                          <div style={{
                            padding: '0.3rem 0.45rem',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderTop: 'none',
                            borderRadius: '0 0 0.35rem 0.35rem',
                          }}>
                            <p style={{ fontSize: '0.65rem', opacity: 0.8, margin: 0, lineHeight: 1.5 }}>{ev.subtitle}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {dayEvents.length === 0 && (
                    <p style={{ fontSize: '0.7rem', opacity: 0.2, fontStyle: 'italic', textAlign: 'center', padding: '0.5rem 0' }}>—</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm footer */}
      {selectedShift && selectedShift !== signup?.schedule_event_id && (
        <div style={{
          marginTop: '1.25rem',
          padding: '0.85rem 1.25rem',
          borderTop: '1px solid rgba(210,57,248,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        }}>
          <p style={{ fontSize: '0.8rem', color: '#D239F8', opacity: 0.8, margin: 0 }}>
            {scheduleEvents.find(e => e.id === selectedShift)?.title ?? 'Shift selected'}
          </p>
          {signup?.schedule_event_id ? (
            <p style={{ fontSize: '0.78rem', opacity: 0.5, fontStyle: 'italic', margin: 0 }}>
              Cancel your current shift above before selecting a new one.
            </p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {error && <p style={{ color: '#ff8a8a', fontSize: '0.75rem', margin: 0 }}>{error}</p>}
              <button
                onClick={onConfirm}
                disabled={saving}
                style={{
                  padding: '0.5rem 1.25rem', borderRadius: '9999px',
                  border: '1px solid rgba(210,57,248,0.5)',
                  background: 'rgba(210,57,248,0.08)',
                  color: '#F3EDE6', cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem', letterSpacing: '0.06em',
                  opacity: saving ? 0.5 : 1, transition: 'all 0.2s',
                }}
              >
                {saving ? 'Saving…' : 'Confirm shift'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Section Wrapper (owns state) ──────────────────────────────────────────────

export function SignupSection({ showPickers = true }: { showPickers?: boolean }) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([])
  const [signup, setSignup] = useState<Signup | null>(null)
  const [shiftSignupOpen, setShiftSignupOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedShift, setSelectedShift] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuggest, setShowSuggest] = useState(false)

  useEffect(() => {
    fetch('/api/signup')
      .then(r => r.json())
      .then(d => {
        setDepartments(d.departments ?? [])
        setScheduleEvents(d.scheduleEvents ?? [])
        setSignup(d.signup ?? null)
        setShiftSignupOpen(d.shiftSignupOpen !== false)
        setSelectedRole(d.signup?.role_id ?? null)
        setSelectedShift(d.signup?.schedule_event_id ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  const hasRoles = departments.some(d => d.roles.length > 0)
  const hasShiftableEvents = scheduleEvents.some(e => e.capacity != null)
  const hasCalendarEvents = scheduleEvents.some(e => CALENDAR_DAYS.some(d => d.day === e.day) && !e.is_recurring)

  const allRoles = departments.flatMap(d => d.roles)
  const selectedRoleObj = allRoles.find(r => r.id === selectedRole) ?? null
  const selectedRoleRequiresApproval = selectedRoleObj?.requires_approval ?? false

  // Approval-required roles can be requested with just a role selection (no shift needed yet)
  const canSave = !!selectedRole

  const selectedShiftEvent = scheduleEvents.find(e => e.id === selectedShift) ?? null

  async function handleCancelShift() {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule_event_id: null }),
    })
    if (!res.ok) return
    setSignup(prev => prev ? { ...prev, schedule_event_id: null } : null)
    setSelectedShift(null)
    setScheduleEvents(prev => prev.map(e => {
      if (e.signed_up == null) return e
      if (e.id === signup?.schedule_event_id) return { ...e, signed_up: Math.max(0, e.signed_up - 1) }
      return e
    }))
  }

  async function handleOptOut() {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: null }),
    })
    if (!res.ok) return
    setSignup(prev => prev ? { ...prev, role_id: null, role_approval_status: null } : null)
    setSelectedRole(null)
    setDepartments(prev => prev.map(d => ({
      ...d,
      roles: d.roles.map(r => {
        if (r.id === signup?.role_id) return { ...r, signed_up: Math.max(0, r.signed_up - 1) }
        return r
      }),
    })))
  }

  async function handleSave() {
    if (!selectedRole || saving) return
    setSaving(true); setError(null)

    const body: Record<string, string | null> = { role_id: selectedRole }
    if (selectedShift) body.schedule_event_id = selectedShift

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Something went wrong'); setSaving(false); return }

    const prevSignup = signup
    const updated: Signup = {
      role_id: selectedRole!,
      schedule_event_id: selectedShift ?? signup?.schedule_event_id ?? null,
      role_approval_status: data.signup?.role_approval_status ?? null,
    }
    setSignup(updated)
    setSaving(false)

    setDepartments(prev => prev.map(d => ({
      ...d,
      roles: d.roles.map(r => {
        if (r.id === selectedRole && r.id !== prevSignup?.role_id) return { ...r, signed_up: r.signed_up + 1 }
        if (r.id === prevSignup?.role_id && r.id !== selectedRole) return { ...r, signed_up: Math.max(0, r.signed_up - 1) }
        return r
      }),
    })))
    setScheduleEvents(prev => prev.map(e => {
      if (e.signed_up == null) return e
      if (e.id === selectedShift && e.id !== prevSignup?.schedule_event_id) return { ...e, signed_up: e.signed_up + 1 }
      if (e.id === prevSignup?.schedule_event_id && e.id !== selectedShift) return { ...e, signed_up: Math.max(0, e.signed_up - 1) }
      return e
    }))
  }

  async function handleSaveShift() {
    if (!selectedShift || saving) return
    setSaving(true); setError(null)
    const prevSignup = signup
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule_event_id: selectedShift }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); setSaving(false); return }
    setSignup(prev => prev
      ? { ...prev, schedule_event_id: selectedShift }
      : { role_id: null, schedule_event_id: selectedShift, role_approval_status: null }
    )
    setScheduleEvents(prev => prev.map(e => {
      if (e.signed_up == null) return e
      if (e.id === selectedShift && e.id !== prevSignup?.schedule_event_id) return { ...e, signed_up: e.signed_up + 1 }
      if (e.id === prevSignup?.schedule_event_id && e.id !== selectedShift) return { ...e, signed_up: Math.max(0, e.signed_up - 1) }
      return e
    }))
    setSaving(false)
  }

  if (loading) return (
    <div id="role-signup" style={{ padding: '1.5rem', border: '1px solid rgba(200,168,72,0.1)', borderRadius: '1rem', background: 'rgba(255,255,255,0.01)', marginBottom: '2.5rem' }}>
      <p style={{ opacity: 0.35, fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>Loading…</p>
    </div>
  )

  if (!hasRoles && !hasCalendarEvents) return null

  return (
    <div id="role-signup" style={{ marginBottom: '2.5rem' }}>
      {showSuggest && <SuggestRoleModal onClose={() => setShowSuggest(false)} />}
      <CurrentSignupCards signup={signup} departments={departments} scheduleEvents={scheduleEvents} onOptOut={handleOptOut} onCancelShift={handleCancelShift} />

      {showPickers && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Role picker — confirm button lives inside the selected role card */}
          {hasRoles && (
            <div style={{ padding: '1.5rem', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '1rem', background: 'rgba(255,255,255,0.01)' }}>
              <RolePicker
                departments={departments}
                selectedRole={selectedRole}
                selectedShiftEvent={selectedShiftEvent}
                signup={signup}
                saving={saving}
                error={error}
                onChange={setSelectedRole}
                onDeselect={() => setSelectedRole(signup?.role_id ?? null)}
                onConfirm={handleSave}
                canConfirm={canSave}
              />
            </div>
          )}

          {/* Suggest a role */}
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <button
              onClick={() => setShowSuggest(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#C8A848', opacity: 0.5, letterSpacing: '0.04em', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Don't see a role that fits? Suggest one →
            </button>
          </div>

          {/* Calendar shift picker — hidden while shift signup is closed */}
          {hasCalendarEvents && shiftSignupOpen && (
            <div style={{ padding: '1.5rem', border: '1px solid rgba(210,57,248,0.15)', borderRadius: '1rem', background: 'rgba(210,57,248,0.02)' }}>
              <ShiftPicker
                scheduleEvents={scheduleEvents}
                selectedShift={selectedShift}
                signup={signup}
                onChange={setSelectedShift}
                onConfirm={handleSaveShift}
                saving={saving}
                error={error}
              />
            </div>
          )}

          {hasCalendarEvents && !shiftSignupOpen && (
            <div style={{ padding: '1.5rem', border: '1px solid rgba(210,57,248,0.15)', borderRadius: '1rem', background: 'rgba(210,57,248,0.02)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.85, marginBottom: '0.5rem' }}>
                Shifts
              </p>
              <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0, lineHeight: 1.6 }}>
                Shift times aren&rsquo;t confirmed yet. Shift signup will open here once the schedule is set — check back soon.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
