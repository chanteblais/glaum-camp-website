'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function MessagesNavLink({ style }: { style?: React.CSSProperties }) {
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
    // Re-run on route change so the count updates after navigating into/out of /messages
  }, [refresh, pathname])

  return (
    <Link
      href="/messages"
      aria-label={unread > 0 ? `Messages — ${unread} unread` : 'Messages'}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        transition: 'opacity 0.2s, color 0.2s',
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#C8A848' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = String(style?.opacity ?? 0.8); e.currentTarget.style.color = String(style?.color ?? '#F3EDE6') }}
    >
      Messages
      {unread > 0 && (
        <span
          aria-hidden="true"
          style={{
            marginLeft: '5px',
            minWidth: '16px',
            height: '16px',
            borderRadius: '9999px',
            background: '#D239F8',
            color: '#fff',
            fontSize: '0.6rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            lineHeight: 1,
            verticalAlign: 'middle',
            boxShadow: '0 0 8px rgba(210,57,248,0.5)',
          }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
