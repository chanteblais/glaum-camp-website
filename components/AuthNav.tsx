'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth, useUser } from '@clerk/nextjs'

export function AuthNav() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const userFirstName = user?.firstName
  const userEmail = user?.primaryEmailAddress?.emailAddress
  const initials = userFirstName?.[0] ?? '✦'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!isSignedIn) {
    return (
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
  }

  return (
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
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,168,72,0.25)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,168,72,0.7)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,168,72,0.15)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,168,72,0.4)'
        }}
        aria-label="Account menu"
      >
        {initials}
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
            { href: '/profile', label: 'My Profile' },
            { href: '/admin', label: 'Admin' },
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
            style={{
              display: 'block',
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              letterSpacing: '0.06em',
              color: '#F3EDE6',
              textDecoration: 'none',
              opacity: 0.4,
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
  )
}
