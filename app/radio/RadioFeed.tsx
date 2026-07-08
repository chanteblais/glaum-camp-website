'use client'

// The Radio feed — a curated stream of moments, not an audit log
// (docs/radio.md; visual language from Chante's 2026-07-03 mockup): an airy
// hairline-separated list, no card boxes. Automatic moments read as a large
// emblem + a headline with the moment's entity lit gold (RadioMessage) + a
// quiet supporting line, timestamp whispering from the right. Human speech —
// anyone picking up the mic, organizer or member — reads the SAME way
// (Chante 2026-07-08): right-aligned, purple, signed "— Name", a call coming
// in from the other side of the airwaves. Client component so times and day
// groupings read in the member's own clock; posts arrive server-fetched.

import { useCallback, useMemo, type ReactNode } from 'react'
import { IconImage } from '@/components/IconImage'
import { RadioMessage } from '@/components/RadioMessage'
import type { RadioEventRow } from '@/lib/radio'

// The roster the feed needs to turn "@Name" into a profile-linked pill — the
// same name-based match the post route uses to decide who got notified.
export type RadioMember = { userId: string; displayName: string }

const isImageIcon = (icon: string | null): icon is string =>
  Boolean(icon && (icon.startsWith('/') || icon.startsWith('http')))

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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

// Highlight @mentions of members inside a spoken message — a gold-lit pill for
// yourself, purple for everyone else, each linking to the member's profile.
// Matches display names (the composer inserts the exact name), mirroring the
// group-thread convention.
function useMentionRenderer(members: RadioMember[], currentUserId: string | null) {
  const memberByName = useMemo(() => {
    const map = new Map<string, RadioMember>()
    for (const m of members) if (m.displayName) map.set(m.displayName.toLowerCase(), m)
    return map
  }, [members])

  // "here" always joins the alternation so @here highlights even in a camp with
  // no other members typed.
  const mentionRegex = useMemo(() => {
    const names = [...members.map(m => m.displayName).filter(Boolean), 'here'].sort((a, b) => b.length - a.length)
    return new RegExp(`@(${names.map(escapeRegExp).join('|')})(?![\\w])`, 'gi')
  }, [members])

  return useCallback((body: string): ReactNode => {
    if (!mentionRegex) return body
    const out: ReactNode[] = []
    let last = 0
    mentionRegex.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = mentionRegex.exec(body)) !== null) {
      const start = m.index
      if (start > last) out.push(body.slice(last, start))
      const key = m[1].toLowerCase()
      const mem = memberByName.get(key)
      if (mem) {
        const isSelf = mem.userId === currentUserId
        out.push(
          <a
            key={start}
            href={`/members/${mem.userId}`}
            title={`View ${mem.displayName}'s profile`}
            style={{
              color: isSelf ? '#FFF1C2' : '#F8DBFF',
              background: isSelf ? 'rgba(200,168,72,0.42)' : 'rgba(210,57,248,0.38)',
              border: `1px solid ${isSelf ? 'rgba(200,168,72,0.4)' : 'rgba(210,57,248,0.4)'}`,
              borderRadius: '0.35rem',
              padding: '0.02rem 0.28rem',
              fontWeight: 700,
              fontStyle: 'normal',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {m[0]}
          </a>,
        )
      } else if (key === 'here') {
        // @here — the megaphone that rang the whole camp. A gold everyone-pill,
        // not a link.
        out.push(
          <span
            key={start}
            style={{
              color: '#FFF1C2',
              background: 'rgba(200,168,72,0.42)',
              border: '1px solid rgba(200,168,72,0.5)',
              borderRadius: '0.35rem',
              padding: '0.02rem 0.28rem',
              fontWeight: 700,
              fontStyle: 'normal',
              whiteSpace: 'nowrap',
            }}
          >
            {m[0]}
          </span>,
        )
      } else {
        out.push(m[0])
      }
      last = start + m[0].length
    }
    if (last < body.length) out.push(body.slice(last))
    return out
  }, [mentionRegex, memberByName, currentUserId])
}

function RadioRow({ e, last, renderMentions }: {
  e: RadioEventRow
  last: boolean
  renderMentions: (body: string) => ReactNode
}) {
  // Human speech — organizer broadcast or member voice alike — reads the same:
  // right-aligned, purple, italic, signed. The inline emoji carries meaning: a
  // 📢 megaphone means the post rang the whole camp (see the composer's "notify
  // everyone"); ✦ is an ordinary voice on the air.
  const isSpeech = e.kind === 'broadcast' || e.kind === 'voice'
  const VOICE_PURPLE = 'rgba(158,68,202,0.95)'      // the words: deep and dark
  const VOICE_SIGNATURE = 'rgba(206,132,244,0.85)'  // the signature: lighter, luminous
  const hasEntity = e.message.includes('**')

  const body = (
    <div style={{ minWidth: 0, flex: 1, textAlign: isSpeech ? 'right' : 'left' }}>
      <p
        className="radio-row-msg"
        style={{
          margin: 0,
          color: isSpeech ? VOICE_PURPLE : '#F3EDE6',
          opacity: isSpeech ? 1 : 0.92,
          fontStyle: isSpeech ? 'italic' : undefined,
          overflowWrap: 'anywhere',
        }}
      >
        {isSpeech ? renderMentions(e.message) : <RadioMessage text={e.message} href={hasEntity ? e.link : undefined} />}
        {isSpeech && (
          <span aria-hidden style={{ marginLeft: '0.6rem', opacity: 0.85 }}>
            {isImageIcon(e.icon) ? null : (e.icon || '✦')}
          </span>
        )}
      </p>
      {e.detail && (
        <p className="radio-row-detail" style={{ color: '#F3EDE6', opacity: 0.55 }}>
          {e.detail}
        </p>
      )}
      {isSpeech && e.actor_name && (
        <p className="radio-row-sig" style={{ color: VOICE_SIGNATURE }}>
          — {e.actor_name}
        </p>
      )}
    </div>
  )

  // A row with a destination but no lit entity (e.g. an automatic milestone
  // with a link) stays clickable as a whole. Speech carries its links on the
  // mention pills instead, so it's never a whole-row link.
  const wholeRowLink = e.link && !hasEntity && !isSpeech

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

      {/* Speech is right-aligned, so its clock keeps the LEFT edge. */}
      {isSpeech && (
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

      {/* Automatic moments keep their clock on the right. */}
      {!isSpeech && (
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
  @media (max-width: 640px) {
    .radio-row { padding: 0.65rem 0.05rem; gap: 0.65rem; }
    .radio-row-emblem { width: 1.7rem; font-size: 1.15rem; }
    .radio-row-msg { font-size: 0.85rem; line-height: 1.45; }
    .radio-row-detail { font-size: 0.73rem; margin-top: 0.2rem; }
    .radio-row-sig { font-size: 0.62rem; margin-top: 0.2rem; }
    .radio-row-clock { font-size: 0.58rem; padding-top: 0.3rem; }
    .radio-day-section { margin-bottom: 1.1rem; }
    .radio-signoff { font-size: 0.72rem; margin: 1.75rem 0 0; }
  }
`

export function RadioFeed({ events, members = [], currentUserId = null }: {
  events: RadioEventRow[]
  members?: RadioMember[]
  currentUserId?: string | null
}) {
  const renderMentions = useMentionRenderer(members, currentUserId)

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
      <style dangerouslySetInnerHTML={{ __html: FEED_CSS }} />
      {sections.map(section => (
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
              <RadioRow key={e.id} e={e} last={i === section.items.length - 1} renderMentions={renderMentions} />
            ))}
          </div>
        </section>
      ))}

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
