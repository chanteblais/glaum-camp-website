'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'Georgia, serif',
      color: '#F3EDE6',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '1rem', opacity: 0.85 }}>
        ✦ &nbsp;Something went wrong&nbsp; ✦
      </p>
      <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', color: '#C8A848', marginBottom: '1.5rem', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
        An error occurred
      </h2>
      <p style={{ fontSize: '0.9rem', opacity: 0.5, marginBottom: '2rem', maxWidth: '400px', lineHeight: 1.7 }}>
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.6rem 1.75rem',
          borderRadius: '9999px',
          border: '1px solid rgba(200,168,72,0.5)',
          background: 'transparent',
          color: '#FFFACD',
          fontSize: '0.82rem',
          fontFamily: 'TokyoDreams, serif',
          letterSpacing: '0.1em',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}
