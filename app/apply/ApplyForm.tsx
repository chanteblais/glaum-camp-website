'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

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
  marginBottom: '1.75rem',
}

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: 'TokyoDreams, serif',
  fontSize: '1.3rem',
  color: '#D239F8',
  marginBottom: '0.4rem',
  letterSpacing: '0.04em',
}

const sectionSubStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#F3EDE6',
  opacity: 0.6,
  marginBottom: '2rem',
  fontStyle: 'italic',
  lineHeight: 1.6,
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

function TextInput({ name, placeholder, type = 'text' }: { name: string; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      style={inputStyle}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.25)' }}
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
      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.25)' }}
    />
  )
}

function Select({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <select
      name={name}
      style={{
        ...inputStyle,
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23C8A848' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 1rem center',
        paddingRight: '2.5rem',
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.25)' }}
    >
      {children}
    </select>
  )
}

function CheckboxGroup({ options, name }: { options: string[]; name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {options.map((option) => (
        <label
          key={option}
          style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1.5, color: '#F3EDE6', opacity: 0.85 }}
        >
          <input
            type="checkbox"
            name={name}
            value={option}
            style={{
              marginTop: '0.2rem',
              width: '1rem',
              height: '1rem',
              flexShrink: 0,
              accentColor: '#D239F8',
              cursor: 'pointer',
            }}
          />
          {option}
        </label>
      ))}
    </div>
  )
}

function RadioGroup({ options, name }: { options: string[]; name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {options.map((option) => (
        <label
          key={option}
          style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1.5, color: '#F3EDE6', opacity: 0.85 }}
        >
          <input
            type="radio"
            name={name}
            value={option}
            style={{
              marginTop: '0.2rem',
              width: '1rem',
              height: '1rem',
              flexShrink: 0,
              accentColor: '#D239F8',
              cursor: 'pointer',
            }}
          />
          {option}
        </label>
      ))}
    </div>
  )
}

