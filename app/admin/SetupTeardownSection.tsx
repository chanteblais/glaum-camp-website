'use client'

import { useState } from 'react'

type Member = {
  id: string
  displayName: string
  email: string
  setup_preference: string[]
  setup_limitations: string[]
}

const pillStyle = (color: string): React.CSSProperties => ({
  padding: '0.2rem 0.6rem',
  borderRadius: '9999px',
  fontSize: '0.72rem',
  border: `1px solid ${color}30`,
  color,
  background: `${color}10`,
  opacity: 0.9,
})

function MemberRow({ member }: { member: Member }) {
  const hasLimitations = member.setup_limitations.length > 0
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      padding: '0.55rem 0.85rem', borderRadius: '0.5rem',
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(200,168,72,0.08)',
    }}>
      <div>
        <p style={{ fontSize: '0.87rem', margin: 0 }}>{member.displayName}</p>
        <p style={{ fontSize: '0.72rem', opacity: 0.4, margin: 0 }}>{member.email}</p>
      </div>
      {hasLimitations && (
        <span style={pillStyle('#ffb432')} title={member.setup_limitations.join('; ')}>
          ⚠ Note
        </span>
      )}
    </div>
  )
}

function TeamPanel({ title, members, color }: { title: string; members: Member[]; color: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: `1px solid ${color}25`, borderRadius: '0.75rem', overflow: 'hidden', background: `${color}05` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '0.85rem 1.1rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color, opacity: 0.85 }}>
            {title}
          </span>
          <span style={{ ...pillStyle(color), fontSize: '0.68rem' }}>{members.length}</span>
        </div>
        <span style={{ fontSize: '0.6rem', color, opacity: 0.4 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${color}15`, padding: '0.75rem' }}>
          {members.length === 0 ? (
            <p style={{ fontSize: '0.82rem', opacity: 0.35, fontStyle: 'italic', margin: 0 }}>No members assigned yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {members.map(m => <MemberRow key={m.id} member={m} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SetupTeardownSection({ approved }: {
  approved: Array<{
    id: string
    first_name: string
    last_name: string
    preferred_name?: string | null
    email: string
    setup_preference?: string[] | null
    setup_limitations?: string[] | null
  }>
}) {
  const members: Member[] = approved.map(a => ({
    id: a.id,
    displayName: a.preferred_name || a.first_name,
    email: a.email,
    setup_preference: (a.setup_preference as string[]) ?? [],
    setup_limitations: (a.setup_limitations as string[]) ?? [],
  }))

  const setupTeam    = members.filter(m => m.setup_preference.includes('Setup Team') || m.setup_preference.includes('Both'))
  const teardownTeam = members.filter(m => m.setup_preference.includes('Teardown Team') || m.setup_preference.includes('Both'))
  const noPreference = members.filter(m => m.setup_preference.includes('No preference'))
  const limitations  = members.filter(m => m.setup_limitations.length > 0)
  const unassigned   = members.filter(m => m.setup_preference.length === 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <TeamPanel title="Setup Team" members={setupTeam} color="#C8A848" />
      <TeamPanel title="Teardown Team" members={teardownTeam} color="#C8A848" />
      {noPreference.length > 0 && (
        <TeamPanel title="No Preference" members={noPreference} color="#C8A848" />
      )}
      {limitations.length > 0 && (
        <TeamPanel title="Noted Limitations" members={limitations} color="#ffb432" />
      )}
      {unassigned.length > 0 && (
        <TeamPanel title="Not Yet Answered" members={unassigned} color="#F3EDE6" />
      )}
    </div>
  )
}
