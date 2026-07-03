'use client'

// The Radio feed — a curated stream of moments, not an audit log
// (docs/radio.md; visual language from Chante's 2026-07-03 mockup): an airy
// hairline-separated list, no card boxes. Each row = a large emblem, a
// headline with the moment's entity lit gold (RadioMessage), a quiet
// supporting line, and a timestamp that whispers from the right. Client
// component so times and day groupings read in the member's own clock; the
// posts themselves arrive server-fetched.

import { IconImage } from '@/components/IconImage'
import { RadioMessage } from '@/components/RadioMessage'
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

function RadioRow({ e, last }: { e: RadioEventRow; last: boolean }) {
  const isVoice = e.kind === 'voice'
  // Human speech (organizer broadcasts, member voices) sits flush-left in
  // lavender — a person talking stands apart from the automatic moments,
  // whose emblem column indents them.
  const isSpeech = e.kind === 'broadcast' || isVoice
  const hasEntity = e.message.includes('**')

  const body = (
    <div style={{ minWidth: 0, flex: 1 }}>
      <p
        style={{
          margin: 0,
          fontSize: '1rem',
          lineHeight: 1.5,
          color: isSpeech ? 'rgba(216,180,232,0.95)' : '#F3EDE6',
          opacity: isSpeech ? 1 : 0.92,
          fontStyle: isVoice ? 'italic' : undefined,
          overflowWrap: 'anywhere',
        }}
      >
        {isSpeech && (
          <span aria-hidden style={{ marginRight: '0.6rem' }}>
            {isImageIcon(e.icon) ? null : (e.icon || (isVoice ? '✦' : '📢'))}
          </span>
        )}
        {isVoice ? e.message : <RadioMessage text={e.message} href={hasEntity ? e.link : undefined} />}
      </p>
      {e.detail && (
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', lineHeight: 1.5, color: '#F3EDE6', opacity: 0.55 }}>
          {e.detail}
        </p>
      )}
      {isVoice && e.actor_name && (
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#C8A848', opacity: 0.6 }}>
          — {e.actor_name}
        </p>
      )}
    </div>
  )

  // A row with a destination but no lit entity (e.g. a hand-written broadcast
  // with a link) stays clickable as a whole.
  const wholeRowLink = e.link && !hasEntity && !isVoice

  return (
    <article
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: isSpeech ? 0 : '1.1rem',
        padding: '1.1rem 0.25rem',
        borderBottom: last ? 'none' : '1px solid rgba(200,168,72,0.1)',
      }}
    >
      {/* The moment's emblem — a large raw emoji (or medal art), no disc.
          Speech rows carry their emoji inline instead. */}
      {!isSpeech && (
        <span
          aria-hidden
          style={{
            width: '2.6rem',
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            fontSize: '1.7rem',
            lineHeight: 1.3,
          }}
        >
          {isImageIcon(e.icon) ? <IconImage src={e.icon} size="2.4rem" fill={0.95} /> : (e.icon || '✦')}
        </span>
      )}

      {wholeRowLink ? (
        <a href={e.link!} style={{ color: 'inherit', textDecoration: 'none', display: 'flex', flex: 1, minWidth: 0 }}>
          {body}
        </a>
      ) : (
        body
      )}

      <span style={{ flexShrink: 0, fontSize: '0.72rem', color: '#F3EDE6', opacity: 0.35, paddingTop: '0.35rem', letterSpacing: '0.04em', marginLeft: '0.75rem' }}>
        {clockOf(e.created_at)}
      </span>
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
        <section key={section.label} style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#C8A848',
              opacity: 0.8,
              margin: '0 0 0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
            }}
          >
            {section.label}
            <span aria-hidden style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.35), rgba(200,168,72,0.08))' }} />
            <span aria-hidden style={{ color: '#C8A848', opacity: 0.7, fontSize: '0.8rem' }}>✦</span>
          </h2>

          <div>
            {section.items.map((e, i) => (
              <RadioRow key={e.id} e={e} last={i === section.items.length - 1} />
            ))}
          </div>
        </section>
      ))}

      {/* Sign-off */}
      <p
        aria-hidden
        style={{
          textAlign: 'center',
          fontStyle: 'italic',
          fontSize: '0.85rem',
          color: '#C8A848',
          opacity: 0.55,
          margin: '2.5rem 0 0',
        }}
      >
        ✦ &nbsp;That's all for now. Stay tuned.&nbsp; ✦
      </p>
    </div>
  )
}