export function ApplyForm({ userEmail }: { userEmail: string }) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Collect checkbox groups as arrays
    const contributions = formData.getAll('contributions') as string[]
    const acknowledgements = formData.getAll('acknowledgements') as string[]

    const data = {
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      preferred_name: formData.get('preferred_name'),
      pronouns: formData.get('pronouns'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      instagram: formData.get('instagram'),
      location: formData.get('location'),
      camped_before: formData.get('camped_before'),
      attendance: formData.get('attendance'),
      arrival_date: formData.get('arrival'),
      departure_date: formData.get('departure'),
      camp_relationship: formData.get('camp_relationship'),
      vehicle: formData.get('vehicle'),
      space_requirements: formData.get('space'),
      structures: formData.get('structures'),
      rideshare: formData.get('rideshare'),
      contributions,
      energizing_participation: formData.get('energizing_participation'),
      support_needs: formData.get('support_needs'),
      accessibility: formData.get('accessibility'),
      capacity: formData.get('capacity'),
      participation_style: formData.get('participation_style'),
      draws_to_glaum: formData.get('draws_to_glaum'),
      healthy_community: formData.get('healthy_community'),
      acknowledgements,
      shrimp_relationship: formData.get('shrimp_relationship'),
    }

    try {
      const res = await fetch('/api/apply', {
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
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>

      {/* Back link */}
      <div style={{ padding: '1.5rem', maxWidth: '760px', margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            color: '#C8A848',
            textDecoration: 'none',
            opacity: 0.6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          ← Back to camp
        </Link>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 1.5rem 6rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '1rem', opacity: 0.85 }}>
            What If 2026
          </p>
          <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', color: '#C8A848', lineHeight: 1.1, marginBottom: '0.5rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
            Glåüm Camp Application
          </h1>
          <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1rem', color: '#F3EDE6', opacity: 0.5, letterSpacing: '0.15em', marginBottom: '2rem' }}>
            ManyHands Participation Registry
          </p>
          <div style={dividerStyle} />
        </div>

        {/* Success state */}
        {submitted ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              border: '1px solid rgba(200,168,72,0.3)',
              borderRadius: '1rem',
              background: 'rgba(210,57,248,0.05)',
            }}
          >
            <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '2rem', color: '#C8A848', marginBottom: '1rem' }}>
              Application received.
            </p>
            <p style={{ fontSize: '1rem', lineHeight: 1.8, opacity: 0.75, marginBottom: '0.5rem' }}>
              The Many Hands acknowledge your Many Hands.
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.8, opacity: 0.5, fontStyle: 'italic' }}>
              Someone from camp will be in touch.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* ── SECTION 1 ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 1 — Basic Info</p>
              <div style={dividerStyle} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <Field label="First Name">
                  <TextInput name="first_name" placeholder="First name" />
                </Field>
                <Field label="Last Name">
                  <TextInput name="last_name" placeholder="Last name" />
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
                    type="email"
                    name="email"
                    defaultValue={userEmail}
                    readOnly
                    style={{ ...inputStyle, opacity: 0.6, cursor: 'default' }}
                  />
                </Field>
                <Field label="Phone number">
                  <TextInput name="phone" type="tel" placeholder="For camp logistics" />
                </Field>
              </div>

              <Field label="Instagram" optional>
                <TextInput name="instagram" placeholder="@handle" />
              </Field>

              <Field label="Where are you traveling from?">
                <TextInput name="location" placeholder="City, region, or 'the void'" />
              </Field>

              <Field label="Have you camped with Glåüm before?">
                <RadioGroup
                  name="camped_before"
                  options={['Yes', 'No']}
                />
              </Field>
            </div>

            <div style={dividerStyle} />

            {/* ── SECTION 2 ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 2 — Your What If Plans</p>
              <div style={dividerStyle} />

              <Field label="Are you attending?">
                <RadioGroup
                  name="attendance"
                  options={['Full event', 'Partial event', 'Unsure']}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <Field label="Approximate arrival date">
                  <TextInput name="arrival" placeholder="e.g. Thursday afternoon" />
                </Field>
                <Field label="Approximate departure date">
                  <TextInput name="departure" placeholder="e.g. Sunday morning" />
                </Field>
              </div>

              <Field label="Will you:">
                <RadioGroup
                  name="camp_relationship"
                  options={[
                    'Camp with Glåüm',
                    'Stay nearby but participate',
                    'Mostly visit socially',
                  ]}
                />
              </Field>

              <Field label="Vehicle info" optional>
                <TextInput name="vehicle" placeholder="Type, size, number of passengers" />
              </Field>

              <Field label="Space requirements" optional>
                <TextInput name="space" placeholder="Tent size, van, trailer, etc." />
              </Field>

              <Field label="Are you bringing any structures?" optional>
                <TextInput name="structures" placeholder="Shade structures, canopies, etc." />
              </Field>

              <Field label="Do you need rideshare help?" optional>
                <RadioGroup
                  name="rideshare"
                  options={['I need a ride', 'I can offer a ride', 'I\'m sorted', 'Not sure yet']}
                />
              </Field>
            </div>

            <div style={dividerStyle} />

            {/* ── SECTION 3 ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 3 — Participation</p>
              <p style={sectionSubStyle}>This is the heart of it.</p>

              <Field label="How would you like to contribute to camp?">
                <CheckboxGroup
                  name="contributions"
                  options={[
                    'Setup',
                    'Teardown',
                    'Camp kitchen',
                    'Decor / ambiance',
                    'Sound / DJ support',
                    'Lighting',
                    'Welcoming / greeting',
                    'Shift coverage',
                    'Cleanup',
                    'Emotional support / grounding presence',
                    'Art support',
                    'Tea/snack operations',
                    'Logistics / organization',
                    'Build crew',
                    'Strike crew',
                    'General helper',
                    '"Put me where needed"',
                    'Tiny hand distribution',
                    'Shrimp relations',
                  ]}
                />
              </Field>

              <Field label="What kinds of participation feel energizing or meaningful for you?">
                <TextArea
                  name="energizing_participation"
                  placeholder="Tell us what genuinely lights you up — not what you feel you should say."
                  rows={5}
                />
              </Field>
            </div>

            <div style={dividerStyle} />

            {/* ── SECTION 4 ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 4 — Capacity & Boundaries</p>
              <p style={sectionSubStyle}>
                This section protects both the camp and the individual. Please be honest — there are no wrong answers.
              </p>

              <Field label="What helps you feel safe, supported, or comfortable in camp environments?">
                <TextArea name="support_needs" placeholder="Quiet spaces, check-ins, structure, spontaneity, etc." rows={4} />
              </Field>

              <Field label="Are there accessibility needs, physical limitations, sensory considerations, or boundaries we should know about?" optional>
                <TextArea name="accessibility" placeholder="You don't have to share anything you're not comfortable sharing." rows={4} />
              </Field>

              <Field label="What level of participation feels realistic and sustainable for you?">
                <TextArea name="capacity" placeholder="Be honest with yourself here. Overcommitting helps no one." rows={3} />
              </Field>

              <Field label="You are more likely to:">
                <RadioGroup
                  name="participation_style"
                  options={[
                    'Overcommit',
                    'Undercommit',
                    'Disappear into the woods',
                    'Become nocturnal',
                    'Become one with the carpet',
                    'Unsure',
                  ]}
                />
              </Field>
            </div>

            <div style={dividerStyle} />

            {/* ── SECTION 5 ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 5 — Camp Culture</p>
              <div style={dividerStyle} />

              <Field label="What draws you to Glåüm?">
                <TextArea
                  name="draws_to_glaum"
                  placeholder="Take your time with this one."
                  rows={5}
                />
              </Field>

              <Field label="What does healthy community mean to you?">
                <TextArea
                  name="healthy_community"
                  placeholder="In your own words."
                  rows={5}
                />
              </Field>
            </div>

            <div style={dividerStyle} />

            {/* ── SECTION 6 ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 6 — Contribution Expectations</p>
              <p style={sectionSubStyle}>
                Glåüm is built collaboratively. We ask everyone camping with us to contribute in ways
                that are realistic and sustainable for them.
              </p>

              <Field label="Please acknowledge the following:">
                <CheckboxGroup
                  name="acknowledgements"
                  options={[
                    'I understand Glåüm is participatory',
                    'I will contribute honestly within my capacity',
                    'I will communicate if my plans change',
                    'I will help maintain shared spaces',
                    'I understand setup and teardown are shared responsibilities',
                    'I understand no one person is responsible for carrying the entire camp',
                  ]}
                />
              </Field>
            </div>

            <div style={dividerStyle} />

            {/* ── SECTION 7 ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 7 — Final Glåüm Questions</p>
              <div style={dividerStyle} />

              <Field label="What is your relationship to shrimp?" optional>
                <TextArea
                  name="shrimp_relationship"
                  placeholder="This question is optional. It is also important."
                  rows={3}
                />
              </Field>
            </div>

            <div style={dividerStyle} />

            {/* Submit */}
            <div style={{ textAlign: 'center' }}>
              {error && (
                <p style={{ color: '#ff6b6b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '1rem 3rem',
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
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.backgroundColor = 'rgba(200,168,72,0.08)'
                    e.currentTarget.style.borderColor = 'rgba(200,168,72,0.8)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(200,168,72,0.5)'
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
              <p style={{ fontSize: '0.75rem', opacity: 0.35, marginTop: '1.25rem', fontStyle: 'italic' }}>
                The Many Hands receive you.
              </p>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
