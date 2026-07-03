'use client'

// The on-page announcement composer — broadcasters only (mockup decision
// 2026-07-03: Radio writing is gated, not open-mic; member 'voice' posting
// is out of the UI for now, the kind stays reserved in the schema). Posts go
// through the admin broadcast route. Non-broadcasters see the composer
// locked — the feed is theirs to read, the mic is not.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const INPUT_ID = 'radio-composer-input'

export function RadioComposer({ isBroadcaster }: { isBroadcaster: boolean }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function post() {
    if (!message.trim() || posting || !isBroadcaster) return
    setPosting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/radio', {
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
    <div style={{ marginBottom: '2.5rem' }}>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          padding: '0.65rem 0.65rem 0.65rem 1.1rem',
          borderRadius: '0.9rem',
          border: '1px solid rgba(200,168,72,0.18)',
          background: 'rgba(243,237,230,0.03)',
        }}
      >
        <span aria-hidden style={{ color: '#C8A848', opacity: 0.7, fontSize: '1.05rem' }}>🎙</span>
        <input
          id={INPUT_ID}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') post() }}
          maxLength={280}
          disabled={!isBroadcaster}
          placeholder="Share an announcement with camp…"
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            color: '#F3EDE6',
            fontSize: '0.92rem',
            fontStyle: 'italic',
            fontFamily: 'inherit',
            outline: 'none',
            opacity: isBroadcaster ? 1 : 0.45,
          }}
        />
        <button
          onClick={post}
          disabled={posting || !message.trim() || !isBroadcaster}
          style={{
            flexShrink: 0,
            padding: '0.55rem 1.25rem',
            borderRadius: '0.6rem',
            border: '1px solid rgba(200,168,72,0.45)',
            background: 'rgba(200,168,72,0.16)',
            color: '#C8A848',
            fontSize: '0.75rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: posting || !message.trim() || !isBroadcaster ? 'default' : 'pointer',
            opacity: !isBroadcaster ? 0.35 : posting || !message.trim() ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {posting ? 'On air…' : 'On Air ✦'}
        </button>
      </div>
      {!isBroadcaster && (
        <p style={{ margin: '0.4rem 0 0 1.1rem', fontSize: '0.68rem', color: '#F3EDE6', opacity: 0.35, letterSpacing: '0.05em' }}>
          🔒 Broadcasters only.
        </p>
      )}
      {error && (
        <p style={{ margin: '0.4rem 0 0 1.1rem', fontSize: '0.72rem', color: '#ff8080', opacity: 0.85 }}>{error}</p>
      )}
    </div>
  )
}

// The bottom-of-feed call to broadcast — scrolls back up to the composer.
export function GoLiveBar() {
  return (
    <button
      onClick={() => {
        const input = document.getElementById(INPUT_ID) as HTMLInputElement | null
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => input?.focus({ preventScroll: true }), 450)
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        width: '100%',
        marginTop: '2rem',
        padding: '1rem 1.4rem',
        borderRadius: '0.9rem',
        border: '1px solid rgba(200,168,72,0.25)',
        background: 'rgba(210,57,248,0.05)',
        color: '#C8A848',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <span aria-hidden style={{ fontSize: '0.95rem', opacity: 0.85 }}>((•))</span>
      <span style={{ fontSize: '0.78rem', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Go Live</span>
      <span style={{ fontSize: '0.85rem', color: '#F3EDE6', opacity: 0.55 }}>Share an announcement with everyone.</span>
      <span aria-hidden style={{ marginLeft: 'auto', opacity: 0.6 }}>→</span>
    </button>
  )
}
