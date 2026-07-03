'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'

// In-app confirmation in the site's language — replaces the native browser
// confirm() dialog. Use via the useConfirm() hook:
//
//   const { confirm, confirmDialog } = useConfirm()
//   ...
//   if (!(await confirm({ title: 'Delete this group?', danger: true }))) return
//   ...
//   return <div>...{confirmDialog}</div>

export type ConfirmOptions = {
  title: string
  body?: string
  eyebrow?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  // Notice mode: a single acknowledge button instead of a cancel/confirm pair
  // (replaces native alert()). The promise still resolves true.
  notice?: boolean
}

export function useConfirm() {
  const [pending, setPending] = useState<{ opts: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>(resolve => setPending({ opts, resolve })),
    [],
  )

  const settle = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  const confirmDialog: ReactNode = pending ? (
    <ConfirmDialog {...pending.opts} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
  ) : null

  return { confirm, confirmDialog }
}

export function ConfirmDialog({
  title, body, eyebrow, confirmLabel, cancelLabel = 'Never mind', danger = false, notice = false, onConfirm, onCancel,
}: ConfirmOptions & {
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const accentBorder = danger ? 'rgba(255,80,80,0.45)' : 'rgba(200,168,72,0.55)'
  const accentBg = danger ? 'rgba(255,80,80,0.1)' : 'rgba(200,168,72,0.14)'
  const eyebrowText = eyebrow ?? (notice ? 'A small snag' : 'A moment of pause')
  const confirmText = confirmLabel ?? (notice ? 'Understood' : 'Confirm')

  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 60 }} />
      <div
        role="alertdialog"
        aria-modal="true"
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 61,
          background: '#1A0A24', border: '1px solid rgba(200,168,72,0.4)', borderRadius: '1rem',
          padding: '1.6rem 1.75rem', width: '90%', maxWidth: '380px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(200,168,72,0.08)',
        }}
      >
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.85, margin: '0 0 0.6rem' }}>
          ✦ {eyebrowText}
        </p>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.2rem', color: '#F3EDE6', margin: 0, lineHeight: 1.3 }}>
          {title}
        </p>
        {body && (
          <p style={{ fontSize: '0.82rem', color: '#F3EDE6', opacity: 0.7, margin: '0.6rem 0 0', lineHeight: 1.5 }}>
            {body}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.4rem' }}>
          {!notice && (
            <button
              onClick={onCancel}
              style={{ padding: '0.5rem 1.1rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.7 }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            autoFocus
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '9999px', cursor: 'pointer',
              fontSize: '0.8rem', letterSpacing: '0.05em', color: '#F3EDE6',
              border: `1px solid ${accentBorder}`, background: accentBg,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>
  )
}
