'use client'

import { useState, useEffect } from 'react'
import { SuggestRoleModal } from './SuggestRoleModal'
import { isImageIcon } from '@/lib/icon-src'
import { shiftHue } from '@/lib/shift-colors'

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

// A signable shift slot from /api/shift-signups (shifts redesign: a member can
// hold several; hours count toward the shift-type requirements they owe).
type ShiftSlot = {
  id: string
  title: string
  subtitle: string | null
  day: string
  time: string
  event_date: string | null
  duration_hours: number
  capacity: number | null
  signed_up: number
  shift_type_id: string | null
  shift_type_name: string
  shift_type_icon: string | null
  held: boolean
  held_role: 'member' | 'lead' | null
  lead_names: string[]
  // Whether the organizer opted this shift into having a lead role (049) —
  // gates every lead affordance for it.
  needs_lead: boolean
}

// One owed shift-type requirement (derived from groups/roles + universal tasks).
type OwedReq = {
  shiftTypeId: string
  requiredHours: number
  heldHours: number
}

type Signup = {
  role_id: string | null
  schedule_event_id: string | null
  role_approval_status: string | null
}

// Prefer the real date ("Saturday, July 25") when the event carries one; fall
// back to the day name. Replaces the old hardcoded DAY_TO_DATE_LABEL map.
// "1:00 PM – 4:00 PM" → "1–4 PM"; "9:30 PM – 12:00 AM" → "9:30 PM–12 AM".
// Compact form for narrow calendar cards.
function compactTime(time: string): string {
  const parts = time.split(/\s*[–—-]\s*/).map(p => p.trim().replace(/:00\b/g, ''))
  if (parts.length !== 2) return time.replace(/:00\b/g, '')
  const mer = (s: string) => /\b(AM|PM)$/i.exec(s)?.[1]?.toUpperCase() ?? null
  let [a, b] = parts
  if (mer(a) && mer(a) === mer(b)) a = a.replace(/\s*(AM|PM)$/i, '')
  return `${a}–${b}`
}

function shiftDateLabel(s: { event_date: string | null; day: string }): string {
  if (s.event_date) {
    const d = new Date(`${s.event_date}T12:00:00`)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }
  return s.day
}

// ── Current Signup Cards ──────────────────────────────────────────────────────

