'use client'

// The Radio feed — a curated stream of moments, not an audit log
// (docs/radio.md; visual language from Chante's 2026-07-03 mockup): an airy
// hairline-separated list, no card boxes. Each row = a large emblem, a
// headline with the moment's entity lit gold (RadioMessage), a quiet
// supporting line, and a timestamp that whispers from the right. Client
// component so times and day groupings read in the member's own clock; the
// posts themselves arrive server-fetched.

import { useState } from 'react'
import { IconImage } from '@/components/IconImage'
import { RadioMessage } from '@/components/RadioMessage'
import { RADIO_KIND_META, type RadioEventRow, type RadioKind } from '@/lib/radio'

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
  // Human speech sits apart from the automatic moments (whose emblem column
  // indents them): organizer broadcasts flush-left in lavender; member
  // voices RIGHT-aligned in a deep purple — a voice calling in from the
  // other side of the airwaves.
  const isSpeech = e.kind === 'broadcast' || isVoice
  const VOICE_PURPLE = 'rgba(158,68,202,0.95)'      // the words: deep and dark
  const VOICE_SIGNATURE = 'rgba(206,132,244,0.85)'  // the signature: lighter, luminous
  const hasEntity = e.message.includes('**')

  const body = (
    <div style={{ minWidth: 0, flex: 1, textAlign: isVoice ? 'right' : 'left' }}>
      <p
        className="radio-row-msg"
        style={{
          margin: 0,
          color: isVoice ? VOICE_PURPLE : isSpeech ? 'rgba(216,180,232,0.95)' : '#F3EDE6',
          opacity: isSpeech ? 1 : 0.92,
          fontStyle: isVoice ? 'italic' : undefined,
          overflowWrap: 'anywhere',
        }}
      >
        {isSpeech && !isVoice && (
          <span aria-hidden style={{ marginRight: '0.6rem' }}>
            {isImageIcon(e.icon) ? null : (e.icon || '📢')}
          </span>
        )}
        {isVoice ? e.message : <RadioMessage text={e.message} href={hasEntity ? e.link : undefined} />}
        {isVoice && (
          <span aria-hidden style={{ marginLeft: '0.6rem', opacity: 0.8 }}>{e.icon || '✦'}</span>
        )}
      </p>
      {e.detail && (
        <p className="radio-row-detail" style={{ color: '#F3EDE6', opacity: 0.55 }}>
          {e.detail}
        </p>
      )}
      {isVoice && e.actor_name && (
        <p className="radio-row-sig" style={{ color: VOICE_SIGNATURE }}>
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
      className="radio-row"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: isSpeech ? 0 : undefined,
        borderBottom: last ? 'none' : '1px solid rgba(200,168,72,0.1)',
      }}
    >
      {/* The moment's emblem — a large raw emoji (or medal art), no disc.
          Speech rows carry their emoji inline instead. */}
      {!isSpeech && (
        <span aria-hidden className="radio-row-emblem" style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', lineHeight: 1.3 }}>
          {isImageIcon(e.icon) ? <IconImage src={e.icon} size="1.4em" fill={0.95} /> : (e.icon || '✦')}
        </span>
      )}

      {/* voices are right-aligned, so their clock keeps the LEFT edge */}
      {isVoice && (
        <span className="radio-row-clock" style={{ flexShrink: 0, color: '#F3EDE6', opacity: 0.35, letterSpacing: '0.04em', marginRight: '0.75rem' }}>
          {clockOf(e.created_at)}
        </span>
      )}

      {wholeRowLink ? (
        <a href={e.link!} style={{ color: 'inherit', textDecoration: 'none', display: 'flex', flex: 1, minWidth: 0 }}>
          {body}
        </a>
      ) : (
        body
      )}

      {!isVoice && (
        <span className="radio-row-clock" style={{ flexShrink: 0, color: '#F3EDE6', opacity: 0.35, letterSpacing: '0.04em', marginLeft: '0.75rem' }}>
          {clockOf(e.created_at)}
        </span>
      )}
    </article>
  )
}

