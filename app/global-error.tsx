'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
    <html>
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#1A0A24',
        color: '#F3EDE6',
        fontFamily: 'Georgia, serif',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '1rem', opacity: 0.85 }}>
          ✦ &nbsp;Something went wrong&nbsp; ✦
        </p>
        <h2 style={{ fontSize: '2rem', color: '#C8A848', marginBottom: '1.5rem' }}>
          Glåüm encountered an error
        </h2>
        <p style={{ fontSize: '0.9rem', opacity: 0.5, marginBottom: '2rem', maxWidth: '400px', lineHeight: 1.7 }}>
          {error.message || 'An unexpected error occurred.'}
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
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
