'use client'

import { useState } from 'react'

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

  return (
    <div style={{ marginBottom: '3rem' }}>
      <button
        onClick={() => setOpen(!open)}
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
        <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.7 }}>
          {title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {summary && !open && (
            <span style={{ fontSize: '0.75rem', color: '#F3EDE6', opacity: 0.35 }}>{summary}</span>
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