// Feed metrics live in CSS so mobile can compress the whole rhythm — the
// desktop scale read bloated at ~380px. (Inline <style> must use
// dangerouslySetInnerHTML — house gotcha.)
const FEED_CSS = `
  .radio-row { padding: 1.1rem 0.25rem; gap: 1.1rem; }
  .radio-row-emblem { width: 2.6rem; font-size: 1.7rem; }
  .radio-row-msg { font-size: 1rem; line-height: 1.5; }
  .radio-row-detail { font-size: 0.85rem; line-height: 1.5; margin: 0.3rem 0 0; }
  .radio-row-sig { font-size: 0.72rem; margin: 0.3rem 0 0; }
  .radio-row-clock { font-size: 0.72rem; padding-top: 0.35rem; }
  .radio-day-section { margin-bottom: 1.5rem; }
  .radio-signoff { font-size: 0.85rem; margin: 2.5rem 0 0; }
  /* Filter row — understated text chips, not pill buttons: a thin gold
     underline marks the active kind, echoing the nav's active/dim contrast.
     flex-wrap (not overflow-x scroll) so every kind stays reachable on
     phones — the day-chip rail learned this lesson the hard way. */
  .radio-filter-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 1.1rem; margin: 0 0 1.75rem; padding-bottom: 0.85rem; border-bottom: 1px solid rgba(200,168,72,0.12); }
  .radio-filter-chip { background: none; border: none; border-bottom: 2px solid transparent; padding: 0.15rem 0.05rem; font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; font-family: inherit; cursor: pointer; color: rgba(243,237,230,0.4); }
  .radio-filter-chip.active { color: #C8A848; border-bottom-color: rgba(200,168,72,0.6); }
  @media (max-width: 640px) {
    .radio-row { padding: 0.65rem 0.05rem; gap: 0.65rem; }
    .radio-row-emblem { width: 1.7rem; font-size: 1.15rem; }
    .radio-row-msg { font-size: 0.85rem; line-height: 1.45; }
    .radio-row-detail { font-size: 0.73rem; margin-top: 0.2rem; }
    .radio-row-sig { font-size: 0.62rem; margin-top: 0.2rem; }
    .radio-row-clock { font-size: 0.58rem; padding-top: 0.3rem; }
    .radio-day-section { margin-bottom: 1.1rem; }
    .radio-signoff { font-size: 0.72rem; margin: 1.75rem 0 0; }
    .radio-filter-row { gap: 0.3rem 0.7rem; margin-bottom: 1.2rem; padding-bottom: 0.65rem; }
    .radio-filter-chip { font-size: 0.6rem; }
  }
`

const KIND_FILTERS = Object.entries(RADIO_KIND_META) as [RadioKind, { emoji: string; label: string }][]

function RadioFilterRow({ value, onChange }: { value: 'all' | RadioKind; onChange: (v: 'all' | RadioKind) => void }) {
  return (
    <div className="radio-filter-row" role="group" aria-label="Filter the feed by kind">
      <button
        type="button"
        className={`radio-filter-chip${value === 'all' ? ' active' : ''}`}
        onClick={() => onChange('all')}
      >
        All
      </button>
      {KIND_FILTERS.map(([kind, meta]) => (
        <button
          key={kind}
          type="button"
          className={`radio-filter-chip${value === kind ? ' active' : ''}`}
          onClick={() => onChange(kind)}
        >
          <span aria-hidden>{meta.emoji}</span> {meta.label}
        </button>
      ))}
    </div>
  )
}

export function RadioFeed({ events }: { events: RadioEventRow[] }) {
  const [filter, setFilter] = useState<'all' | RadioKind>('all')

  if (events.length === 0) {
    return (
      <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.85rem', padding: '3rem 0' }}>
        The airwaves are quiet — nothing on the air yet.
      </p>
    )
  }

  // Client-side filter over the already-fetched feed — getRadioFeed() loads
  // the full latest-60 in one shot, so there's no pagination to coordinate with.
  const filtered = filter === 'all' ? events : events.filter(e => e.kind === filter)

  // Group into day sections, newest first (posts already arrive sorted).
  const sections: { label: string; items: RadioEventRow[] }[] = []
  for (const e of filtered) {
    const label = dayLabel(e.created_at)
    const last = sections[sections.length - 1]
    if (last && last.label === label) last.items.push(e)
    else sections.push({ label, items: [e] })
  }

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: FEED_CSS }} />
      <RadioFilterRow value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.85rem', padding: '2rem 0' }}>
          No {RADIO_KIND_META[filter as RadioKind]?.label.toLowerCase() ?? 'moments'} yet.
        </p>
      ) : (
        sections.map(section => (
          <section key={section.label} className="radio-day-section">
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
        ))
      )}

      {/* Sign-off */}
      <p
        aria-hidden
        className="radio-signoff"
        style={{ textAlign: 'center', fontStyle: 'italic', color: '#C8A848', opacity: 0.55 }}
      >
        ✦ &nbsp;That's all for now. Stay tuned.&nbsp; ✦
      </p>
    </div>
  )
}
