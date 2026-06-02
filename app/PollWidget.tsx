'use client'

import { useState } from 'react'

type Poll = {
  id: string
  question: string
  options: string[]
  allow_multiple: boolean
  expires_at: string | null
  initialCounts: number[]
  initialUserVotes: number[]
}

function PollItem({ poll }: { poll: Poll }) {
  const [counts, setCounts] = useState(poll.initialCounts)
  const [userVotes, setUserVotes] = useState<number[]>(poll.initialUserVotes)
  const [pending, setPending] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const hasVoted = userVotes.length > 0
  const total = counts.reduce((a, b) => a + b, 0)

  async function vote(idx: number) {
    if (pending.length > 0) return
    let next: number[]
    if (poll.allow_multiple) {
      next = userVotes.includes(idx) ? userVotes.filter(v => v !== idx) : [...userVotes, idx]
    } else {
      next = [idx]
    }
    setPending(next)
    setError(null)
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_indexes: next }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed'); return }
      setCounts(json.counts)
      setUserVotes(json.userVotes)
    } catch {
      setError('Something went wrong')
    } finally {
      setPending([])
    }
  }

  const expired = poll.expires_at ? new Date(poll.expires_at) < new Date() : false

  return (
    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(200,168,72,0.08)' }}>
      <p style={{ fontSize: '0.88rem', color: '#EDE0C8', margin: '0 0 0.85rem', lineHeight: 1.5 }}>
        {poll.question}
        {poll.allow_multiple && (
          <span style={{ fontSize: '0.65rem', color: '#D9B3FF', opacity: 0.7, marginLeft: '0.5rem' }}>
            (select all that apply)
          </span>
        )}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {poll.options.map((opt, i) => {
          const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0
          const isVoted = userVotes.includes(i)
          const isPending = pending.includes(i)

          return (
            <button
              key={i}
              onClick={() => !expired && vote(i)}
              disabled={expired || pending.length > 0}
              style={{
                position: 'relative',
                width: '100%',
                textAlign: 'left',
                background: isVoted ? 'rgba(200,168,72,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isVoted ? 'rgba(200,168,72,0.45)' : 'rgba(200,168,72,0.15)'}`,
                borderRadius: '0.5rem',
                padding: '0.5rem 0.85rem',
                cursor: expired ? 'default' : 'pointer',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
            >
              {/* progress bar fill */}
              {hasVoted && (
                <span style={{
                  position: 'absolute', inset: 0, right: `${100 - pct}%`,
                  background: isVoted ? 'rgba(200,168,72,0.08)' : 'rgba(255,255,255,0.025)',
                  transition: 'right 0.4s ease',
                  pointerEvents: 'none',
                }} />
              )}
              <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.83rem', color: isVoted ? '#C8A848' : '#F3EDE6', opacity: isPending ? 0.6 : 1 }}>
                  {isVoted && '✓ '}{opt}
                </span>
                {hasVoted && (
                  <span style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.6, flexShrink: 0 }}>
                    {pct}% · {counts[i]}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem' }}>
        {error && <p style={{ fontSize: '0.7rem', color: '#ff8080', margin: 0 }}>{error}</p>}
        <p style={{ fontSize: '0.68rem', opacity: 0.3, margin: 0, marginLeft: 'auto' }}>
          {total} {total === 1 ? 'vote' : 'votes'}{expired ? ' · closed' : ''}
        </p>
      </div>
    </div>
  )
}

export function PollWidget({ polls }: { polls: Poll[] }) {
  if (polls.length === 0) return null

  return (
    <div style={{
      border: '1px solid rgba(200,168,72,0.25)',
      borderRadius: '1rem',
      background: 'rgba(10,0,20,0.5)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '1rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(200,168,72,0.12)' }}>
        <p style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, margin: 0 }}>
          Polls
        </p>
      </div>
      <div>
        {polls.map((poll, i) => (
          <div key={poll.id} style={{ borderBottom: i < polls.length - 1 ? '1px solid rgba(200,168,72,0.08)' : 'none' }}>
            <PollItem poll={poll} />
          </div>
        ))}
      </div>
    </div>
  )
}
