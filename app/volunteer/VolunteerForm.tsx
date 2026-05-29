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

const fieldStyle: React.CSSProperties = {
  marginBottom: '2.75rem',
}

const dividerStyle: React.CSSProperties = {
  height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)',
  margin: '3rem 0',
}

function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>
        {label}
        {optional && <span style={{ opacity: 0.45, marginLeft: '0.4rem', textTransform: 'none', letterSpacing: 0, fontSize: '0.75rem' }}>(optional)</span>}
      </label>
      {children}
    </div>
  )
}

function TextInput({ name, placeholder, type = 'text', required, defaultValue }: {
  name: string; placeholder?: string; type?: string; required?: boolean; defaultValue?: string
}) {
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      required={required}
      defaultValue={defaultValue}
      style={inputStyle}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.25)' }}
    />
  )
}

function TextArea({ name, placeholder, rows = 4 }: { name: string; placeholder?: string; rows?: number }) {
  return (
    <textarea
      name={name}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.25)' }}
    />
  )
}

function CheckboxGroup({ options, name }: { options: string[]; name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {options.map(option => (
        <label key={option} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1.5, color: '#F3EDE6', opacity: 0.85 }}>
          <input
            type="checkbox"
            name={name}
            value={option}
            style={{ marginTop: '0.2rem', width: '1rem', height: '1rem', flexShrink: 0, accentColor: '#D239F8', cursor: 'pointer' }}
          />
          {option}
        </label>
      ))}
    </div>
  )
}

const SIGNUP_INTENT_OPTIONS = [
  { value: 'shift', label: 'Sign up for a shift', description: 'I want to help out during a specific time slot.' },
  { value: 'role', label: 'Take on a camp role', description: 'I want to take on a defined responsibility for the event.' },
  { value: 'other', label: 'Something else', description: "I'm interested in contributing but not sure how yet, or I have something else in mind." },
]

function SignupIntentCheckboxes() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {SIGNUP_INTENT_OPTIONS.map(opt => (
        <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer', padding: '0.85rem 1rem', borderRadius: '0.6rem', border: '1px solid rgba(200,168,72,0.15)', background: 'rgba(255,255,255,0.02)' }}>
          <input
            type="checkbox"
            name="signup_intent"
            value={opt.value}
            style={{ marginTop: '0.25rem', flexShrink: 0, accentColor: '#D239F8', cursor: 'pointer' }}
          />
          <div>
            <p style={{ fontSize: '0.9rem', color: '#F3EDE6', marginBottom: '0.2rem' }}>{opt.label}</p>
            <p style={{ fontSize: '0.78rem', opacity: 0.5, lineHeight: 1.5 }}>{opt.description}</p>
          </div>
        </label>
      ))}
    </div>
  )
}

const DAYS = ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Flexible']


export function VolunteerForm({ userEmail, userFirstName, userLastName }: {
  userEmail: string
  userFirstName: string
  userLastName: string
}) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
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
      preferred_name: formData.get('preferred_name') || null,
      pronouns: formData.get('pronouns') || null,
      email: formData.get('email'),
      phone: formData.get('phone'),
      brings_to_glaum: formData.get('brings_to_glaum') || null,
      signup_intent: formData.getAll('signup_intent'),
      days_available: formData.getAll('days_available'),
      specific_interests: formData.get('specific_interests') || null,
      special_skills: formData.get('special_skills') || null,
      familiar_with_glaum: formData.get('familiar_with_glaum') === 'yes',
      why_contribute: formData.get('why_contribute') || null,
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

      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '1.5rem', maxWidth: '640px', margin: '0 auto' }}>
        <a href="/" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.6 }}>
          ← Back to camp
        </a>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 1.5rem 6rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '1rem', opacity: 0.85 }}>
            What If 2026
          </p>
          <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', lineHeight: 1.1, marginBottom: '1rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
            Volunteer Signup
          </h1>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, opacity: 0.6, maxWidth: '480px', margin: '0 auto' }}>
            Not camping with Glåüm, but want to be part of it? Sign up to volunteer and we'll be in touch as the event gets closer.
          </p>
        </div>

        <div style={dividerStyle} />

        {/* Success state */}
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px solid rgba(200,168,72,0.3)', borderRadius: '1rem', background: 'rgba(210,57,248,0.05)' }}>
            <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '2rem', color: '#C8A848', marginBottom: '1.25rem' }}>
              Thank you.
            </p>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.8, opacity: 0.75, marginBottom: '0.75rem' }}>
              Thank you for your interest in contributing to Glåüm.
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.8, opacity: 0.6, marginBottom: '0.75rem' }}>
              Approved volunteers will be invited to join the Many Hands Registry, where they may sign up for available roles and shifts.
            </p>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.8, opacity: 0.4, fontStyle: 'italic' }}>
              Attunement may begin immediately. Results may vary.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* Basic info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <Field label="First Name">
                <TextInput name="first_name" placeholder="First name" required defaultValue={userFirstName} />
              </Field>
              <Field label="Last Name">
                <TextInput name="last_name" placeholder="Last name" required defaultValue={userLastName} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <Field label="Preferred Name" optional>
                <TextInput name="preferred_name" placeholder="If different from first name" />
              </Field>
              <Field label="Pronouns" optional>
                <TextInput name="pronouns" placeholder="e.g. she/her, they/them" />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  defaultValue={userEmail}
                  readOnly
                  required
                  style={{ ...inputStyle, opacity: 0.6, cursor: 'default' }}
                />
              </Field>
              <Field label="Phone">
                <TextInput name="phone" type="tel" placeholder="For shift coordination" required />
              </Field>
            </div>

            <div style={dividerStyle} />

            <Field label="How would you like to contribute?">
              <p style={{ fontSize: '0.8rem', opacity: 0.45, fontStyle: 'italic', marginBottom: '0.75rem' }}>Select all that apply</p>
              <SignupIntentCheckboxes />
            </Field>

            <Field label="What brings you to Glåüm?">
              <TextArea name="brings_to_glaum" placeholder="Tell us a little about how you found us and what draws you here." rows={4} />
            </Field>

            <Field label="What days are you likely available?">
              <CheckboxGroup name="days_available" options={DAYS} />
            </Field>

            <Field label="Are there any roles or activities that particularly interest you?" optional>
              <TextArea name="specific_interests" placeholder="Anything specific you have in mind..." rows={3} />
            </Field>

            <Field label="Is there anything you're particularly good at that Glåüm should know about?" optional>
              <TextArea name="special_skills" placeholder="Skills, talents, specialties — mundane or otherwise." rows={3} />
            </Field>

            <div style={dividerStyle} />

            <Field label="Have you familiarized yourself with Glåüm?">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1.6, color: '#F3EDE6', opacity: 0.85 }}>
                <input
                  type="checkbox"
                  name="familiar_with_glaum"
                  value="yes"
                  style={{ marginTop: '0.2rem', width: '1rem', height: '1rem', flexShrink: 0, accentColor: '#D239F8', cursor: 'pointer' }}
                />
                I've explored the website, spoken with members, attended events, or otherwise have a general understanding of what Glåüm is about.
              </label>
            </Field>

            <Field label="Why do you want to contribute to Glåüm?">
              <TextArea name="why_contribute" placeholder="Take your time with this one." rows={5} />
            </Field>

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
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
