'use client'

// The Radio feed — a curated stream of moments, not an audit log
// (docs/radio.md). Each kind carries its own card language so the feed has
// rhythm: broadcasts announce, welcomes glow, contributions sparkle,
// achievements engrave, milestones celebrate, voices murmur. Content leads;
// timestamps whisper. Client component so times and day groupings read in
// the member's own clock; the posts themselves arrive server-fetched.

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

// Per-kind card chrome. Everything not listed falls back to 'voice'-ish calm.
const CARD_STYLE: Record<string, { border: string; background: string }> = {
  broadcast: { border: '1px solid rgba(200,168,72,0.4)', background: 'rgba(200,168,72,0.08)' },
  welcome: { border: '1px solid rgba(210,57,248,0.25)', background: 'rgba(210,57,248,0.05)' },
  contribution: { border: '1px solid rgba(200,168,72,0.14)', background: 'rgba(243,237,230,0.025)' },
  achievement: { border: '1px solid rgba(200,168,72,0.3)', background: 'rgba(200,168,72,0.045)' },
  voice: { border: '1px solid rgba(200,168,72,0.1)', background: 'rgba(243,237,230,0.02)' },
}

function Disc({ e, size = 40 }: { e: RadioEventRow; size?: number }) {
  const ring = e.kind === 'achievement' ? 'rgba(200,168,72,0.7)' : 'rgba(200,168,72,0.3)'
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        border: `1px solid ${ring}`,
        boxShadow: e.kind === 'achievement' ? '0 0 0 3px rgba(200,168,72,0.12)' : undefined,
        background: 'rgba(26,10,36,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontSize: '1.05rem',
      }}
    >
      {e.avatar_url && (e.kind === 'welcome' || e.kind === 'voice') ? (
        // Faces for the people-moments; emblems for the rest.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={supabaseResizedUrl(e.avatar_url, size * 2) ?? e.avatar_url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : isImageIcon(e.icon) ? (
        <IconImage src={e.icon} size="100%" fill={0.82} />
      ) : (
        <span style={{ color: '#C8A848' }}>{e.icon || '✦'}</span>
      )}
    </span>
  )
}

function Timestamp({ ts }: { ts: string }) {
  return (
    <span
      style={{
        position: 'absolute',
        top: '0.6rem',
        right: '0.85rem',
        fontSize: '0.6rem',
        color: '#F3EDE6',
        opacity: 0.25,
        letterSpacing: '0.04em',
      }}
    >
      {clockOf(ts)}
    </span>
  )
}

function RadioCard({ e }: { e: RadioEventRow }) {
  const chrome = CARD_STYLE[e.kind] ?? CARD_STYLE.voice

  // Milestones are community moments, not personal ones — centered and
  // celebratory, no disc.
  if (e.kind === 'milestone') {
    return (
      <article
        style={{
          position: 'relative',
          padding: '1.1rem 1rem 1rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(200,168,72,0.45)',
          background: 'linear-gradient(180deg, rgba(200,168,72,0.1), rgba(200,168,72,0.03))',
          textAlign: 'center',
        }}
      >
        <Timestamp ts={e.created_at} />
        <p style={{ margin: 0, fontSize: '1rem', color: '#C8A848', lineHeight: 1.5 }}>
          {e.icon || '🎉'}{' '}
          {e.link ? (
            <a href={e.link} style={{ color: 'inherit', textDecoration: 'none' }}>{e.message}</a>
          ) : (
            e.message
          )}
        </p>
        {e.detail && (
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#F3EDE6', opacity: 0.55 }}>
            {e.detail}
          </p>
        )}
      </article>
    )
  }

  const isVoice = e.kind === 'voice'
  const body = (
    <>
      <p
        style={{
          margin: 0,
          fontSize: e.kind === 'broadcast' ? '0.95rem' : '0.9rem',
          lineHeight: 1.55,
          color: '#F3EDE6',
          opacity: e.kind === 'broadcast' ? 0.95 : 0.85,
          fontStyle: isVoice ? 'italic' : undefined,
          overflowWrap: 'anywhere',
        }}
      >
        {e.message}
      </p>
      {e.detail && (
        <p
          style={{
            margin: '0.25rem 0 0',
            fontSize: '0.78rem',
            lineHeight: 1.5,
            color: e.kind === 'contribution' || e.kind === 'achievement' ? '#C8A848' : '#F3EDE6',
            opacity: e.kind === 'achievement' ? 0.6 : 0.65,
            fontStyle: e.kind === 'achievement' ? 'italic' : undefined,
          }}
        >
          {e.detail}
        </p>
      )}
      {isVoice && e.actor_name && (
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', color: '#C8A848', opacity: 0.6 }}>
          — {e.actor_name}
        </p>
      )}
    </>
  )

  return (
    <article
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        padding: '0.85rem 3.4rem 0.85rem 1rem',
        borderRadius: '0.75rem',
        ...chrome,
      }}
    >
      <Timestamp ts={e.created_at} />
      <Disc e={e} />
      <div style={{ minWidth: 0, flex: 1 }}>
        {e.link && !isVoice ? (
          <a href={e.link} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
            {body}
          </a>
        ) : (
          body
        )}
      </div>
    </article>
  )
}

export function RadioFeed({ events }: { events: RadioEventRow[] }) {
  if (events.length === 0) {
    return (
      <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.85rem', padding: '3rem 0' }}>
        The airwaves are quiet — nothing on the air yet.
      </p>
    )
  }

  // Group into day sections, newest first (posts already arrive sorted).
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
            {section.items.map(e => (
              <RadioCard key={e.id} e={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
