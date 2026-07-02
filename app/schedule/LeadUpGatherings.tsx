'use client'

import { useState, useEffect } from 'react'

type LeadUpEvent = {
  id: string
  title: string
  description: string | null
  event_date: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  link: string | null
  host: string | null
  image_url: string | null
  rsvp_count: number
  rsvped: boolean
}

// "2026-07-08" → { weekday: "TUE", date: "Jul 8" }
function formatDate(d: string | null): { weekday: string; date: string } {
  if (!d) return { weekday: '', date: 'TBD' }
  const dt = new Date(d + 'T00:00:00')
  if (isNaN(dt.getTime())) return { weekday: '', date: d }
  return {
    weekday: dt.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
}

function timeLabel(ev: LeadUpEvent): string {
  return [ev.start_time, ev.end_time].filter(Boolean).join(' – ')
}

export function LeadUpGatherings() {
  const [events, setEvents] = useState<LeadUpEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/lead-up-events')
      .then(r => r.ok ? r.json() : { events: [] })
      .then(json => setEvents(json.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleRsvp = async (ev: LeadUpEvent) => {
    setPending(ev.id)
    // Optimistic update; the server response is authoritative.
    const next = !ev.rsvped
    setEvents(prev => prev.map(e => e.id === ev.id
      ? { ...e, rsvped: next, rsvp_count: e.rsvp_count + (next ? 1 : -1) }
      : e))
    try {
      const res = await fetch(`/api/lead-up-events/${ev.id}/rsvp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvp: next }),
      })
      if (res.ok) {
        const json = await res.json()
        setEvents(prev => prev.map(e => e.id === ev.id
          ? { ...e, rsvped: json.rsvped, rsvp_count: json.count } : e))
      } else {
        // Revert on failure.
        setEvents(prev => prev.map(e => e.id === ev.id ? { ...ev } : e))
      }
    } catch {
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...ev } : e))
    } finally {
      setPending(null)
    }
  }

  // Hide the whole section when there's nothing to show.
  if (loading || events.length === 0) return null

  return (
    <div style={{ marginBottom: '3.5rem' }}>
      <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '0.78rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.9, textAlign: 'center', margin: '0 0 0.4rem' }}>
        Before We Gather
      </p>
      <p style={{ fontSize: '0.82rem', opacity: 0.5, textAlign: 'center', fontStyle: 'italic', margin: '0 0 1.75rem' }}>
        Planning &amp; brainstorming sessions on the way to camp — let us know if you'll join.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {events.map(ev => {
          const { weekday, date } = formatDate(ev.event_date)
          const time = timeLabel(ev)
          return (
            <div key={ev.id} style={{
              borderRadius: '1rem', overflow: 'hidden',
              border: '1px solid rgba(200,168,72,0.2)', background: 'rgba(10,0,20,0.45)',
            }}>
              {ev.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ev.image_url} alt="" style={{ width: '100%', height: '170px', objectFit: 'cover', display: 'block', borderBottom: '1px solid rgba(200,168,72,0.15)' }} />
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.1rem', padding: '1.1rem 1.25rem' }}>
              {/* Date block */}
              <div style={{
                flexShrink: 0, width: '64px', textAlign: 'center',
                padding: '0.5rem 0.4rem', border: '1px solid rgba(200,168,72,0.25)',
                borderRadius: '0.6rem', background: 'rgba(200,168,72,0.07)',
              }}>
                <p style={{ fontSize: '0.58rem', letterSpacing: '0.1em', color: '#C8A848', opacity: 0.65, margin: '0 0 0.15rem' }}>{weekday}</p>
                <p style={{ fontSize: '0.78rem', color: '#C8A848', margin: 0, letterSpacing: '0.02em' }}>{date}</p>
              </div>

              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '1rem', color: '#EDE0C8', margin: '0 0 0.25rem', fontFamily: 'TokyoDreams, serif' }}>{ev.title}</p>
                {(time || ev.location || ev.host) && (
                  <p style={{ fontSize: '0.75rem', color: '#C8A848', opacity: 0.6, margin: '0 0 0.4rem' }}>
                    {[time, ev.location, ev.host && `with ${ev.host}`].filter(Boolean).join('  ·  ')}
                  </p>
                )}
                {ev.description && (
                  <p style={{ fontSize: '0.84rem', opacity: 0.7, lineHeight: 1.6, margin: '0 0 0.5rem' }}>{ev.description}</p>
                )}
                {ev.link && (
                  <a href={ev.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: '#D239F8', textDecoration: 'none', opacity: 0.85 }}>
                    Join link →
                  </a>
                )}
              </div>

              {/* RSVP */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                <button
                  onClick={() => toggleRsvp(ev)}
                  disabled={pending === ev.id}
                  style={{
                    padding: '0.4rem 0.9rem', borderRadius: '9999px', cursor: 'pointer',
                    fontSize: '0.76rem', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                    border: ev.rsvped ? '1px solid rgba(200,168,72,0.6)' : '1px solid rgba(200,168,72,0.25)',
                    background: ev.rsvped ? 'rgba(200,168,72,0.15)' : 'transparent',
                    color: ev.rsvped ? '#FFFACD' : '#C8A848',
                    opacity: pending === ev.id ? 0.5 : 1, transition: 'all 0.15s',
                  }}
                >
                  {ev.rsvped ? '✓ Going' : "I'll be there"}
                </button>
                {ev.rsvp_count > 0 && (
                  <span style={{ fontSize: '0.68rem', opacity: 0.4 }}>
                    {ev.rsvp_count} {ev.rsvp_count === 1 ? 'going' : 'going'}
                  </span>
                )}
              </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)', margin: '3rem 0 0' }} />
    </div>
  )
}
