'use client'

import { useState } from 'react'

const ALL_CONTRIBUTIONS = [
  'Setup',
  'Teardown',
  'Camp kitchen',
  'Decor / ambiance',
  'Sound / DJ support',
  'Lighting',
  'Welcoming / greeting',
  'Shift coverage',
  'Cleanup',
  'Emotional support / grounding presence',
  'Art support',
  'Tea/snack operations',
  'Logistics / organization',
  'Build crew',
  'Strike crew',
  'General helper',
  '"Put me where needed"',
  'Tiny hand distribution',
  'Shrimp relations',
]

type App = {
  id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  status: string
  contributions: string[] | null
}

function displayName(app: App) {
  return `${app.preferred_name || app.first_name} ${app.last_name}`
}

function RoleRow({ role, people }: { role: string; people: App[] }) {
  const [open, setOpen] = useState(false)
  const approved = people.filter(p => p.status === 'approved')
  const pending = people.filter(p => p.status === 'pending')
  const total = people.length

  return (
    <div style={{ borderBottom: '1px solid rgba(200,168,72,0.07)' }}>
      <button
        onClick={() => total > 0 && setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.7rem 0.25rem',
          background: 'none',
          border: 'none',
          cursor: total > 0 ? 'pointer' : 'default',
          color: 'inherit',
          textAlign: 'left',
          gap: '1rem',
        }}
      >
        <span style={{ fontSize: '0.875rem', opacity: total > 0 ? 0.85 : 0.3 }}>{role}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {total === 0 ? (
            <span style={{ fontSize: '0.75rem', opacity: 0.25 }}>—</span>
          ) : (
            <>
              {approved.length > 0 && (
                <span style={{ fontSize: '0.8rem', color: '#C8A848', fontWeight: 600 }}>{approved.length}</span>
              )}
              {pending.length > 0 && (
                <span style={{ fontSize: '0.72rem', color: '#D239F8', opacity: 0.75 }}>
                  {approved.length > 0 ? '+' : ''}{pending.length} pending
                </span>
              )}
              <span style={{ fontSize: '0.6rem', color: '#C8A848', opacity: 0.35, marginLeft: '0.25rem' }}>
                {open ? '▲' : '▼'}
              </span>
            </>
          )}
        </div>
      </button>

      {open && total > 0 && (
        <div style={{ paddingBottom: '0.75rem', paddingLeft: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {approved.map(p => (
            <span
              key={p.id}
              style={{
                fontSize: '0.78rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                border: '1px solid rgba(200,168,72,0.25)',
                color: '#F3EDE6',
                opacity: 0.85,
              }}
            >
              {displayName(p)}
            </span>
          ))}
          {pending.map(p => (
            <span
              key={p.id}
              style={{
                fontSize: '0.78rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                border: '1px solid rgba(210,57,248,0.2)',
                color: '#D239F8',
                opacity: 0.6,
              }}
            >
              {displayName(p)} <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>pending</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function ContributionsSection({ applications }: { applications: App[] }) {
  const active = applications.filter(a => a.status === 'approved' || a.status === 'pending')

  // Build a map of contribution → people
  const roleMap: Record<string, App[]> = {}
  for (const role of ALL_CONTRIBUTIONS) roleMap[role] = []
  for (const app of active) {
    for (const c of app.contributions ?? []) {
      if (roleMap[c]) roleMap[c].push(app)
    }
  }

  // Sort: roles with signups first (by total count desc), empty roles last
  const sorted = ALL_CONTRIBUTIONS.slice().sort((a, b) => roleMap[b].length - roleMap[a].length)

  return (
    <div>
      {sorted.map(role => (
        <RoleRow key={role} role={role} people={roleMap[role]} />
      ))}
    </div>
  )
}
