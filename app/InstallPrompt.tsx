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

// The iOS "Share" glyph: a box with an upward arrow. Rendered inline so the
// hint points at the exact button to tap.
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.1em"
      height="1.1em"
      fill="none"
      stroke={GOLD}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ verticalAlign: '-0.2em', margin: '0 0.15em' }}
    >
      <path d="M12 3v12" />
      <path d="M8.5 6.5 12 3l3.5 3.5" />
      <path d="M7 9H6.5A1.5 1.5 0 0 0 5 10.5v8A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 9H17" />
    </svg>
  )
}

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

// iOS only lets Safari add web apps to the home screen — third-party browsers
// (all WebKit-based, but denied the install action by Apple) simply don't have
// the option. Detect the obvious ones so we can tell the user to switch to
// Safari. Brave on iOS mimics Safari's UA and can't be reliably distinguished,
// so it falls through to the generic "only works in Safari" caveat.
function iosOtherBrowserName(): string | null {
  if (typeof window === 'undefined') return null
  const ua = window.navigator.userAgent
  if (/CriOS/i.test(ua)) return 'Chrome'
  if (/FxiOS/i.test(ua)) return 'Firefox'
  if (/EdgiOS/i.test(ua)) return 'Edge'
  if (/OPiOS|OPT\//i.test(ua)) return 'Opera'
  return null
}

// A dismissible prompt encouraging members to install the PWA to their home
// screen. Android/Chrome fires `beforeinstallprompt`, which we defer and trigger
// from our own button. iOS has no such API, so we show the manual Share-sheet
// instructions instead. Hidden entirely once installed or once dismissed.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const [iosOther, setIosOther] = useState<string | null>(null)

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
      const other = iosOtherBrowserName()
      iosTimer = setTimeout(() => {
        setIosOther(other)
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
          iosOther ? (
            <span>
              To add <strong style={{ color: GOLD }}>{SITE_NAME}</strong> to your home screen on
              iPhone, open this page in <strong>Safari</strong> (it isn’t possible in {iosOther}) —
              then tap Share <ShareIcon /> and <strong>Add to Home Screen</strong>.
            </span>
          ) : (
            <span>
              Add <strong style={{ color: GOLD }}>{SITE_NAME}</strong> to your home screen: tap Share{' '}
              <ShareIcon /> then <strong>Add to Home Screen</strong>. On iPhone this only works in{' '}
              <strong>Safari</strong>.
            </span>
          )
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
