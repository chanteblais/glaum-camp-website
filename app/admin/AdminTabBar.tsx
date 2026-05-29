'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AdminTabBar() {
  const path = usePathname()
  const isOverview = path === '/admin/overview'

  const tab = (label: string, href: string, active: boolean): React.ReactNode => (
    <Link
      href={href}
      style={{
        padding: '0.45rem 1.25rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        letterSpacing: '0.1em',
        textDecoration: 'none',
        transition: 'all 0.15s',
        border: active ? '1px solid rgba(210,57,248,0.5)' : '1px solid rgba(200,168,72,0.2)',
        color: active ? '#D239F8' : '#F3EDE6',
        background: active ? 'rgba(210,57,248,0.08)' : 'transparent',
        opacity: active ? 1 : 0.55,
      }}
    >
      {label}
    </Link>
  )

  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
      {tab('Overview', '/admin/overview', isOverview)}
      {tab('Manage', '/admin', !isOverview)}
    </div>
  )
}