function CurrentSignupCards({
  signup, departments, heldShifts, shiftTypes, onOptOut, onCancelShift, onSetLead,
}: {
  signup: Signup | null
  departments: Department[]
  heldShifts: ShiftSlot[]
  shiftTypes: ShiftTypeInfo[]
  onOptOut: () => void
  onCancelShift: (id: string) => Promise<void>
  onSetLead: (id: string, lead: boolean) => Promise<void>
}) {
  const [roleExpanded, setRoleExpanded] = useState(false)
  const [optingOut, setOptingOut] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [pendingCancel, setPendingCancel] = useState<ShiftSlot | null>(null)
  const [leadingId, setLeadingId] = useState<string | null>(null)

  const allRoles = departments.flatMap(d => d.roles)
  const role = allRoles.find(r => r.id === signup?.role_id)
  const dept = role ? departments.find(d => d.id === role.department_id) : null

  const hasRoleDetail = role && (role.purpose || role.responsibilities_before || role.responsibilities_during || role.ideal_for || role.commitment || role.commitment_period)

  async function handleOptOut() {
    if (!confirm('Remove your role selection? You can choose a new one below.')) return
    setOptingOut(true)
    await onOptOut()
    setRoleExpanded(false)
    setOptingOut(false)
  }

  async function handleCancelShift(id: string) {
    setPendingCancel(null)
    setCancellingId(id)
    await onCancelShift(id)
    setCancellingId(null)
  }

  async function handleSetLead(s: ShiftSlot) {
    setLeadingId(s.id)
    await onSetLead(s.id, s.held_role !== 'lead')
    setLeadingId(null)
  }

  return (
    <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>

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

      {/* Shifts card — every shift the member holds, each cancellable */}
      <div style={{
        border: '1px solid rgba(210,57,248,0.15)', borderRadius: '0.75rem',
        background: 'rgba(210,57,248,0.02)', overflow: 'hidden',
      }}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.85, margin: '0 0 0.4rem' }}>
            Your Shifts
          </p>
          {heldShifts.length === 0 ? (
            <p style={{ fontSize: '0.85rem', opacity: 0.35, fontStyle: 'italic', margin: 0 }}>None yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {heldShifts.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '0.88rem', color: '#F3EDE6', margin: 0 }}>
                      {s.shift_type_icon && <span style={{ marginRight: '0.3rem' }}>{s.shift_type_icon}</span>}
                      {s.title}
                      {s.held_role === 'lead' && (
                        <span style={{
                          marginLeft: '0.45rem', fontSize: '0.62rem', letterSpacing: '0.08em',
                          textTransform: 'uppercase', color: '#C8A848',
                          border: '1px solid rgba(200,168,72,0.4)', borderRadius: '9999px',
                          padding: '0.08rem 0.45rem', verticalAlign: 'middle',
                        }}>
                          ✦ Lead
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: '#D239F8', opacity: 0.75, margin: '0.15rem 0 0', letterSpacing: '0.04em' }}>
                      {shiftDateLabel(s)}{s.time ? ` · ${s.time}` : ''}{s.duration_hours > 0 ? ` · ${s.duration_hours}h` : ''}
                    </p>
                    {/* Lead affordance only where the organizer asked for a lead
                        (or to step back from one already held). */}
                    {(s.needs_lead || s.held_role === 'lead') && (
                    <button
                      onClick={() => handleSetLead(s)}
                      disabled={leadingId === s.id}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        marginTop: '0.25rem', fontSize: '0.68rem', letterSpacing: '0.04em',
                        color: '#C8A848', opacity: leadingId === s.id ? 0.35 : 0.55,
                        textDecoration: 'underline', textUnderlineOffset: '3px',
                      }}
                    >
                      {leadingId === s.id ? '…' : s.held_role === 'lead' ? 'Step back from lead' : 'Offer to lead ✦'}
                    </button>
                    )}
                  </div>
                  <button
                    onClick={() => setPendingCancel(s)}
                    disabled={cancellingId === s.id}
                    style={{
                      background: 'none', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '9999px',
                      color: '#ff8a8a', cursor: 'pointer', padding: '0.2rem 0.6rem',
                      fontSize: '0.68rem', opacity: cancellingId === s.id ? 0.4 : 0.65,
                      transition: 'opacity 0.15s', flexShrink: 0,
                    }}
                  >
                    {cancellingId === s.id ? '…' : 'Cancel'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {pendingCancel && (
        <ShiftConfirmModal
          slot={pendingCancel}
          action="cancel"
          hue={hueFor(pendingCancel, new Map(shiftTypes.map(t => [t.id, t])))}
          typeName={pendingCancel.shift_type_name}
          onConfirm={() => handleCancelShift(pendingCancel.id)}
          onClose={() => setPendingCancel(null)}
        />
      )}
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
  dept, selectedRole, signup, saving, error, onChange, onDeselect, onConfirm, canConfirm,
}: {
  dept: Department
  selectedRole: string | null
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
                          {role.requires_approval ? (
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
  departments, selectedRole, signup, saving, error, onChange, onDeselect, onConfirm, canConfirm,
}: {
  departments: Department[]
  selectedRole: string | null
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

// ── Shift Calendar Picker ─────────────────────────────────────────────────────
//
// Day columns derived from the shifts' REAL dates (replaces the old hardcoded
// Thu–Sun July grid, keeps the calendar feel — picking by day is easier). Cards
// are coloured by shift type (lib/shift-colors.ts, same palette as the main
// schedule); hours-progress lives in a chip row above the calendar. A member
// can hold any number of shifts: click a card to sign up, click a held card to
// cancel.

type ShiftTypeInfo = { id: string; name: string; icon: string | null; color_index: number }

const UNTYPED_HUE = { rgb: '210,57,248', accent: '#D239F8' }

function hueFor(s: ShiftSlot, typesById: Map<string, ShiftTypeInfo>) {
  const t = s.shift_type_id ? typesById.get(s.shift_type_id) : undefined
  return t ? shiftHue(t.color_index) : UNTYPED_HUE
}

// "2026-07-01" → { short: 'WED', num: 1, month: 'JUL' }
function dateColumnLabel(iso: string): { short: string; num: number; month: string } | null {
  const d = new Date(`${iso}T12:00:00`)
  if (isNaN(d.getTime())) return null
  return {
    short: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    num: d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  }
}

function OwedChips({ owed, shiftTypes }: { owed: OwedReq[]; shiftTypes: ShiftTypeInfo[] }) {
  if (owed.length === 0) return null
  const typesById = new Map(shiftTypes.map(t => [t.id, t]))
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
      {owed.map(o => {
        const t = typesById.get(o.shiftTypeId)
        const hue = t ? shiftHue(t.color_index) : UNTYPED_HUE
        const met = o.heldHours >= o.requiredHours
        return (
          <span key={o.shiftTypeId} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.75rem', borderRadius: '9999px',
            border: `1px solid rgba(${hue.rgb},${met ? 0.55 : 0.4})`,
            background: `rgba(${hue.rgb},${met ? 0.14 : 0.07})`,
            fontSize: '0.72rem', color: hue.accent, letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}>
            {t?.icon && <span>{t.icon}</span>}
            <span>{t?.name ?? 'Shift'}</span>
            <span style={{ opacity: 0.9, fontWeight: 600 }}>{met ? '✓' : `${o.heldHours}/${o.requiredHours}h`}</span>
          </span>
        )
      })}
    </div>
  )
}

function ShiftCard({
  slot, hue, busy, onSignUp, onCancel,
}: {
  slot: ShiftSlot
  hue: { rgb: string; accent: string }
  busy: boolean
  onSignUp: (id: string) => void
  onCancel: (id: string) => void
}) {
  const full = slot.capacity != null && !slot.held && slot.signed_up >= slot.capacity

  const handleClick = () => {
    if (busy) return
    if (slot.held) { onCancel(slot.id); return }
    if (full) return
    onSignUp(slot.id)
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy || (full && !slot.held)}
      style={{
        width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem',
        borderRadius: '0.45rem', display: 'block',
        border: slot.held
          ? `1.5px solid rgba(${hue.rgb},0.95)`
          : full
            ? '1px solid rgba(255,255,255,0.08)'
            : `1px solid rgba(${hue.rgb},0.45)`,
        background: slot.held
          ? `rgba(${hue.rgb},0.22)`
          : full
            ? 'rgba(255,255,255,0.015)'
            : `rgba(${hue.rgb},0.07)`,
        cursor: full && !slot.held ? 'not-allowed' : 'pointer',
        opacity: busy ? 0.55 : 1,
        transition: 'border-color 0.15s, background 0.15s, opacity 0.15s',
      }}
    >
      {slot.time && (
        <p style={{ fontSize: '0.6rem', color: hue.accent, opacity: full ? 0.4 : 0.8, margin: '0 0 0.15rem', letterSpacing: '0.03em', lineHeight: 1.4 }}>
          {compactTime(slot.time)}{slot.duration_hours > 0 ? ` · ${slot.duration_hours}h` : ''}
        </p>
      )}
      <p lang="en" style={{ fontSize: '0.73rem', color: full ? 'rgba(243,237,230,0.4)' : '#F3EDE6', margin: 0, lineHeight: 1.3, overflowWrap: 'break-word', hyphens: 'auto' }}>
        {slot.title}
      </p>
      <p style={{ fontSize: '0.65rem', margin: '0.25rem 0 0', lineHeight: 1.35, overflowWrap: 'break-word', color: slot.held ? '#7dcf8e' : full ? '#ff8a8a' : hue.accent, opacity: slot.held ? 0.95 : full ? 0.8 : 0.7 }}>
        {busy
          ? 'Saving…'
          : slot.held
            ? slot.held_role === 'lead' ? '✦ Leading' : '✓ Signed up'
            : full
              ? 'Full'
              : slot.capacity != null
                ? `${slot.capacity - slot.signed_up} of ${slot.capacity} open`
                : 'Open'}
      </p>
      {slot.lead_names.length > 0 ? (
        <p style={{ fontSize: '0.6rem', margin: '0.2rem 0 0', lineHeight: 1.35, overflowWrap: 'break-word', color: '#C8A848', opacity: 0.65 }}>
          ✦ Led by {slot.lead_names.join(' & ')}
        </p>
      ) : slot.needs_lead && !full ? (
        <p style={{ fontSize: '0.6rem', margin: '0.2rem 0 0', lineHeight: 1.35, color: '#C8A848', opacity: 0.55, fontStyle: 'italic' }}>
          ✦ needs a lead
        </p>
      ) : null}
    </button>
  )
}

