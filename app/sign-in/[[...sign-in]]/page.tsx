import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <p
        style={{
          fontFamily: 'TokyoDreams, serif',
          fontSize: '1.8rem',
          color: '#C8A848',
          marginBottom: '0.5rem',
          textShadow: '0 0 30px rgba(210,57,248,0.4)',
        }}
      >
        Glåüm
      </p>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: '#D239F8', opacity: 0.7, marginBottom: '2rem' }}>
        MEMBER ACCESS
      </p>
      <SignIn />
    </div>
  )
}
