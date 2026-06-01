'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth, useUser } from '@clerk/nextjs'
import { UserNotificationBell } from './UserNotificationBell'
import { NotificationBell } from '@/app/admin/NotificationBell'
import { MessagesNavLink } from './MessagesNavLink'

const AUTH_MEMORY_KEY = 'glaum-auth-signed-in'
const AUTH_NAME_KEY = 'glaum-auth-first-name'
const AUTH_EMAIL_KEY = 'glaum-auth-email'

type NavAuthState = {
  isSignedIn: boolean
  isApproved?: boolean
  firstName?: string | null
  email?: string | null
  avatarUrl?: string | null
}

const publicNavLinks = [
  { href: '#about', label: 'About' },
  { href: '#participate', label: 'Participate' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/apply', label: 'Apply' },
]

const memberNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/members', label: 'Many Hands' },
  { href: '/messages', label: 'Messages', badge: true },
  { href: '/profile', label: 'My Profile' },
]

export function HeaderClient() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const [mounted, setMounted] = useState(false)
  const [serverAuth, setServerAuth] = useState<NavAuthState | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [hasRememberedAuth, setHasRememberedAuth] = useState(false)
  const [rememberedFirstName, setRememberedFirstName] = useState<string | null>(null)
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const signedIn = mounted && (Boolean(isSignedIn) || Boolean(serverAuth?.isSignedIn) || hasRememberedAuth)
  const isApproved = Boolean(serverAuth?.isApproved)
  const userFirstName = user?.firstName ?? serverAuth?.firstName ?? rememberedFirstName
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? serverAuth?.email ?? rememberedEmail
  const avatarUrl = serverAuth?.avatarUrl ?? null
  const initials = userFirstName?.[0] ?? '✦'
  const isAdmin = user?.publicMetadata?.role === 'admin'
  const activeNavLinks = signedIn && isApproved ? memberNavLinks : publicNavLinks

  useEffect(() => {
    setMounted(true)

    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const params = new URLSearchParams(window.location.search)
    if (params.get('signed_in') === '1') {
      window.localStorage.setItem(AUTH_MEMORY_KEY, 'true')
      params.delete('signed_in')
      const nextSearch = params.toString()
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`
      )
    }

    setHasRememberedAuth(window.localStorage.getItem(AUTH_MEMORY_KEY) === 'true')
    setRememberedFirstName(window.localStorage.getItem(AUTH_NAME_KEY))
    setRememberedEmail(window.localStorage.getItem(AUTH_EMAIL_KEY))

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const firstName = user?.firstName ?? serverAuth?.firstName
    const email = user?.primaryEmailAddress?.emailAddress ?? serverAuth?.email

    if (firstName) {
      window.localStorage.setItem(AUTH_NAME_KEY, firstName)
      setRememberedFirstName(firstName)
    }

    if (email) {
      window.localStorage.setItem(AUTH_EMAIL_KEY, email)
      setRememberedEmail(email)
    }
  }, [mounted, user?.firstName, user?.primaryEmailAddress?.emailAddress, serverAuth?.firstName, serverAuth?.email])

  useEffect(() => {
    if (!mounted) return

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const checkAuth = (attempt = 0) => {
      fetch('/api/nav-auth', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: NavAuthState | null) => {
          if (cancelled) return

          if (data?.isSignedIn || attempt >= 3) {
            setServerAuth(data)
            setAuthChecked(true)
            if (data?.isSignedIn) {
              window.localStorage.setItem(AUTH_MEMORY_KEY, 'true')
              setHasRememberedAuth(true)
            } else {
              window.localStorage.removeItem(AUTH_MEMORY_KEY)
              window.localStorage.removeItem(AUTH_NAME_KEY)
              window.localStorage.removeItem(AUTH_EMAIL_KEY)
              setHasRememberedAuth(false)
              setRememberedFirstName(null)
              setRememberedEmail(null)
            }
            return
          }

          timeoutId = setTimeout(() => checkAuth(attempt + 1), 350)
        })
        .catch(() => {
          if (!cancelled) {
            setServerAuth(null)
            setAuthChecked(true)
          }
        })
    }

    checkAuth()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [mounted])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Instantly reflect a new avatar upload without waiting for next nav-auth poll
  useEffect(() => {
    function handleAvatarUpdate(e: Event) {
      const url = (e as CustomEvent).detail?.avatarUrl
      if (url) setServerAuth((prev) => prev ? { ...prev, avatarUrl: url } : prev)
    }
    window.addEventListener('glaum:avatar-updated', handleAvatarUpdate)
    return () => window.removeEventListener('glaum:avatar-updated', handleAvatarUpdate)
  }, [])

  const authSlot = signedIn ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {isAdmin ? <NotificationBell /> : <UserNotificationBell />}
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: 'rgba(200,168,72,0.15)',
          border: '1px solid rgba(200,168,72,0.4)',
          color: '#C8A848',
          fontSize: '0.85rem',
          fontFamily: 'TokyoDreams, serif',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s, border-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(200,168,72,0.25)'
          e.currentTarget.style.borderColor = 'rgba(200,168,72,0.7)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(200,168,72,0.15)'
          e.currentTarget.style.borderColor = 'rgba(200,168,72,0.4)'
        }}
        aria-label="Account menu"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={userFirstName ?? 'Profile'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          />
        ) : initials}
      </button>

      {dropdownOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 0.5rem)',
            backgroundColor: 'rgba(22, 8, 32, 0.98)',
            border: '1px solid rgba(200,168,72,0.2)',
            borderRadius: '0.75rem',
            padding: '0.5rem 0',
            minWidth: '160px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {userFirstName && (
            <div style={{ padding: '0.5rem 1rem 0.75rem', borderBottom: '1px solid rgba(200,168,72,0.1)', marginBottom: '0.25rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#C8A848', opacity: 0.9, margin: 0 }}>{userFirstName}</p>
              {userEmail && <p style={{ fontSize: '0.7rem', color: '#F3EDE6', opacity: 0.4, margin: 0 }}>{userEmail}</p>}
            </div>
          )}
          {[
            ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setDropdownOpen(false)}
              style={{
                display: 'block',
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                letterSpacing: '0.06em',
                color: '#F3EDE6',
                textDecoration: 'none',
                opacity: 0.7,
                transition: 'opacity 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.color = '#C8A848'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7'
                e.currentTarget.style.color = '#F3EDE6'
              }}
            >
              {label}
            </Link>
          ))}
          <div style={{ height: '1px', background: 'rgba(200,168,72,0.1)', margin: '0.25rem 0' }} />
          <a
            href="/api/sign-out"
            onClick={() => {
              window.localStorage.removeItem(AUTH_MEMORY_KEY)
              window.localStorage.removeItem(AUTH_NAME_KEY)
              window.localStorage.removeItem(AUTH_EMAIL_KEY)
              setHasRememberedAuth(false)
              setRememberedFirstName(null)
              setRememberedEmail(null)
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              letterSpacing: '0.06em',
              color: '#F3EDE6',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              opacity: 0.4,
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4' }}
          >
            Sign out
          </a>
        </div>
      )}
    </div>
    </div>
  ) : (
    <Link
      href="/sign-in"
      style={{
        fontSize: '0.75rem',
        letterSpacing: '0.12em',
        color: '#F3EDE6',
        textDecoration: 'none',
        opacity: 0.5,
      }}
    >
      Sign in
    </Link>
  )

  const mobileMenuLink: React.CSSProperties = {
    color: '#F3EDE6',
    textDecoration: 'none',
    fontSize: '1rem',
    letterSpacing: '0.08em',
    padding: '0.75rem 0',
    borderBottom: '1px solid rgba(200,168,72,0.08)',
    display: 'block',
  }

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(26, 10, 36, 0.75)',
        borderBottom: '1px solid rgba(200, 168, 72, 0.2)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
          gap: '1rem',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: 'TokyoDreams, serif',
            fontSize: '1.4rem',
            color: '#C8A848',
            textDecoration: 'none',
            letterSpacing: '0.05em',
            textShadow: '0 0 20px rgba(210, 57, 248, 0.6)',
            flexShrink: 0,
          }}
        >
          Glåüm
          <span style={{ color: '#F3EDE6', fontSize: '0.65rem', letterSpacing: '0.15em', marginLeft: '0.5rem', fontFamily: 'var(--font-libre-baskerville)', opacity: 0.6 }}>
            sponsored by Shrimp™
          </span>
        </Link>

        {/* Desktop nav */}
        {!isMobile && (
          <nav style={{ display: 'flex', gap: '2rem', flex: 1, justifyContent: 'center' }}>
            {activeNavLinks.map((link) => (
              'badge' in link && link.badge ? (
                <MessagesNavLink
                  key={link.href}
                  style={{ color: '#F3EDE6', textDecoration: 'none', fontSize: '0.85rem', letterSpacing: '0.08em', opacity: 0.8 }}
                />
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  style={{ color: '#F3EDE6', textDecoration: 'none', fontSize: '0.85rem', letterSpacing: '0.08em', opacity: 0.8, transition: 'opacity 0.2s, color 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#C8A848' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.color = '#F3EDE6' }}
                >
                  {link.label}
                </a>
              )
            ))}
          </nav>
        )}

        {/* Desktop auth slot */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
            {authSlot}
          </div>
        )}

        {/* Mobile right side: bell (if signed in) + hamburger */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {signedIn && (isAdmin ? <NotificationBell /> : <UserNotificationBell />)}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', color: '#C8A848', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <nav
          style={{
            backgroundColor: 'rgba(20, 8, 30, 0.98)',
            borderTop: '1px solid rgba(200,168,72,0.15)',
            padding: '0.75rem 1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {signedIn && (userFirstName || userEmail) && (
            <div style={{ padding: '0.75rem 0 1rem', marginBottom: '0.25rem', borderBottom: '1px solid rgba(200,168,72,0.15)' }}>
              {userFirstName && <p style={{ fontSize: '0.85rem', color: '#C8A848', opacity: 0.9, margin: 0 }}>{userFirstName}</p>}
              {userEmail && <p style={{ fontSize: '0.72rem', color: '#F3EDE6', opacity: 0.35, margin: '0.2rem 0 0' }}>{userEmail}</p>}
            </div>
          )}

          {activeNavLinks.map((link) => (
            'badge' in link && link.badge ? (
              <MessagesNavLink
                key={link.href}
                style={{ ...mobileMenuLink, display: 'flex', alignItems: 'center' }}
              />
            ) : (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={mobileMenuLink}>
                {link.label}
              </a>
            )
          ))}

          {signedIn && (
            <>
              {isAdmin && (
                <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ ...mobileMenuLink, color: '#C8A848', opacity: 0.7 }}>
                  Admin
                </Link>
              )}
              <a
                href="/api/sign-out"
                onClick={() => {
                  window.localStorage.removeItem(AUTH_MEMORY_KEY)
                  window.localStorage.removeItem(AUTH_NAME_KEY)
                  window.localStorage.removeItem(AUTH_EMAIL_KEY)
                  setHasRememberedAuth(false)
                  setRememberedFirstName(null)
                  setRememberedEmail(null)
                }}
                style={{ ...mobileMenuLink, opacity: 0.4, borderBottom: 'none' }}
              >
                Sign out
              </a>
            </>
          )}

          {!signedIn && (
            <Link href="/sign-in" onClick={() => setMenuOpen(false)} style={{ ...mobileMenuLink, opacity: 0.6, borderBottom: 'none' }}>
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
