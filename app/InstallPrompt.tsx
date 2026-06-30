'use client'

import { useEffect, useState } from 'react'
import { SITE_NAME } from '@/lib/site-config'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'glaum-install-dismissed'

const INK = '#1A0A24'
const GOLD = '#C8A848'
const CREAM = '#F3EDE6'

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

// A dismissible prompt encouraging members to install the PWA to their home
// screen. Android/Chrome fires `beforeinstallprompt`, which we defer and trigger
// from our own button. iOS has no such API, so we show the manual Share-sheet
// instructions instead. Hidden entirely once installed or once dismissed.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY)) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // iOS never fires beforeinstallprompt — show the manual hint after a beat.
    let iosTimer: ReturnType<typeof setTimeout> | undefined
    if (isIos()) {
      iosTimer = setTimeout(() => {
        setIosHint(true)
        setShow(true)
      }, 2500)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  if (!show) return null

  const dismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    dismiss()
  }

  return (
    <div
      role="dialog"
      aria-label={`Install ${SITE_NAME}`}
      style={{
        position: 'fixed',
        left: '0.75rem',
        right: '0.75rem',
        bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 9999,
        margin: '0 auto',
        maxWidth: 480,
        background: INK,
        border: `1px solid ${GOLD}`,
        borderRadius: 14,
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        padding: '0.9rem 1rem',
        color: CREAM,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontFamily: 'var(--font-libre-baskerville), Georgia, serif',
      }}
    >
      <img
        src="/favicon/android-chrome-192x192.png"
        alt=""
        width={40}
        height={40}
        style={{ borderRadius: 8, flex: '0 0 auto' }}
      />
      <div style={{ flex: '1 1 auto', minWidth: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>
        {iosHint ? (
          <span>
            Add <strong style={{ color: GOLD }}>{SITE_NAME}</strong> to your home screen: tap the
            Share icon, then <strong>Add to Home Screen</strong>.
          </span>
        ) : (
          <span>
            Install <strong style={{ color: GOLD }}>{SITE_NAME}</strong> for quick access and a
            full-screen experience.
          </span>
        )}
      </div>
      {!iosHint && deferred && (
        <button
          onClick={install}
          style={{
            flex: '0 0 auto',
            background: GOLD,
            color: INK,
            border: 'none',
            borderRadius: 8,
            padding: '0.45rem 0.85rem',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          flex: '0 0 auto',
          background: 'transparent',
          color: CREAM,
          border: 'none',
          fontSize: '1.25rem',
          lineHeight: 1,
          cursor: 'pointer',
          padding: '0 0.25rem',
        }}
      >
        ×
      </button>
    </div>
  )
}
