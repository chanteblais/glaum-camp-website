'use client'

import { useState } from 'react'
import Link from 'next/link'

const navLinks = [
  { href: '#about', label: 'About' },
  { href: '#participate', label: 'Participate' },
  { href: '#schedule', label: 'Schedule' },
  { href: '/apply', label: 'Apply' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

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
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'TokyoDreams, serif',
            fontSize: '1.4rem',
            color: '#C8A848',
            textDecoration: 'none',
            letterSpacing: '0.05em',
            textShadow: '0 0 20px rgba(210, 57, 248, 0.6)',
          }}
        >
          Glåüm
          <span style={{ color: '#F3EDE6', fontSize: '0.65rem', letterSpacing: '0.15em', marginLeft: '0.5rem', fontFamily: 'var(--font-libre-baskerville)', opacity: 0.6 }}>
            sponsored by Shrimp™
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', gap: '2rem' }} className="hidden md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: '#F3EDE6',
                textDecoration: 'none',
                fontSize: '0.85rem',
                letterSpacing: '0.08em',
                opacity: 0.8,
                transition: 'opacity 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.color = '#C8A848'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8'
                e.currentTarget.style.color = '#F3EDE6'
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            color: '#C8A848',
          }}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.2rem' }}>
            {menuOpen ? '✕' : '≡'}
          </span>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav
          style={{
            backgroundColor: 'rgba(26, 10, 36, 0.97)',
            borderTop: '1px solid rgba(200, 168, 72, 0.15)',
            padding: '1rem 1.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                color: '#F3EDE6',
                textDecoration: 'none',
                fontSize: '1rem',
                letterSpacing: '0.08em',
                padding: '0.5rem 0',
                borderBottom: '1px solid rgba(200, 168, 72, 0.1)',
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
