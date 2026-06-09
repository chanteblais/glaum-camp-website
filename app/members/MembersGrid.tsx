'use client'

import { useState, useMemo } from 'react'
import { supabaseResizedUrl } from '@/lib/supabase-image'

export type MemberCard = {
  id: string
  dbId: string
  name: string
  avatarUrl: string | null
  roleName: string | null
  deptName: string | null
  roleApprovalStatus: string | null
}

export function MembersGrid({ members }: { members: MemberCard[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter(m => {
      const roleSearchable = m.roleApprovalStatus !== 'pending'
      const haystack = [
        m.name,
        roleSearchable ? m.roleName : null,
        roleSearchable ? m.deptName : null,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [members, query])

  return (
    <>
      {/* Search bar */}
      <div style={{ maxWidth: '420px', margin: '0 auto 3rem' }}>
        <label htmlFor="member-search" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
          Search members by name or role
        </label>
        <input
          id="member-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members by name or role…"
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            fontSize: '0.9rem',
            color: '#F3EDE6',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(200,168,72,0.25)',
            borderRadius: '0.75rem',
            outline: 'none',
            textAlign: 'center',
            letterSpacing: '0.03em',
          }}
        />
      </div>

      {/* Member grid */}
      <ul aria-label="Approved members" style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gridAutoRows: '1fr',
        gap: '1.5rem',
      }}>
        {filtered.map(member => {
          const roleShown = member.roleName && member.roleApprovalStatus !== 'pending'
          return (
          <li key={member.dbId} style={{ display: 'flex', height: '100%' }}>
          <a
            href={`/members/${member.id}`}
            aria-label={roleShown ? `View ${member.name}'s profile — ${member.roleName}` : `View ${member.name}'s profile`}
            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', height: '100%', width: '100%' }}
          >
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '1.25rem 1rem',
              border: '1px solid rgba(200,168,72,0.15)',
              borderRadius: '1rem',
              background: 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            >
              {/* Avatar */}
              <div style={{
                width: '80px', height: '80px',
                borderRadius: '50%',
                border: '2px solid rgba(111,73,31,0.6)',
                background: 'rgba(200,168,72,0.08)',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {member.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={supabaseResizedUrl(member.avatarUrl, 160) ?? ''} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span aria-hidden="true" style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.5rem', color: '#C8A848', opacity: 0.85 }}>
                    ✦
                  </span>
                )}
              </div>

              {/* Name */}
              <p style={{
                fontSize: '0.88rem',
                color: '#EDE0C8',
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.3,
                letterSpacing: '0.03em',
              }}>
                {member.name}
              </p>

              {/* Role — always rendered so all cards have the same natural height */}
              <p aria-hidden={!roleShown} style={{
                fontSize: '0.62rem',
                color: '#C8A848',
                opacity: roleShown ? 0.65 : 0,
                textAlign: 'center',
                margin: 0,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                lineHeight: 1.3,
                userSelect: 'none',
              }}>
                {roleShown ? member.roleName : ' '}
              </p>
            </div>
          </a>
          </li>
          )
        })}
      </ul>

      {members.length === 0 && (
        <p style={{ textAlign: 'center', opacity: 0.35, fontStyle: 'italic', fontSize: '0.9rem' }}>
          No approved members yet.
        </p>
      )}

      {members.length > 0 && filtered.length === 0 && (
        <p style={{ textAlign: 'center', opacity: 0.35, fontStyle: 'italic', fontSize: '0.9rem' }}>
          No members match “{query.trim()}”.
        </p>
      )}
    </>
  )
}
