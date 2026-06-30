'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AdminCategory } from './admin-sections'

const GOLD = '#C8A848'
const PURPLE = '#D239F8'
const CREAM = '#F3EDE6'

const TABS = [
  { label: 'Overview', href: '/admin/overview' },
  { label: 'Manage', href: '/admin' },
  { label: 'Configure', href: '/admin/configure' },
]

/**
 * Sticky admin navigation shown on every admin page (incl. nested ones like
 * /admin/configure and /admin/[id]) so the nav never disappears and you can
 * always jump between areas or back to camp without backtracking.
 *
 * Pass `sections` (on the Manage or Configure page) to surface a second row of
 * jump-links down to each category on that page.
 */
export function AdminNav({ sections }: { sections?: AdminCategory[] }) {
  const path = usePathname()

  // /admin/[id] (application detail) belongs under Manage.
  const activeHref =
    path === '/admin/overview' ? '/admin/overview'
    : path.startsWith('/admin/configure') ? '/admin/configure'
    : '/admin'

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        marginBottom: '2.5rem',
        background: 'rgba(26,10,36,0.88)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(200,168,72,0.12)',
        // bleed to the full viewport width even inside a max-width column
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        paddingLeft: 'calc(50vw - 50%)',
        paddingRight: 'calc(50vw - 50%)',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0.65rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <Link
            href="/"
            style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: GOLD, textDecoration: 'none', opacity: 0.6, whiteSpace: 'nowrap' }}
          >
            ← Camp
          </Link>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {TABS.map(t => {
              const active = activeHref === t.href
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  style={{
                    padding: '0.4rem 1.1rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    letterSpacing: '0.1em',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                    border: active ? `1px solid rgba(210,57,248,0.5)` : '1px solid rgba(200,168,72,0.2)',
                    color: active ? PURPLE : CREAM,
                    background: active ? 'rgba(210,57,248,0.08)' : 'transparent',
                    opacity: active ? 1 : 0.55,
                  }}
                >
                  {t.label}
                </Link>
              )
            })}
          </div>

          <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: PURPLE, opacity: 0.6, whiteSpace: 'nowrap' }}>
            ADMIN
          </span>
        </div>

        {sections && sections.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.35rem 1rem',
              justifyContent: 'center',
              marginTop: '0.6rem',
              paddingTop: '0.55rem',
              borderTop: '1px solid rgba(200,168,72,0.08)',
            }}
          >
            {sections.map(c => (
              <a
                key={c.id}
                href={`#${c.id}`}
                style={{
                  fontSize: '0.68rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: GOLD,
                  opacity: 0.5,
                  textDecoration: 'none',
                }}
              >
                {c.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
