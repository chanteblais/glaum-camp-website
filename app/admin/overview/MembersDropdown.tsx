'use client'

import { useState } from 'react'

type Member = {
  id: string
  displayName: string
  email: string
  hasRole: boolean
  hasShift: boolean
  rolePending: boolean
}

export function MembersDropdown({ members }: { members: Member[] }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'incomplete'>('all')

  const filtered = filter === 'incomplete'
    ? members.filter(m => !m.hasRole || !m.hasShift || m.rolePending)
    : members

  const incomplete = members.filter(m => !m.hasRole || !m.hasShift || m.rolePending).length

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: '#C8A848',
          fontSize: '0.78rem',
          letterSpacing: '0.08em',
          opacity: 0.8,
        }}
      >
        <span>{open ? '▲' : '▼'}</span>
        <span>{open ? 'Hide members' : 'Show all members'}</span>
        {incomplete > 0 && (
          <span style={{
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            background: 'rgba(255,180,50,0.15)',
            border: '1px solid rgba(255,180,50,0.3)',
            color: '#ffb432',
            fontSize: '0.7rem',
          }}>
            {incomplete} incomplete
          </span>
        )}
      </button>

      {open && (
        <div style={{ marginTop: '1rem' }}>
          {/* Filter toggle */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {(['all', 'incomplete'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  border: filter === f ? '1px solid rgba(210,57,248,0.4)' : '1px solid rgba(200,168,72,0.15)',
                  background: filter === f ? 'rgba(210,57,248,0.08)' : 'transparent',
                  color: filter === f ? '#D239F8' : '#F3EDE6',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  opacity: filter === f ? 1 : 0.5,
                  letterSpacing: '0.06em',
                }}
              >
                {f === 'all' ? 'All' : 'Incomplete only'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {filtered.length === 0 && (
              <p style={{ fontSize: '0.82rem', opacity: 0.4, fontStyle: 'italic' }}>No members to show.</p>
            )}
            {filtered.map(m => {
              const complete = m.hasRole && m.hasShift && !m.rolePending
              const pending = m.rolePending
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '0.5rem',
                    background: complete
                      ? 'rgba(100,200,120,0.04)'
                      : 'rgba(255,180,50,0.04)',
                    border: complete
                      ? '1px solid rgba(100,200,120,0.12)'
                      : '1px solid rgba(255,180,50,0.15)',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.9 }}>{m.displayName}</p>
                    <p style={{ fontSize: '0.72rem', margin: 0, opacity: 0.4 }}>{m.email}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <Tag label="Role" done={m.hasRole} pending={m.rolePending} />
                    <Tag label="Shift" done={m.hasShift} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Tag({ label, done, pending }: { label: string; done: boolean; pending?: boolean }) {
  const color = pending ? '#ffb432' : done ? '#7dcf8e' : 'rgba(243,237,230,0.3)'
  const bg = pending ? 'rgba(255,180,50,0.1)' : done ? 'rgba(100,200,120,0.1)' : 'rgba(255,255,255,0.04)'
  const border = pending ? 'rgba(255,180,50,0.3)' : done ? 'rgba(100,200,120,0.25)' : 'rgba(255,255,255,0.1)'
  const symbol = pending ? '⏳' : done ? '✓' : '–'
  return (
    <span style={{
      padding: '0.15rem 0.5rem',
      borderRadius: '9999px',
      border: `1px solid ${border}`,
      background: bg,
      color,
      fontSize: '0.68rem',
      letterSpacing: '0.04em',
    }}>
      {symbol} {label}
    </span>
  )
}
