'use client'

import { useState, useEffect } from 'react'

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = true,
  children,
}: {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  // The console remembers how you left each section (keyed by title, per
  // browser). Hydrate after mount so the server render stays deterministic.
  const storageKey = `glaum-admin-section:${title}`
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved !== null) setOpen(saved === '1')
    } catch { /* private mode etc. — keep default */ }
  }, [storageKey])

  const toggle = () => {
    setOpen(o => {
      try { localStorage.setItem(storageKey, o ? '0' : '1') } catch { /* ignore */ }
      return !o
    })
  }

  return (
    <div style={{ marginBottom: '3rem' }}>
      <button
        onClick={toggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          borderBottom: `1px solid rgba(200,168,72,${open ? '0.2' : '0.1'})`,
          paddingBottom: '0.75rem',
          marginBottom: open ? '1.5rem' : 0,
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '0.95rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.85, flexShrink: 0 }}>
          {title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          {summary && !open && (
            <span style={{ fontSize: '0.75rem', color: '#F3EDE6', opacity: 0.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
          )}
          <span style={{ fontSize: '0.65rem', color: '#C8A848', opacity: 0.4 }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </button>
      {open && children}
    </div>
  )
}
