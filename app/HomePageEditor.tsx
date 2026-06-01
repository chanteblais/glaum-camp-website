'use client'

import { useState, useCallback } from 'react'

type Content = Record<string, string>

const FIELDS = [
  { key: 'home_tagline',             label: 'Hero Tagline',           multiline: false },
  { key: 'home_quote',               label: 'Hero Quote Card',        multiline: false },
  { key: 'home_about_heading',       label: 'About — Heading',        multiline: false },
  { key: 'home_about_body',          label: 'About — Body',           multiline: true  },
  { key: 'home_participate_heading', label: 'Participate — Heading',  multiline: false },
  { key: 'home_participate_body',    label: 'Participate — Body',     multiline: true  },
]

const inputBase: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(200,168,72,0.35)',
  borderRadius: '0.5rem',
  padding: '0.65rem 0.85rem',
  color: '#F3EDE6',
  fontSize: '0.9rem',
  fontFamily: 'var(--font-libre-baskerville), Georgia, serif',
  outline: 'none',
  lineHeight: 1.6,
  resize: 'vertical' as const,
  boxSizing: 'border-box' as const,
}

export function HomePageEditor({ initialContent }: { initialContent: Content }) {
  const [open, setOpen]       = useState(false)
  const [content, setContent] = useState<Content>(initialContent)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleChange = useCallback((key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/page-content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    })
    if (res.ok) {
      setSaved(true)
      // Reload to reflect changes in the server-rendered page
      setTimeout(() => window.location.reload(), 400)
    } else {
      const json = await res.json()
      setError(json.error ?? 'Something went wrong')
    }
    setSaving(false)
  }

  return (
    <>
      {/* Floating toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 200,
          padding: '0.55rem 1.1rem',
          borderRadius: '9999px',
          border: `1px solid ${open ? 'rgba(210,57,248,0.6)' : 'rgba(200,168,72,0.4)'}`,
          background: open ? 'rgba(210,57,248,0.12)' : 'rgba(10,0,20,0.85)',
          color: open ? '#D239F8' : '#C8A848',
          fontSize: '0.72rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s',
        }}
      >
        {open ? '✕ Close Editor' : '✎ Edit Page'}
      </button>

      {/* Slide-in panel */}
      {open && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '420px',
          maxWidth: '100vw',
          height: '100vh',
          overflowY: 'auto',
          zIndex: 199,
          background: 'rgba(12,4,24,0.97)',
          borderLeft: '1px solid rgba(210,57,248,0.2)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
          padding: '2rem 1.5rem 6rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}>
          {/* Header */}
          <div style={{ marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.75, margin: '0 0 0.4rem' }}>
              Admin
            </p>
            <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.4rem', color: '#C8A848', margin: 0 }}>
              Edit Homepage
            </p>
            <p style={{ fontSize: '0.78rem', opacity: 0.4, marginTop: '0.3rem', lineHeight: 1.5 }}>
              Changes go live immediately on save. Use blank lines to separate paragraphs in body fields.
            </p>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)' }} />

          {/* Fields */}
          {FIELDS.map(field => (
            <div key={field.key}>
              <label style={{ display: 'block', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, marginBottom: '0.45rem' }}>
                {field.label}
              </label>
              {field.multiline ? (
                <textarea
                  value={content[field.key] ?? ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  rows={6}
                  style={inputBase}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.35)' }}
                />
              ) : (
                <input
                  type="text"
                  value={content[field.key] ?? ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  style={inputBase}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.35)' }}
                />
              )}
            </div>
          ))}

          {error && (
            <p style={{ fontSize: '0.82rem', color: '#ff6b6b', margin: 0 }}>{error}</p>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid rgba(200,168,72,0.5)',
              background: saved ? 'rgba(100,200,120,0.1)' : 'rgba(200,168,72,0.08)',
              color: saved ? '#7dcf8e' : '#FFFACD',
              fontFamily: 'TokyoDreams, serif',
              fontSize: '0.85rem',
              letterSpacing: '0.1em',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved — reloading' : 'Save Changes'}
          </button>
        </div>
      )}
    </>
  )
}
