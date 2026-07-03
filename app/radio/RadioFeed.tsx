'use client'

// The Radio feed — editorial cards, not speech bubbles (docs/radio.md).
// Client component so timestamps and day groupings read in the member's own
// clock; the events themselves arrive server-fetched.

import { IconImage } from '@/components/IconImage'
import { supabaseResizedUrl } from '@/lib/supabase-image'
import type { RadioEventRow } from '@/lib/radio'

const isImageIcon = (icon: string | null): icon is string =>
  Boolean(icon && (icon.startsWith('/') || icon.startsWith('http')))

function dayLabel(ts: string): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

const clockOf = (ts: string) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export function RadioFeed({ events }: { events: RadioEventRow[] }) {
  if (events.length === 0) {
    return (
      <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.85rem', padding: '3rem 0' }}>
        The airwaves are quiet — nothing broadcast yet.
      </p>
    )
  }

  // Group into day sections, newest first (events already arrive sorted).
  const sections: { label: string; items: RadioEventRow[] }[] = []
  for (const e of events) {
    const label = dayLabel(e.created_at)
    const last = sections[sections.length - 1]
    if (last && last.label === label) last.items.push(e)
    else sections.push({ label, items: [e] })
  }

  return (
    <div>
      {sections.map(section => (
        <section key={section.label} style={{ marginBottom: '2.25rem' }}>
          <h2
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#C8A848',
              opacity: 0.75,
              margin: '0 0 0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {section.label}
            <span aria-hidden style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.3), transparent)' }} />
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {section.items.map(e => {
              const broadcast = e.kind === 'broadcast'
              return (
                <article
                  key={e.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '0.75rem',
                    border: broadcast ? '1px solid rgba(200,168,72,0.35)' : '1px solid rgba(200,168,72,0.12)',
                    background: broadcast ? 'rgba(200,168,72,0.07)' : 'rgba(243,237,230,0.025)',
                  }}
                >
                  {/* Face if we have one (the community seeing itself), else the event's emblem */}
                  <span
                    aria-hidden
                    style={{
                      width: '38px',
                      height: '38px',
                      flexShrink: 0,
                      borderRadius: '50%',
                      border: '1px solid rgba(200,168,72,0.3)',
                      background: 'rgba(26,10,36,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      fontSize: '1rem',
                    }}
                  >
                    {e.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={supabaseResizedUrl(e.avatar_url, 76) ?? e.avatar_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : isImageIcon(e.icon) ? (
                      <IconImage src={e.icon} size="100%" fill={0.8} />
                    ) : (
                      <span style={{ color: '#C8A848' }}>{e.icon || '✦'}</span>
                    )}
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55, color: '#F3EDE6', opacity: broadcast ? 0.95 : 0.85 }}>
                      {e.link ? (
                        <a href={e.link} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {e.message}
                        </a>
                      ) : (
                        e.message
                      )}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.68rem', color: '#F3EDE6', opacity: 0.35 }}>
                      {clockOf(e.created_at)}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
