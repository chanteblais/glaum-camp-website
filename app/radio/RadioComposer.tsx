'use client'

// The member's line to the airwaves — Radio is an interactive heartbeat, not
// an organizer-only megaphone. One quiet input: a moment goes on the air as a
// 'voice' post (no threads, no replies; it may drift down the stream, and
// that's fine).

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RadioComposer() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function post() {
    if (!message.trim() || posting) return
    setPosting(true)
    setError(null)
    try {
      const res = await fetch('/api/radio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to post')
      } else {
        setMessage('')
        router.refresh()
      }
    } catch {
      setError('Network error')
    }
    setPosting(false)
  }

  return (
    <div style={{ marginBottom: '2.25rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') post() }}
          maxLength={200}
          placeholder="Put a moment on the air…"
          style={{
            flex: 1,
            minWidth: 0,
            background: 'rgba(26,10,36,0.5)',
            border: '1px solid rgba(200,168,72,0.2)',
            borderRadius: '9999px',
            color: '#F3EDE6',
            padding: '0.6rem 1.1rem',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          onClick={post}
          disabled={posting || !message.trim()}
          style={{
            flexShrink: 0,
            padding: '0.55rem 1.2rem',
            borderRadius: '9999px',
            border: '1px solid rgba(200,168,72,0.35)',
            background: 'rgba(200,168,72,0.1)',
            color: '#C8A848',
            fontSize: '0.78rem',
            letterSpacing: '0.08em',
            cursor: posting || !message.trim() ? 'default' : 'pointer',
            opacity: posting || !message.trim() ? 0.45 : 1,
          }}
        >
          {posting ? 'On air…' : '✦ Broadcast'}
        </button>
      </div>
      {error && (
        <p style={{ margin: '0.4rem 0 0 1.1rem', fontSize: '0.72rem', color: '#ff8080', opacity: 0.85 }}>{error}</p>
      )}
    </div>
  )
}
