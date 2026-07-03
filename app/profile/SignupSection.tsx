'use client'

import { useState, useEffect } from 'react'
import { IconImage } from '@/components/IconImage'
import { SuggestRoleModal } from './SuggestRoleModal'
import { isImageIcon } from '@/lib/icon-src'
import { roleSlug } from '@/lib/role-slug'
import { shiftHue } from '@/lib/shift-colors'
import { useConfirm } from '../components/ConfirmDialog'

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
  const { confirm, confirmDialog } = useConfirm()

  const allRoles = departments.flatMap(d => d.roles)
  const role = allRoles.find(r => r.id === signup?.role_id)
  const dept = role ? departments.find(d => d.id === role.department_id) : null

  const hasRoleDetail = role && (role.purpose || role.responsibilities_before || role.responsibilities_during || role.ideal_for || role.commitment || role.commitment_period)

  async function handleOptOut() {
    const ok = await confirm({
      title: `Remove your role selection${role ? ` (“${role.name}”)` : ''}?`,
      body: 'You can choose a new one below.',
      confirmLabel: 'Remove role',
      danger: true,
    })
    if (!ok) return
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

      {/* Role card — the member's standing, drawn as an engraved PLAQUE: a
          double rule (border + inset outline) + centered kicker between
          hairlines. A different species from the single-hairline list cards
          below — distinct by construction, not by glow. */}
      <div style={{
        border: '1px solid rgba(200,168,72,0.35)', borderRadius: '0.85rem',
        outline: '1px solid rgba(200,168,72,0.14)', outlineOffset: '-5px',
        background: '#231132',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>
        <button
          onClick={() => role && setRoleExpanded(o => !o)}
          style={{ width: '100%', textAlign: 'left', padding: '1.1rem 1.35rem', background: 'none', border: 'none', cursor: role ? 'pointer' : 'default', display: 'block' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 0.9rem', position: 'relative' }}>
            <span aria-hidden style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.4))' }} />
            <p style={{ fontSize: '0.66rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.9, margin: 0, whiteSpace: 'nowrap' }}>
              ✦ Your Role ✦
            </p>
            <span aria-hidden style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.4), transparent)' }} />
            {role && (
              <span style={{ position: 'absolute', right: 0, top: '-0.15rem', fontSize: '0.6rem', color: '#C8A848', opacity: 0.45 }}>
                {roleExpanded ? '▲' : '▼'}
              </span>
            )}
          </div>
          {role ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {/* Department emblem in a brass ring (matches the profile designation) */}
              <div style={{
                width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                border: '1.5px solid #C8A848',
                background: 'radial-gradient(circle at 42% 38%, rgba(200,168,72,0.18), rgba(8,0,18,0.85))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {dept?.icon && (isImageIcon(dept.icon)
                  ? <IconImage src={dept.icon} size="92%" fill={0.8} opacity={0.92} />
                  : <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{dept?.icon ?? '✦'}</span>)}
              </div>
              <div style={{ minWidth: 0 }}>
                {dept && (
                  <p style={{ fontSize: '0.66rem', color: '#C8A848', opacity: 0.7, margin: '0 0 0.15rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    {dept.name}
                  </p>
                )}
                <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.2rem', color: '#F3EDE6', margin: 0, lineHeight: 1.2 }}>{role.name}</p>
                {(role.commitment || role.commitment_period) && (
                  <div style={{ marginTop: '0.4rem' }}><CommitmentPill commitment={role.commitment} period={role.commitment_period} /></div>
                )}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', opacity: 0.35, fontStyle: 'italic', margin: 0 }}>Not chosen — pick one below</p>
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
            <div style={{ padding: '0.75rem 1.25rem', borderTop: hasRoleDetail ? '1px solid rgba(200,168,72,0.08)' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={handleOptOut} disabled={optingOut} style={{ background: 'none', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '9999px', color: '#ff8a8a', cursor: 'pointer', padding: '0.35rem 0.85rem', fontSize: '0.75rem', opacity: optingOut ? 0.4 : 0.75 }}>
                {optingOut ? 'Removing…' : 'Opt out of this role'}
              </button>
              <a href={`/roles#${roleSlug(role.name)}`} style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.6, letterSpacing: '0.04em', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                View in the Registry →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Shifts card — the matching plaque in the shift accent; every held
          shift listed, each cancellable. */}
      <div style={{
        border: '1px solid rgba(210,57,248,0.3)', borderRadius: '0.85rem',
        outline: '1px solid rgba(210,57,248,0.12)', outlineOffset: '-5px',
        background: '#231132',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1.1rem 1.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 0.9rem' }}>
            <span aria-hidden style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(210,57,248,0.4))' }} />
            <p style={{ fontSize: '0.66rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.9, margin: 0, whiteSpace: 'nowrap' }}>
              ✦ Your Shifts ✦
            </p>
            <span aria-hidden style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(210,57,248,0.4), transparent)' }} />
          </div>
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

      {confirmDialog}
    </div>
  )
}

// ── Commitment Pill ───────────────────────────────────────────────────────────
// Colour-scaled in the pickers/registry where it informs choosing; the profile
// designation deliberately carries no pill (read harsh there).

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

// ── Role Card (compact, scannable) ─────────────────────────────────────────────
//
// Expanded, the picker shows every role at once — department headers + compact
// cards in a grid, no accordions within. Clicking a card opens the full charge
// in a modal where the confirm lives. Deep reading happens on /roles (the
// Registry). The picker as a whole starts collapsed once a role is held (the
// full registry is long and buried the rest of /participate).

function RoleCard({ role, isCurrent, isPending, onOpen }: {
  role: Role
  isCurrent: boolean
  isPending: boolean
  onOpen: (id: string) => void
}) {
  const full = role.signed_up >= role.capacity && !isCurrent
  return (
    <button
      onClick={() => onOpen(role.id)}
      style={{
        textAlign: 'left', padding: '0.75rem 0.9rem', borderRadius: '0.6rem',
        border: `1px solid rgba(200,168,72,${isCurrent ? 0.45 : 0.12})`,
        background: isCurrent ? 'rgba(200,168,72,0.06)' : full ? 'transparent' : 'rgba(255,255,255,0.02)',
        cursor: 'pointer', opacity: full ? 0.5 : 1, display: 'block', width: '100%',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.87rem', color: '#F3EDE6', margin: 0, minWidth: 0 }}>
          {isCurrent && <span aria-hidden style={{ color: '#C8A848', marginRight: '0.35rem' }}>✦</span>}
          {role.name}
        </p>
        <span style={{
          fontSize: '0.65rem', whiteSpace: 'nowrap', flexShrink: 0,
          color: isPending ? '#D239F8' : isCurrent ? '#7dcf8e' : full ? '#ff8a8a' : '#C8A848',
          opacity: isCurrent || isPending ? 0.9 : full ? 0.8 : 0.55,
        }}>
          {isPending ? 'pending approval' : isCurrent ? 'your role' : full ? 'Full' : `${role.capacity - role.signed_up} open`}
        </span>
      </div>
      {role.description && (
        <p style={{
          fontSize: '0.73rem', opacity: 0.5, margin: '0.25rem 0 0', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {role.description}
        </p>
      )}
      {(role.commitment || role.commitment_period || role.requires_approval) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.45rem' }}>
          <CommitmentPill commitment={role.commitment} period={role.commitment_period} />
          {role.requires_approval && (
            <span style={{ fontSize: '0.62rem', opacity: 0.45 }} title="Requires admin approval">🔒</span>
          )}
        </div>
      )}
    </button>
  )
}

// ── Role Detail Modal (full charge + confirm) ──────────────────────────────────

function RoleDetailModal({ role, dept, signup, saving, error, onConfirm, onClose }: {
  role: Role
  dept: Department | null
  signup: Signup | null
  saving: boolean
  error: string | null
  onConfirm: () => Promise<boolean>
  onClose: () => void
}) {
  const isCurrent = signup?.role_id === role.id
  const isPending = isCurrent && signup?.role_approval_status === 'pending'
  const full = role.signed_up >= role.capacity && !isCurrent

  async function handleConfirm() {
    const ok = await onConfirm()
    if (ok) onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 61,
        background: '#1A0A24', border: '1px solid rgba(200,168,72,0.4)', borderRadius: '1rem',
        width: '92%', maxWidth: '540px', maxHeight: '82vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(200,168,72,0.1)',
      }}>
        {/* Header */}
        <div style={{ padding: '1.4rem 1.6rem 0.9rem', borderBottom: '1px solid rgba(200,168,72,0.12)' }}>
          {dept && (
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.7, margin: '0 0 0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {dept.icon && (isImageIcon(dept.icon)
                ? <IconImage src={dept.icon} size="1rem" fill={0.92} />
                : <span style={{ fontSize: '0.9rem' }}>{dept.icon}</span>)}
              {dept.name}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.35rem', color: '#F3EDE6', margin: 0, lineHeight: 1.25 }}>
              {role.name}
            </p>
            <span style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', color: isPending ? '#D239F8' : isCurrent ? '#7dcf8e' : full ? '#ff8a8a' : '#C8A848', opacity: 0.85 }}>
              {isPending ? 'pending approval' : isCurrent ? '✦ your role' : full ? 'Full' : `${role.capacity - role.signed_up} of ${role.capacity} open`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <CommitmentPill commitment={role.commitment} period={role.commitment_period} />
            <a
              href={`/roles#${roleSlug(role.name)}`}
              style={{ fontSize: '0.68rem', color: '#C8A848', opacity: 0.6, letterSpacing: '0.04em', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              View in the Registry →
            </a>
          </div>
        </div>

        {/* Scrollable charge */}
        <div style={{ padding: '1rem 1.6rem', overflowY: 'auto', flex: 1 }}>
          {role.purpose && <div style={{ marginBottom: '0.9rem' }}><p style={{ fontSize: '0.63rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>Purpose</p><p style={{ fontSize: '0.84rem', lineHeight: 1.7, opacity: 0.75, margin: 0 }}>{role.purpose}</p></div>}
          {!role.purpose && role.description && <p style={{ fontSize: '0.84rem', lineHeight: 1.7, opacity: 0.75, margin: '0 0 0.9rem' }}>{role.description}</p>}
          {role.responsibilities_before && (
            <div style={{ marginBottom: '0.9rem' }}>
              <p style={{ fontSize: '0.63rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>Before Event</p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {role.responsibilities_before.split('\n').filter(Boolean).map((line, i) => (
                  <li key={i} style={{ fontSize: '0.82rem', lineHeight: 1.7, opacity: 0.72 }}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {role.responsibilities_during && (
            <div style={{ marginBottom: '0.9rem' }}>
              <p style={{ fontSize: '0.63rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>During Event</p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {role.responsibilities_during.split('\n').filter(Boolean).map((line, i) => (
                  <li key={i} style={{ fontSize: '0.82rem', lineHeight: 1.7, opacity: 0.72 }}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {role.ideal_for && (
            <div>
              <p style={{ fontSize: '0.63rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.3rem' }}>Ideal For</p>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.7, opacity: 0.72, fontStyle: 'italic', margin: 0 }}>{role.ideal_for}</p>
            </div>
          )}
        </div>

        {/* Footer — confirm / status */}
        <div style={{ padding: '0.9rem 1.6rem 1.2rem', borderTop: '1px solid rgba(200,168,72,0.12)', background: 'rgba(200,168,72,0.03)', borderRadius: '0 0 1rem 1rem' }}>
          {role.requires_approval && !isCurrent && !full && (
            <p style={{ fontSize: '0.75rem', color: '#D239F8', opacity: 0.85, margin: '0 0 0.7rem', lineHeight: 1.5 }}>
              This role requires admin approval — your request will be reviewed before it&rsquo;s confirmed.
            </p>
          )}
          {error && <p style={{ color: '#ff8a8a', fontSize: '0.75rem', margin: '0 0 0.7rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              onClick={onClose}
              style={{ padding: '0.5rem 1.1rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.7 }}
            >
              {isCurrent || full ? 'Close' : 'Never mind'}
            </button>
            {!isCurrent && !full && (
              <button
                onClick={handleConfirm}
                disabled={saving}
                style={{
                  padding: '0.5rem 1.25rem', borderRadius: '9999px',
                  border: '1px solid rgba(200,168,72,0.5)', background: 'rgba(200,168,72,0.1)',
                  color: '#FFFACD', cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem', letterSpacing: '0.05em', opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving…' : role.requires_approval ? 'Request Role' : signup?.role_id ? 'Switch to this role' : 'Confirm'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Role Picker (flat registry — every role visible) ───────────────────────────

function RolePicker({
  departments, signup, saving, error, onChange, onDeselect, onConfirm,
}: {
  departments: Department[]
  signup: Signup | null
  saving: boolean
  error: string | null
  onChange: (id: string) => void
  onDeselect: () => void
  onConfirm: () => Promise<boolean>
}) {
  const [openRoleId, setOpenRoleId] = useState<string | null>(null)
  // Starts collapsed once a role is held — expanded, the registry runs long and
  // buried the rest of /participate (shifts, resources, groups). A member who
  // hasn't chosen yet lands with it open: picking is their next step.
  const [expanded, setExpanded] = useState(signup?.role_id == null)

  // Opting out (in the plaque above) promises "choose a new one below" — make
  // that true by unfolding when the held role goes away.
  useEffect(() => {
    if (!signup?.role_id) setExpanded(true)
  }, [signup?.role_id])

  const withRoles = departments.filter(d => d.roles.length > 0)
  if (withRoles.length === 0) return null

  const allRoles = withRoles.flatMap(d => d.roles)
  const openRole = allRoles.find(r => r.id === openRoleId) ?? null
  const openDept = openRole ? withRoles.find(d => d.id === openRole.department_id) ?? null : null

  function handleOpen(id: string) {
    onChange(id) // stage the selection; confirm happens in the modal
    setOpenRoleId(id)
  }

  function handleClose() {
    onDeselect()
    setOpenRoleId(null)
  }

  // Once a claim lands, fold the registry back down — the plaque above now
  // carries the role, and the rest of the page comes back into view.
  async function handleConfirm() {
    const ok = await onConfirm()
    if (ok) setExpanded(false)
    return ok
  }

  return (
    <div>
      {/* Collapsed — not a hidden door but a sealed one: every department's
          emblem on display (the same brass rings as the plaques) so the folded
          registry still shows what it holds, with the browse pill beneath. */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          style={{ display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0', textAlign: 'center' }}
        >
          {/* Seal sizes step down on narrow screens so a full row of
              departments still wraps cleanly at phone width. */}
          <style>{`
            .role-seal-strip { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem 1.1rem; margin-bottom: 1.4rem; }
            .role-seal { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 90px; }
            .role-seal-ring { width: 56px; height: 56px; border-radius: 50%; border: 1.5px solid #C8A848; background: radial-gradient(circle at 42% 38%, rgba(200,168,72,0.18), rgba(8,0,18,0.85)); display: flex; align-items: center; justify-content: center; }
            .role-seal-ring .role-seal-emoji { font-size: 1.5rem; line-height: 1; }
            @media (min-width: 560px) {
              .role-seal { width: 108px; }
              .role-seal-ring { width: 68px; height: 68px; }
              .role-seal-ring .role-seal-emoji { font-size: 1.85rem; }
            }
          `}</style>
          <div className="role-seal-strip">
            {withRoles.map(dept => (
              <span key={dept.id} className="role-seal">
                <span className="role-seal-ring">
                  {dept.icon && isImageIcon(dept.icon)
                    ? <IconImage src={dept.icon} size="92%" fill={0.8} opacity={0.92} />
                    : <span className="role-seal-emoji">{dept.icon ?? '✦'}</span>}
                </span>
                <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, lineHeight: 1.3 }}>
                  {dept.name}
                </span>
              </span>
            ))}
          </div>
          <span style={{
            display: 'inline-block', padding: '0.5rem 1.3rem', borderRadius: '9999px',
            border: '1px solid rgba(200,168,72,0.5)', background: 'rgba(200,168,72,0.1)',
            color: '#FFFACD', fontSize: '0.8rem', letterSpacing: '0.05em',
          }}>
            Browse all {allRoles.length} roles ▾
          </span>
        </button>
      )}

      {expanded && (<>
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setExpanded(false)}
          aria-expanded={true}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#C8A848', opacity: 0.55, letterSpacing: '0.06em', textDecoration: 'underline', textUnderlineOffset: '3px' }}
        >
          Fold the registry away ▴
        </button>
      </div>

      <style>{`
        .role-grid { display: grid; grid-template-columns: 1fr; gap: 0.55rem; }
        @media (min-width: 560px) { .role-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.75rem' }}>
        {withRoles.map(dept => (
          <div key={dept.id}>
            {/* Department header — a heading, not a gate. TokyoDreams + real air
                between groups so departments read as distinct sections. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: dept.description ? '0.35rem' : '0.85rem' }}>
              {dept.icon && (isImageIcon(dept.icon)
                ? <IconImage src={dept.icon} size="1.7rem" fill={0.85} />
                : <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{dept.icon}</span>)}
              <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.2rem', color: '#C8A848', margin: 0, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                {dept.name}
              </p>
              <span aria-hidden style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.35), transparent)' }} />
                <span style={{ color: '#C8A848', fontSize: '0.5rem', opacity: 0.6, lineHeight: 1 }}>✦</span>
              </span>
            </div>
            {dept.description && (
              <p style={{ fontSize: '0.76rem', opacity: 0.45, margin: '0 0 0.85rem', lineHeight: 1.5 }}>{dept.description}</p>
            )}
            <div className="role-grid">
              {dept.roles.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  isCurrent={signup?.role_id === role.id}
                  isPending={signup?.role_id === role.id && signup?.role_approval_status === 'pending'}
                  onOpen={handleOpen}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      </>)}

      {openRole && (
        <RoleDetailModal
          role={openRole}
          dept={openDept}
          signup={signup}
          saving={saving}
          error={error}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
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

// Server-rendered pages pass the same shapes /api/signup and /api/shift-signups
// return, assembled via lib/participate-data.ts — the section then renders with
// its data already in place and skips the fetch-after-hydration round-trip.
export type SignupInitialData = {
  role: { departments: Department[]; signup: Signup | null }
  shifts: { shifts: ShiftSlot[]; owed: OwedReq[]; shiftTypes: ShiftTypeInfo[]; shiftSignupOpen: boolean }
}

export function SignupSection({ showPickers = true, initialData }: { showPickers?: boolean; initialData?: SignupInitialData }) {
  const [departments, setDepartments] = useState<Department[]>(initialData?.role.departments ?? [])
  const [signup, setSignup] = useState<Signup | null>(initialData?.role.signup ?? null)
  const [shifts, setShifts] = useState<ShiftSlot[]>(initialData?.shifts.shifts ?? [])
  const [owed, setOwed] = useState<OwedReq[]>(initialData?.shifts.owed ?? [])
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeInfo[]>(initialData?.shifts.shiftTypes ?? [])
  const [shiftSignupOpen, setShiftSignupOpen] = useState(initialData ? initialData.shifts.shiftSignupOpen !== false : true)
  const [loading, setLoading] = useState(!initialData)

  const [selectedRole, setSelectedRole] = useState<string | null>(initialData?.role.signup?.role_id ?? null)
  const [saving, setSaving] = useState(false)
  const [signingId, setSigningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shiftError, setShiftError] = useState<string | null>(null)
  const [showSuggest, setShowSuggest] = useState(false)

  // Roles come from the legacy /api/signup; shifts from the many-to-many
  // /api/shift-signups (owed requirements + held slots + hours). Skipped when
  // the server already rendered the section with initialData.
  useEffect(() => {
    if (initialData) return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Returns true on success so the detail modal knows it can close.
  async function handleSave(): Promise<boolean> {
    if (!selectedRole || saving) return false
    setSaving(true); setError(null)

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: selectedRole }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Something went wrong'); setSaving(false); return false }

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
    return true
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

      {showPickers && (<>
        {/* Choose a Role — a full page section, headed like Shifts / Bring
            Something below, so the folded registry can't be scrolled past. */}
        {hasRoles && (
          <>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.25), transparent)', margin: '3rem 0 2rem' }} />
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#C8A848', margin: '0 0 0.5rem', letterSpacing: '0.06em' }}>
                Choose a Role
              </h2>
              <p style={{ fontSize: '0.9rem', opacity: 0.55, margin: 0, lineHeight: 1.6 }}>
                Tap a role to read its full charge and claim it. Or browse the{' '}
                <a href="/roles" style={{ color: '#C8A848', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  Registry of Roles
                </a>{' '}
                for the complete record.
              </p>
            </div>

            <div style={{ padding: '1.5rem', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '1rem', background: 'rgba(255,255,255,0.01)' }}>
              <RolePicker
                departments={departments}
                signup={signup}
                saving={saving}
                error={error}
                onChange={setSelectedRole}
                onDeselect={() => setSelectedRole(signup?.role_id ?? null)}
                onConfirm={handleSave}
              />
            </div>

            {/* Suggest a role */}
            <div style={{ textAlign: 'center', padding: '0.5rem 0', marginTop: '1.25rem' }}>
              <button
                onClick={() => setShowSuggest(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#C8A848', opacity: 0.5, letterSpacing: '0.04em', textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                Don't see a role that fits? Suggest one →
              </button>
            </div>
          </>
        )}

        {/* Shifts — a full page section, headed exactly like Bring Something /
            Your Groups on /participate (gold divider + TokyoDreams h2); the
            purple shift accent stays on the calendar panel itself. */}
        {shifts.length > 0 && (
          <>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.25), transparent)', margin: '3rem 0 2rem' }} />
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#C8A848', margin: '0 0 0.5rem', letterSpacing: '0.06em' }}>
                Shifts
              </h2>
              <p style={{ fontSize: '0.9rem', opacity: 0.55, margin: 0, lineHeight: 1.6 }}>
                {!shiftSignupOpen
                  ? 'Shift times aren’t confirmed yet. Shift signup will open here once the schedule is set — check back soon.'
                  : owed.some(o => o.heldHours < o.requiredHours)
                    ? 'Sign up for shifts until each requirement below is met. You can hold several — tap a shift to sign up.'
                    : owed.length > 0
                      ? 'Your shift requirements are met — you can still pick up extra shifts.'
                      : 'Tap a shift to sign up for it.'}
              </p>
            </div>

            {shiftSignupOpen && (
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
          </>
        )}
      </>)}
    </div>
  )
}
