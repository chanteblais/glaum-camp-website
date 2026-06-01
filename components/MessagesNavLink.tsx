'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function MessagesNavLink({ style }: { style?: React.CSSProperties }) {
  const [unread, setUnread] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    const fetch_ = () =>
      fetch('/api/messages/unread', { cache: 'no-store' })
        .then(r => r.json())
        .then(d => setUnread(d.count ?? 0))
        .catch(() => {})

    fetch_()
    const id = setInterval(fetch_, 30_000)
    return () => clearInterval(id)
  }, [pathname])

  return (
    <Link
      href="/messages"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}
    >
      Messages
      {unread > 0 && (
        <span style={{
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
        }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
