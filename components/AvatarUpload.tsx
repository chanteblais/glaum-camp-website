'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export function AvatarUpload({
  initialUrl,
  displayName,
}: {
  initialUrl: string | null
  displayName: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setPreview(initialUrl) // revert on error
        setError(data.error ?? 'Upload failed')
        return
      }

      setPreview(data.avatarUrl)
      router.refresh()
    } finally {
      setUploading(false)
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile picture"
        style={{
          position: 'relative',
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          border: '2px solid rgba(200,168,72,0.3)',
          background: 'rgba(200,168,72,0.08)',
          cursor: uploading ? 'wait' : 'pointer',
          overflow: 'hidden',
          padding: 0,
          flexShrink: 0,
        }}
      >
        {/* Avatar image or initials */}
        {preview ? (
          <img
            src={preview}
            alt={displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{
            fontFamily: 'TokyoDreams, serif',
            fontSize: '1.6rem',
            color: '#C8A848',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}>
            {initials}
          </span>
        )}

        {/* Hover / uploading overlay */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
            background: 'rgba(10,4,20,0.6)',
            opacity: uploading ? 1 : 0,
            transition: 'opacity 0.2s',
            fontSize: '0.6rem',
            letterSpacing: '0.1em',
            color: '#F3EDE6',
          }}
          className="avatar-overlay"
        >
          {uploading ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span>Uploading</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>Change</span>
            </>
          )}
        </span>
      </button>

      {error && (
        <p style={{ fontSize: '0.72rem', color: '#ff8a8a', textAlign: 'center', maxWidth: '160px' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <style>{`
        button:hover .avatar-overlay { opacity: 1 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