// In-app confirmation (replaces the native browser confirm dialog) — a small
// card in the site's language, accented with the shift type's colour.
function ShiftConfirmModal({
  slot, action, hue, typeName, onConfirm, onClose,
}: {
  slot: ShiftSlot
  action: 'signup' | 'cancel'
  hue: { rgb: string; accent: string }
  typeName: string
  onConfirm: (lead: boolean) => void
  onClose: () => void
}) {
  const isCancel = action === 'cancel'
  // Lead opt-in at the moment of signup — only offered when the organizer
  // marked this shift as having a lead role, and nobody holds it yet.
  const offerLead = !isCancel && slot.needs_lead && slot.lead_names.length === 0
  const [wantsLead, setWantsLead] = useState(false)
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 61,
        background: '#1A0A24', border: `1px solid rgba(${hue.rgb},0.45)`, borderRadius: '1rem',
        padding: '1.6rem 1.75rem', width: '90%', maxWidth: '380px',
        boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(${hue.rgb},0.12)`,
      }}>
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: hue.accent, opacity: 0.85, margin: '0 0 0.6rem' }}>
          {slot.shift_type_icon && <span style={{ marginRight: '0.35rem' }}>{slot.shift_type_icon}</span>}
          {isCancel ? `Cancel ${typeName} shift?` : `${typeName} shift`}
        </p>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.2rem', color: '#F3EDE6', margin: '0 0 0.35rem', lineHeight: 1.3 }}>
          {slot.title}
        </p>
        <p style={{ fontSize: '0.8rem', color: hue.accent, opacity: 0.85, margin: 0, letterSpacing: '0.03em' }}>
          {shiftDateLabel(slot)}
          {slot.time ? ` · ${slot.time}` : ''}
          {slot.duration_hours > 0 ? ` · ${slot.duration_hours}h` : ''}
        </p>
        {!isCancel && slot.capacity != null && (
          <p style={{ fontSize: '0.72rem', opacity: 0.45, margin: '0.4rem 0 0' }}>
            {slot.capacity - slot.signed_up} of {slot.capacity} spots open
          </p>
        )}
        {offerLead && (
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer',
            marginTop: '1rem', padding: '0.7rem 0.85rem', borderRadius: '0.6rem',
            border: '1px solid rgba(200,168,72,0.3)', background: 'rgba(200,168,72,0.06)',
            userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={wantsLead}
              onChange={e => setWantsLead(e.target.checked)}
              style={{ marginTop: '0.15rem', accentColor: '#C8A848', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.82rem', color: '#F3EDE6', opacity: 0.85, lineHeight: 1.5 }}>
              I&rsquo;d like to be the shift lead ✦
              <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.55, marginTop: '0.15rem' }}>
                This shift is looking for someone to steer it.
              </span>
            </span>
          </label>
        )}
        {!isCancel && slot.needs_lead && slot.lead_names.length > 0 && (
          <p style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.6, margin: '0.6rem 0 0' }}>
            ✦ Led by {slot.lead_names.join(' & ')}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.4rem' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1.1rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.7 }}
          >
            Never mind
          </button>
          <button
            onClick={() => onConfirm(wantsLead)}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '9999px', cursor: 'pointer',
              fontSize: '0.8rem', letterSpacing: '0.05em', color: '#F3EDE6',
              border: isCancel ? '1px solid rgba(255,80,80,0.45)' : `1px solid rgba(${hue.rgb},0.55)`,
              background: isCancel ? 'rgba(255,80,80,0.1)' : `rgba(${hue.rgb},0.14)`,
            }}
          >
            {isCancel ? 'Cancel shift' : 'Sign up'}
          </button>
        </div>
      </div>
    </>
  )
}

function ShiftsPicker({
  shifts, owed, shiftTypes, signingId, error, onSignUp, onCancel,
}: {
  shifts: ShiftSlot[]
  owed: OwedReq[]
  shiftTypes: ShiftTypeInfo[]
  signingId: string | null
  error: string | null
  onSignUp: (id: string, lead: boolean) => void
  onCancel: (id: string) => void
}) {
  const [pending, setPending] = useState<{ slot: ShiftSlot; action: 'signup' | 'cancel' } | null>(null)

  if (shifts.length === 0) return null

  const typesById = new Map(shiftTypes.map(t => [t.id, t]))

  // Day columns from the shifts' real dates (dated first, then a TBD column).
  const byDate = new Map<string, ShiftSlot[]>()
  for (const s of shifts) {
    const key = s.event_date ?? 'tbd'
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(s)
  }
  const columns = Array.from(byDate.entries()).sort(([a], [b]) => {
    if (a === 'tbd') return 1
    if (b === 'tbd') return -1
    return a.localeCompare(b)
  })

  const owedOutstanding = owed.filter(o => o.heldHours < o.requiredHours).length
  const confirmSignUp = (id: string) => {
    const s = shifts.find(x => x.id === id)
    if (s) setPending({ slot: s, action: 'signup' })
  }
  const confirmCancel = (id: string) => {
    const s = shifts.find(x => x.id === id)
    if (s) setPending({ slot: s, action: 'cancel' })
  }

  return (
    <div>
      <p style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.85, marginBottom: '0.5rem', textAlign: 'center' }}>
        Shifts
      </p>
      <p style={{ fontSize: '0.78rem', opacity: 0.55, textAlign: 'center', margin: '0 0 1rem', lineHeight: 1.6 }}>
        {owedOutstanding > 0
          ? 'Sign up for shifts until each requirement below is met. You can hold several — tap a shift to sign up.'
          : owed.length > 0
            ? 'Your shift requirements are met — you can still pick up extra shifts.'
            : 'Tap a shift to sign up for it.'}
      </p>

      <OwedChips owed={owed} shiftTypes={shiftTypes} />

      {error && <p style={{ color: '#ff8a8a', fontSize: '0.78rem', textAlign: 'center', margin: '0 0 1rem' }}>{error}</p>}

      {/* Mobile-first: days stack vertically with a compact inline date bar and
          full-width cards. From 640px up, the days sit side by side in ONE row
          (no scroll, no wrap) so the whole event span reads as a calendar. */}
      <style>{`
        .shift-cal { display: flex; flex-direction: column; gap: 0.75rem; }
        .shift-cal-day { display: flex; flex-direction: column; min-width: 0; }
        .shift-cal-head { display: flex; align-items: baseline; gap: 0.45rem; padding: 0.5rem 0.8rem; border-radius: 0.6rem 0.6rem 0 0; background: rgba(210,57,248,0.08); border: 1px solid rgba(210,57,248,0.18); border-bottom: none; }
        .shift-cal-head-num { font-size: 1rem; color: #F3EDE6; margin: 0; font-family: TokyoDreams, serif; }
        .shift-cal-head-label { font-size: 0.6rem; letter-spacing: 0.12em; text-transform: uppercase; color: #D239F8; opacity: 0.7; margin: 0; }
        .shift-cal-body { flex: 1; padding: 0.6rem; border: 1px solid rgba(210,57,248,0.12); border-radius: 0 0 0.6rem 0.6rem; background: rgba(255,255,255,0.01); display: flex; flex-direction: column; gap: 0.4rem; }
        @media (min-width: 640px) {
          .shift-cal { display: grid; grid-template-columns: repeat(${columns.length}, minmax(0, 1fr)); gap: 0.5rem; }
          .shift-cal-head { display: block; text-align: center; padding: 0.55rem 0.4rem; }
          .shift-cal-head-num { margin-top: 0.1rem; }
          /* Let the calendar panel break out of the narrow text column so the
             day columns get real width on desktop (centered over the viewport). */
          .shift-panel-breakout { width: min(1150px, calc(100vw - 3rem)); margin-left: calc((100% - min(1150px, calc(100vw - 3rem))) / 2); }
        }
      `}</style>
      <div className="shift-cal">
        {columns.map(([key, slots]) => {
          const label = key === 'tbd' ? null : dateColumnLabel(key)
          return (
            <div key={key} className="shift-cal-day">
              <div className="shift-cal-head">
                <p className="shift-cal-head-label">
                  {label ? `${label.short} · ${label.month}` : slots[0]?.day?.slice(0, 3).toUpperCase() ?? 'TBD'}
                </p>
                <p className="shift-cal-head-num">{label ? label.num : '—'}</p>
              </div>
              <div className="shift-cal-body">
                {slots.map(s => (
                  <ShiftCard
                    key={s.id}
                    slot={s}
                    hue={hueFor(s, typesById)}
                    busy={signingId === s.id}
                    onSignUp={confirmSignUp}
                    onCancel={confirmCancel}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Type legend */}
      {shiftTypes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1rem', justifyContent: 'center', marginTop: '1rem' }}>
          {shiftTypes.filter(t => shifts.some(s => s.shift_type_id === t.id)).map(t => {
            const hue = shiftHue(t.color_index)
            return (
              <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', opacity: 0.6, letterSpacing: '0.05em' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: hue.accent, display: 'inline-block' }} />
                {t.name}
              </span>
            )
          })}
        </div>
      )}

      {/* Confirmation modal */}
      {pending && (
        <ShiftConfirmModal
          slot={pending.slot}
          action={pending.action}
          hue={hueFor(pending.slot, typesById)}
          typeName={pending.slot.shift_type_name}
          onConfirm={(lead) => {
            const { slot, action } = pending
            setPending(null)
            if (action === 'signup') onSignUp(slot.id, lead)
            else onCancel(slot.id)
          }}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  )
}


// ── Section Wrapper (owns state) ──────────────────────────────────────────────

export function SignupSection({ showPickers = true }: { showPickers?: boolean }) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [signup, setSignup] = useState<Signup | null>(null)
  const [shifts, setShifts] = useState<ShiftSlot[]>([])
  const [owed, setOwed] = useState<OwedReq[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeInfo[]>([])
  const [shiftSignupOpen, setShiftSignupOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [signingId, setSigningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shiftError, setShiftError] = useState<string | null>(null)
  const [showSuggest, setShowSuggest] = useState(false)

  // Roles come from the legacy /api/signup; shifts from the many-to-many
  // /api/shift-signups (owed requirements + held slots + hours).
  useEffect(() => {
    Promise.all([
      fetch('/api/signup').then(r => r.json()),
      fetch('/api/shift-signups').then(r => r.json()),
    ])
      .then(([roleData, shiftData]) => {
        setDepartments(roleData.departments ?? [])
        setSignup(roleData.signup ?? null)
        setSelectedRole(roleData.signup?.role_id ?? null)
        setShifts(shiftData.shifts ?? [])
        setOwed(shiftData.owed ?? [])
        setShiftTypes(shiftData.shiftTypes ?? [])
        setShiftSignupOpen(shiftData.shiftSignupOpen !== false)
      })
      .finally(() => setLoading(false))
  }, [])

  const hasRoles = departments.some(d => d.roles.length > 0)
  const heldShifts = shifts.filter(s => s.held)

  // Re-pull shifts + owed after any signup change so counts, hours, and
  // requirement progress stay exact (cheaper than mirroring the math locally).
  async function refreshShifts() {
    try {
      const d = await fetch('/api/shift-signups').then(r => r.json())
      setShifts(d.shifts ?? [])
      setOwed(d.owed ?? [])
      setShiftTypes(d.shiftTypes ?? [])
    } catch { /* keep current state */ }
  }

  async function handleSignUpShift(id: string, lead = false) {
    if (signingId) return
    setSigningId(id); setShiftError(null)
    const res = await fetch('/api/shift-signups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule_event_id: id, ...(lead ? { role: 'lead' } : {}) }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setShiftError(data.error ?? 'Something went wrong')
    } else {
      await refreshShifts()
    }
    setSigningId(null)
  }

  async function handleCancelShift(id: string) {
    setSigningId(id); setShiftError(null)
    const res = await fetch(`/api/shift-signups?schedule_event_id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setShiftError(data.error ?? 'Something went wrong')
    } else {
      await refreshShifts()
    }
    setSigningId(null)
  }

  // Offer to lead / step back on a shift the member already holds — the same
  // POST as signup with an explicit role; the upsert flips the row in place.
  async function handleSetLeadShift(id: string, lead: boolean) {
    setShiftError(null)
    const res = await fetch('/api/shift-signups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule_event_id: id, role: lead ? 'lead' : 'member' }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setShiftError(data.error ?? 'Something went wrong')
    } else {
      await refreshShifts()
    }
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

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: selectedRole }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Something went wrong'); setSaving(false); return }

    const prevSignup = signup
    const updated: Signup = {
      role_id: selectedRole!,
      schedule_event_id: signup?.schedule_event_id ?? null,
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
  }

  if (loading) return (
    <div id="role-signup" style={{ padding: '1.5rem', border: '1px solid rgba(200,168,72,0.1)', borderRadius: '1rem', background: 'rgba(255,255,255,0.01)', marginBottom: '2.5rem' }}>
      <p style={{ opacity: 0.35, fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>Loading…</p>
    </div>
  )

  if (!hasRoles && shifts.length === 0) return null

  return (
    <div id="role-signup" style={{ marginBottom: '2.5rem' }}>
      {showSuggest && <SuggestRoleModal onClose={() => setShowSuggest(false)} />}
      <CurrentSignupCards signup={signup} departments={departments} heldShifts={heldShifts} shiftTypes={shiftTypes} onOptOut={handleOptOut} onCancelShift={handleCancelShift} onSetLead={handleSetLeadShift} />

      {showPickers && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Role picker — confirm button lives inside the selected role card */}
          {hasRoles && (
            <div style={{ padding: '1.5rem', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '1rem', background: 'rgba(255,255,255,0.01)' }}>
              <RolePicker
                departments={departments}
                selectedRole={selectedRole}
                signup={signup}
                saving={saving}
                error={error}
                onChange={setSelectedRole}
                onDeselect={() => setSelectedRole(signup?.role_id ?? null)}
                onConfirm={handleSave}
                canConfirm={!!selectedRole}
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

          {/* Shift picker — hidden while shift signup is closed */}
          {shifts.length > 0 && shiftSignupOpen && (
            <div className="shift-panel-breakout" style={{ padding: '1.5rem', border: '1px solid rgba(210,57,248,0.15)', borderRadius: '1rem', background: 'rgba(210,57,248,0.02)' }}>
              <ShiftsPicker
                shifts={shifts}
                owed={owed}
                shiftTypes={shiftTypes}
                signingId={signingId}
                error={shiftError}
                onSignUp={handleSignUpShift}
                onCancel={handleCancelShift}
              />
            </div>
          )}

          {shifts.length > 0 && !shiftSignupOpen && (
            <div style={{ padding: '1.5rem', border: '1px solid rgba(210,57,248,0.15)', borderRadius: '1rem', background: 'rgba(210,57,248,0.02)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.85, marginBottom: '0.5rem' }}>
                Shifts
              </p>
              <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0, lineHeight: 1.6 }}>
                Shift times aren't confirmed yet. Shift signup will open here once the schedule is set — check back soon.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
