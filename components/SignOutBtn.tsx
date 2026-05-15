'use client'

export function SignOutBtn() {
  return (
    <a
      href="/api/sign-out"
      onClick={() => {
        window.localStorage.removeItem('glaum-auth-signed-in')
        window.localStorage.removeItem('glaum-auth-first-name')
        window.localStorage.removeItem('glaum-auth-email')
      }}
      style={{
        display: 'inline-block',
        border: '1px solid rgba(200,168,72,0.2)',
        borderRadius: '9999px',
        padding: '0.4rem 1rem',
        color: '#F3EDE6',
        fontSize: '0.75rem',
        letterSpacing: '0.08em',
        cursor: 'pointer',
        opacity: 0.5,
        background: 'none',
        textDecoration: 'none',
      }}
    >
      Sign out
    </a>
  )
}
