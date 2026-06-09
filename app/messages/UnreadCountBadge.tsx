'use client'

import { useState, useEffect } from 'react'

export function UnreadCountBadge() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/messages/unread', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: { count?: number }) => {
        if (!cancelled) setUnread(d.count ?? 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (unread <= 0) return null

  return (
    <span
      aria-label={`${unread} unread`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '1.5rem',
        height: '1.5rem',
        padding: '0 0.5rem',
        marginLeft: '0.75rem',
        borderRadius: '9999px',
        background: '#D239F8',
        color: '#fff',
        fontSize: '0.8rem',
        fontWeight: 700,
        fontFamily: 'system-ui, sans-serif',
        lineHeight: 1,
        verticalAlign: 'middle',
        boxShadow: '0 0 12px rgba(210,57,248,0.45)',
      }}
    >
      {unread > 99 ? '99+' : unread}
    </span>
  )
}
