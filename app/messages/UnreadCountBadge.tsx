'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export function UnreadCountBadge() {
  const [unread, setUnread] = useState(0)
  const pathname = usePathname()

  const refresh = useCallback(() => {
    return fetch('/api/messages/unread', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { count?: number } | null) => setUnread(d?.count ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    // Poll every 30s for near-real-time updates.
    const id = setInterval(refresh, 30_000)

    // Re-check promptly when the tab regains focus or another part of the app
    // signals that messages were read (e.g. opening a thread).
    const onFocus = () => refresh()
    const onRead = () => refresh()
    window.addEventListener('focus', onFocus)
    window.addEventListener('glaum:messages-read', onRead)

    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('glaum:messages-read', onRead)
    }
    // Re-run on route change so the count updates after navigating.
  }, [refresh, pathname])

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
