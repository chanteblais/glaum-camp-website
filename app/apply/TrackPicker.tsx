'use client'

export function TrackPicker({ hideMember = false, hideVolunteer = false }: { hideMember?: boolean; hideVolunteer?: boolean }) {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
      <img src="/hands-left.svg" alt="" aria-hidden style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <a href="/" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.6 }}>
            ← Back to camp
          </a>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '1rem', opacity: 0.85 }}>
            What If 2026
          </p>
          <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', lineHeight: 1.1, marginBottom: '0.75rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
            How would you like to join?
          </h1>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.8, opacity: 0.55, maxWidth: '480px', margin: '0 auto' }}>
            Choose the path that fits you best. You can always reach out if you have questions.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: hideMember || hideVolunteer ? '1fr' : '1fr 1fr', gap: '1.25rem', maxWidth: hideMember || hideVolunteer ? '400px' : undefined, margin: hideMember || hideVolunteer ? '0 auto' : undefined }}>
          {/* Member */}
          {!hideMember && <a href="/apply?track=member" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '2rem 1.75rem',
              border: '1px solid rgba(200,168,72,0.3)',
              borderRadius: '1rem',
              background: 'rgba(200,168,72,0.04)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
              height: '100%',
              boxSizing: 'border-box',
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'rgba(200,168,72,0.65)'
                el.style.background = 'rgba(200,168,72,0.08)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'rgba(200,168,72,0.3)'
                el.style.background = 'rgba(200,168,72,0.04)'
              }}
            >
              <p style={{ fontSize: '1.6rem', marginBottom: '0.75rem', lineHeight: 1 }}>✦</p>
              <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.3rem', color: '#C8A848', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>
                Camp Member
              </p>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.7, opacity: 0.55, margin: 0 }}>
                Apply for full membership — fill out an application and join the community as a Glåüm member.
              </p>
            </div>
          </a>}

          {/* Volunteer */}
          {!hideVolunteer && <a href="/volunteer" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '2rem 1.75rem',
              border: '1px solid rgba(210,57,248,0.25)',
              borderRadius: '1rem',
              background: 'rgba(210,57,248,0.03)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
              height: '100%',
              boxSizing: 'border-box',
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'rgba(210,57,248,0.55)'
                el.style.background = 'rgba(210,57,248,0.08)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'rgba(210,57,248,0.25)'
                el.style.background = 'rgba(210,57,248,0.03)'
              }}
            >
              <p style={{ fontSize: '1.6rem', marginBottom: '0.75rem', lineHeight: 1 }}>🤝</p>
              <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.3rem', color: '#D239F8', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>
                Volunteer
              </p>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.7, opacity: 0.55, margin: 0 }}>
                Sign up as a volunteer — help with setup, teardown, or other roles without a full membership application.
              </p>
            </div>
          </a>}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', opacity: 0.3, marginTop: '2.5rem', letterSpacing: '0.05em' }}>
          Not sure? Reach out to an organiser before applying.
        </p>
      </div>
    </div>
  )
}
