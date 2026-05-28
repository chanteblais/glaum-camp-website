'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(200,168,72,0.25)',
  borderRadius: '0.5rem',
  padding: '0.75rem 1rem',
  color: '#F3EDE6',
  fontSize: '0.95rem',
  fontFamily: 'var(--font-libre-baskerville), Georgia, serif',
  outline: 'none',
  transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  letterSpacing: '0.1em',
  color: '#C8A848',
  marginBottom: '0.5rem',
  textTransform: 'uppercase',
}

const DAYS = [
  'Tuesday, Jul 22 — Setup day',
  'Wednesday, Jul 23',
  'Thursday, Jul 24',
  'Friday, Jul 25',
  'Saturday, Jul 26',
  'Sunday, Jul 27 — Teardown',
]

const TIMES = ['Morning', 'Afternoon', 'Evening', 'Flexible']

const SHIFT_INTERESTS = [
  'Welcoming & hosting',
  'Setup & build',
  'Teardown & strike',
  'Kitchen & food',
  'Decor & ambiance',
  'Programming & activities',
  'Cleanup',
  'General help',
]

function CheckboxGroup({ options, name }: { options: string[]; name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {options.map(option => (
        <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: '#F3EDE6', opacity: 0.85 }}>
          <input type="checkbox" name={name} value={option} style={{ width: '1rem', height: '1rem', accentColor: '#D239F8', cursor: 'pointer', flexShrink: 0 }} />
          {option}
        </label>
      ))}
    </div>
  )
}

export function VolunteerForm({ userEmail, userFirstName, userLastName }: {
  userEmail: string
  userFirstName: string
  userLastName: string
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const data = {
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      email: formData.get('email'),
      phone: formData.get('phone') || null,
      days_available: formData.getAll('days_available'),
      preferred_times: formData.getAll('preferred_times'),
      shift_interests: formData.getAll('shift_interests'),
      other_notes: formData.get('other_notes') || null,
    }

    try {
      const res = await fetch('/api/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Submission failed')
      }

      router.push('/profile')
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '1.5rem', maxWidth: '640px', margin: '0 auto' }}>
        <a href="/profile" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.6 }}>
          ← Back
        </a>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 1.5rem 6rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '1rem', opacity: 0.85 }}>
            What If 2026
          </p>
          <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', lineHeight: 1.1, marginBottom: '1rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
            Volunteer Signup
          </h1>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, opacity: 0.7, maxWidth: '480px', margin: '0 auto' }}>
            Not camping with Glåüm, but want to be part of it? Sign up to volunteer for a shift.
            We'll be in touch with more details as the event gets closer.
          </p>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)', marginBottom: '2.5rem' }} />

        <form onSubmit={handleSubmit}>

          {/* Basic info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input name="first_name" defaultValue={userFirstName} style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.25)' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input name="last_name" defaultValue={userLastName} style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.25)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input name="email" type="email" defaultValue={userEmail} readOnly
                style={{ ...inputStyle, opacity: 0.6, cursor: 'default' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone <span style={{ opacity: 0.45, textTransform: 'none', letterSpacing: 0, fontSize: '0.75rem' }}>(optional)</span></label>
              <input name="phone" type="tel" placeholder="For shift coordination"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.25)' }}
              />
            </div>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.15), transparent)', marginBottom: '2rem' }} />

          {/* Availability */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={labelStyle}>Which days are you available?</label>
            <CheckboxGroup options={DAYS} name="days_available" />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={labelStyle}>Preferred time of day</label>
            <CheckboxGroup options={TIMES} name="preferred_times" />
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.15), transparent)', marginBottom: '2rem' }} />

          {/* Shift interests */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={labelStyle}>What kinds of shifts interest you?</label>
            <p style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.75rem', fontStyle: 'italic' }}>
              More detailed shift descriptions are coming — pick whatever sounds appealing for now.
            </p>
            <CheckboxGroup options={SHIFT_INTERESTS} name="shift_interests" />
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <label style={labelStyle}>
              Anything specific in mind? <span style={{ opacity: 0.45, textTransform: 'none', letterSpacing: 0, fontSize: '0.75rem' }}>(optional)</span>
            </label>
            <textarea
              name="other_notes"
              rows={3}
              placeholder="A skill, an idea, something you'd love to do..."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.25)' }}
            />
          </div>

          {error && (
            <p style={{ color: '#ff6b6b', fontSize: '0.9rem', marginBottom: '1.25rem', textAlign: 'center' }}>{error}</p>
          )}

          <div style={{ textAlign: 'center' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.9rem 2.75rem',
                borderRadius: '9999px',
                border: '1px solid rgba(200,168,72,0.5)',
                backgroundColor: 'transparent',
                color: '#FFFACD',
                fontFamily: 'TokyoDreams, serif',
                fontSize: '0.9rem',
                letterSpacing: '0.15em',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1,
                transition: 'all 0.25s',
              }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = 'rgba(200,168,72,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              {submitting ? 'Signing up...' : 'Sign Up to Volunteer'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
