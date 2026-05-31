'use client'

import { useState, useRef, FormEvent } from 'react'
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
  marginBottom: '2.75rem',
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

const helperTextStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#F3EDE6',
  opacity: 0.5,
  marginTop: '0.75rem',
  lineHeight: 1.6,
  fontStyle: 'italic',
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

function TextInput({ name, placeholder, type = 'text', required, maxLength }: { name: string; placeholder?: string; type?: string; required?: boolean; maxLength?: number }) {
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
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
  const [pathChosen, setPathChosen] = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('join') === '1'
  )
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attunementOther, setAttunementOther] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarError(null)
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setAvatarPreview(null); setAvatarError(json.error ?? 'Upload failed'); return }
      setAvatarUrl(json.avatarUrl)
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!avatarUrl) {
      setError('Please upload a photo before submitting.')
      return
    }
    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const acknowledgements = formData.getAll('acknowledgements') as string[]
    const attunementStatus = formData.getAll('attunement_status') as string[]
    const setupPreference = formData.getAll('setup_preference') as string[]
    const setupLimitations = formData.getAll('setup_limitations') as string[]

    const data = {
      // Photo
      avatar_url: avatarUrl,

      // Section 1 — Basic Info
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      preferred_name: formData.get('preferred_name'),
      pronouns: formData.get('pronouns'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      instagram: formData.get('instagram'),
      location: formData.get('location'),
      emergency_contact: formData.get('emergency_contact'),
      referral: formData.get('referral'),
      camped_before: formData.get('camped_before'),

      // Section 2 — About You
      glaum_acceptance: formData.get('glaum_acceptance'),
      special_skills: formData.get('special_skills'),
      recent_achievements: formData.get('recent_achievements'),
      official_designation: formData.get('official_designation'),
      research_interests: formData.get('research_interests'),
      known_side_effects: formData.get('known_side_effects'),
      attunement_status: attunementStatus,
      attunement_status_other: formData.get('attunement_status_other'),

      // Section 3 — What If Plans
      attendance: formData.get('attendance'),
      arrival_date: formData.get('arrival'),
      departure_date: formData.get('departure'),
      camp_relationship: formData.get('camp_relationship'),
      vehicle: formData.get('vehicle'),
      space_requirements: formData.get('space'),
      structures: formData.get('structures'),
      rideshare: formData.get('rideshare'),

      // Section 4 — Participation
      leadership_interest: formData.get('leadership_interest'),
      setup_available: formData.get('setup_available'),
      setup_preference: setupPreference,
      setup_limitations: setupLimitations,
      setup_notes: formData.get('setup_notes'),
      community_contribution: formData.get('community_contribution'),
      welcome_support: formData.get('welcome_support'),
      leadership_note: formData.get('leadership_note'),
      skills_contribution: formData.get('skills_contribution'),

      // Section 5 — Camp Culture
      draws_to_glaum: formData.get('draws_to_glaum'),
      healthy_community: formData.get('healthy_community'),

      // Section 6 — Contribution Expectations
      acknowledgements,

      // Section 7 — Final Glåüm Questions
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

        {/* ── PATH CHOICE ── */}
        {!pathChosen && !submitted && (
          <div style={{ textAlign: 'center', paddingTop: '2rem' }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '1rem', opacity: 0.85 }}>
              What If 2026
            </p>
            <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', lineHeight: 1.1, marginBottom: '0.5rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
              Join Glåüm
            </h1>
            <p style={{ fontSize: '0.95rem', opacity: 0.5, marginBottom: '3rem', fontStyle: 'italic' }}>
              How would you like to participate?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', textAlign: 'left' }}>
              {/* Camp member */}
              <div style={{ padding: '2rem', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '1rem', background: 'rgba(200,168,72,0.03)', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.7, marginBottom: '0.75rem' }}>
                  Camp Member
                </p>
                <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.3rem', color: '#C8A848', marginBottom: '0.75rem' }}>
                  Join the Camp
                </p>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, opacity: 0.6, marginBottom: '2rem', flex: 1 }}>
                  Camp with Glåüm at What If 2026. Full participation — you'll sleep on site, help build and hold the space, and take on roles as part of the camp.
                </p>
                <button
                  onClick={() => setPathChosen(true)}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(200,168,72,0.5)',
                    background: 'none',
                    color: '#FFFACD',
                    fontSize: '0.8rem',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    transition: 'background 0.2s, border-color 0.2s',
                    fontFamily: 'var(--font-libre-baskerville), Georgia, serif',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,168,72,0.08)'; e.currentTarget.style.borderColor = 'rgba(200,168,72,0.8)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(200,168,72,0.5)' }}
                >
                  Apply to Camp
                </button>
              </div>

              {/* Volunteer */}
              <div style={{ padding: '2rem', border: '1px solid rgba(210,57,248,0.15)', borderRadius: '1rem', background: 'rgba(210,57,248,0.03)', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.7, marginBottom: '0.75rem' }}>
                  Volunteer
                </p>
                <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.3rem', color: '#C8A848', marginBottom: '0.75rem' }}>
                  Volunteer for a Shift
                </p>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, opacity: 0.6, marginBottom: '2rem', flex: 1 }}>
                  Not camping with Glåüm, but want to be part of it? Sign up to volunteer for a shift and we'll be in touch as the event gets closer.
                </p>
                <Link
                  href="/volunteer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(210,57,248,0.4)',
                    color: '#F3EDE6',
                    textDecoration: 'none',
                    fontSize: '0.8rem',
                    letterSpacing: '0.1em',
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(210,57,248,0.08)'; e.currentTarget.style.borderColor = 'rgba(210,57,248,0.7)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(210,57,248,0.4)' }}
                >
                  Sign Up to Volunteer
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Form — shown once path is chosen */}
        {pathChosen && <>
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

            {/* ── SECTION 1 — Basic Info ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 1 — Basic Info</p>
              <div style={dividerStyle} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <Field label="First Name">
                  <TextInput name="first_name" placeholder="First name" required maxLength={50} />
                </Field>
                <Field label="Last Name">
                  <TextInput name="last_name" placeholder="Last name" required maxLength={50} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <Field label="Preferred Name" optional>
                  <TextInput name="preferred_name" placeholder="If different from first name" maxLength={50} />
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
                  <TextInput name="phone" type="tel" placeholder="For camp logistics" required />
                </Field>
              </div>

              <Field label="Instagram" optional>
                <TextInput name="instagram" placeholder="@handle" />
              </Field>

              <Field label="Where are you traveling from?">
                <TextInput name="location" placeholder="City, region, or 'the void'" />
              </Field>

              <Field label="Emergency Contact">
                <TextInput name="emergency_contact" placeholder="Name and phone number" required />
              </Field>

              <Field label="Who referred you to Glåüm?" optional>
                <TextInput name="referral" placeholder="Name, or how you found us" />
              </Field>

              <Field label="Have you camped with Glåüm before?">
                <RadioGroup
                  name="camped_before"
                  options={['Yes', 'No']}
                />
              </Field>

              {/* Photo upload */}
              <div style={{ marginBottom: '2.75rem' }}>
                <p style={labelStyle}>Photo Upload</p>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, opacity: 0.65, marginBottom: '0.6rem' }}>
                  Please upload a photo for the Many Hands Photo Board. This helps camp members learn names and recognize each other during the event.
                </p>
                <p style={{ fontSize: '0.8rem', lineHeight: 1.7, opacity: 0.45, fontStyle: 'italic', marginBottom: '1.25rem' }}>
                  A photo where people can reasonably tell it's you is appreciated. Baby photos, blurry silhouettes, and distant figures disappearing into the mist may be beautiful, but they aren't always particularly helpful when it comes to identification. Don't worry about finding the perfect photo — you can always update it later.
                </p>

                <div
                  onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    border: `1px dashed ${avatarPreview ? 'rgba(210,57,248,0.4)' : 'rgba(200,168,72,0.25)'}`,
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    cursor: avatarUploading ? 'wait' : 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                    background: avatarPreview ? 'rgba(210,57,248,0.04)' : 'rgba(255,255,255,0.02)',
                    minHeight: '140px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => { if (!avatarUploading) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(210,57,248,0.5)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = avatarPreview ? 'rgba(210,57,248,0.4)' : 'rgba(200,168,72,0.25)' }}
                >
                  {avatarPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
                      <img
                        src={avatarPreview}
                        alt="Preview"
                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(210,57,248,0.3)', flexShrink: 0 }}
                      />
                      <div>
                        {avatarUploading ? (
                          <p style={{ fontSize: '0.85rem', color: '#D239F8', opacity: 0.8 }}>Uploading…</p>
                        ) : (
                          <>
                            <p style={{ fontSize: '0.85rem', color: '#7dcf8e', marginBottom: '0.25rem' }}>✓ Photo uploaded</p>
                            <p style={{ fontSize: '0.75rem', opacity: 0.45, fontStyle: 'italic' }}>Click to change</p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(200,168,72,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <p style={{ fontSize: '0.85rem', opacity: 0.5, margin: 0 }}>Click to upload a photo</p>
                      <p style={{ fontSize: '0.72rem', opacity: 0.3, margin: 0 }}>JPEG, PNG, WebP or GIF · max 5 MB</p>
                    </>
                  )}
                </div>

                {avatarError && (
                  <p style={{ fontSize: '0.78rem', color: '#ff8a8a', marginTop: '0.5rem' }}>{avatarError}</p>
                )}

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div style={dividerStyle} />

            {/* ── SECTION 2 — About You ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 2 — About You</p>
              <div style={dividerStyle} />

              <Field label="Have you accepted Glåüm into your heart?">
                <RadioGroup
                  name="glaum_acceptance"
                  options={['Yes', 'Not Yet', "It's Complicated"]}
                />
              </Field>

              <Field label="Is there anything you're particularly good at that Glåüm might not know about?" optional>
                <TextArea
                  name="special_skills"
                  placeholder="Skills, talents, specialties — mundane or otherwise."
                  rows={3}
                />
              </Field>

              <Field label="Recent Achievements" optional>
                <TextArea
                  name="recent_achievements"
                  placeholder="Personal, professional, spiritual, or otherwise."
                  rows={3}
                />
              </Field>

              <Field label="Official Designation" optional>
                <TextInput name="official_designation" placeholder="Your title, role, or self-assigned rank" />
              </Field>

              <Field label="Current Research Interests" optional>
                <TextArea
                  name="research_interests"
                  placeholder="What are you currently obsessed with or investigating?"
                  rows={3}
                />
              </Field>

              <Field label="Known Side Effects" optional>
                <TextArea
                  name="known_side_effects"
                  placeholder="Of spending time with you, or generally."
                  rows={3}
                />
              </Field>

              <Field label="Current Attunement Status">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {['Emerging', 'Stable', 'Elevated', 'Classified'].map((option) => (
                    <label
                      key={option}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1.5, color: '#F3EDE6', opacity: 0.85 }}
                    >
                      <input
                        type="checkbox"
                        name="attunement_status"
                        value={option}
                        style={{ marginTop: '0.2rem', width: '1rem', height: '1rem', flexShrink: 0, accentColor: '#D239F8', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                  <label
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1.5, color: '#F3EDE6', opacity: 0.85 }}
                  >
                    <input
                      type="checkbox"
                      name="attunement_status"
                      value="Other"
                      checked={attunementOther}
                      onChange={(e) => setAttunementOther(e.target.checked)}
                      style={{ marginTop: '0.2rem', width: '1rem', height: '1rem', flexShrink: 0, accentColor: '#D239F8', cursor: 'pointer' }}
                    />
                    Other
                  </label>
                  {attunementOther && (
                    <input
                      type="text"
                      name="attunement_status_other"
                      placeholder="Please describe..."
                      style={{ ...inputStyle, marginTop: '0.25rem' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.25)' }}
                    />
                  )}
                </div>
              </Field>
            </div>

            <div style={dividerStyle} />

            {/* ── SECTION 3 — Your What If Plans ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 3 — Your What If Plans</p>
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
                  options={['I need a ride', 'I can offer a ride', "I'm sorted", 'Not sure yet']}
                />
              </Field>
            </div>

            <div style={dividerStyle} />

            {/* ── SECTION 4 — Participation ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 4 — Participation</p>
              <p style={sectionSubStyle}>This is the heart of it.</p>

              <Field label="Are you interested in a leadership role?">
                <RadioGroup
                  name="leadership_interest"
                  options={['Yes', 'No', 'Maybe — tell me more']}
                />
              </Field>

              <Field label="Are you available for early setup?">
                <RadioGroup
                  name="setup_available"
                  options={['Yes', 'No']}
                />
              </Field>

              <div style={{ marginBottom: '2.75rem' }}>
                <p style={{ ...sectionHeadingStyle, fontSize: '1.15rem', marginBottom: '0.5rem' }}>Contributions</p>
                <p style={{ ...helperTextStyle, marginTop: 0, marginBottom: '1.5rem' }}>
                  Setup, teardown, and decor are among the most hands-on ways to shape the space.
                  Select any you'd like to contribute to — you can choose more than one.
                  We recognize that travel schedules, accessibility needs, and other circumstances
                  may affect availability. If you have limitations, note them below.
                </p>

                <Field label="Which would you like to help with?">
                  <CheckboxGroup
                    name="setup_preference"
                    options={['Setup', 'Teardown', 'Decor']}
                  />
                </Field>
              </div>

              <Field label="Are there any limitations we should be aware of when planning communal responsibilities?" optional>
                <CheckboxGroup
                  name="setup_limitations"
                  options={[
                    'I am unable to participate in setup',
                    'I am unable to participate in teardown',
                    'I am unable to participate in either setup or teardown',
                    "I'd prefer to discuss my circumstances privately",
                  ]}
                />
              </Field>

              <Field label="Additional notes" optional>
                <TextArea
                  name="setup_notes"
                  placeholder="Anything else relevant to your availability or participation..."
                  rows={3}
                />
              </Field>

              <Field label="What do you hope to contribute to the community this year?">
                <TextArea
                  name="community_contribution"
                  placeholder="Tell us what you're bringing — tangible, energetic, or otherwise."
                  rows={5}
                />
              </Field>

              <Field label="What would help you feel welcome and supported in camp?">
                <TextArea
                  name="welcome_support"
                  placeholder="Quiet spaces, check-ins, structure, spontaneity, etc."
                  rows={4}
                />
              </Field>

              <Field label="Is there anything you'd like camp leadership to know?" optional>
                <TextArea
                  name="leadership_note"
                  placeholder="Anything on your mind — no wrong answers here."
                  rows={4}
                />
              </Field>

            </div>

            <div style={dividerStyle} />

            {/* ── SECTION 5 — Camp Culture ── */}
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

            {/* ── SECTION 6 — Contribution Expectations ── */}
            <div>
              <p style={sectionHeadingStyle}>Section 6 — What We Ask of the Many Hands</p>
              <p style={sectionSubStyle}>
                Glåüm is built collaboratively. Every participant helps create the experience that we all enjoy.
              </p>

              <p style={{ fontSize: '0.85rem', color: '#F3EDE6', opacity: 0.6, marginBottom: '1.75rem', lineHeight: 1.6 }}>
                By applying to camp, you acknowledge the following expectations:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <CheckboxGroup
                  name="acknowledgements"
                  options={[
                    'I will sign up for a camp role or department that aligns with my interests and capacity.',
                    'I will participate in one 3-hour public-facing shift during the event.',
                    'I will contribute to either setup or teardown (or communicate with camp leadership if circumstances prevent me from doing so).',
                    'I will communicate clearly if my plans, availability, or responsibilities change.',
                    'I will help maintain shared spaces and contribute to a welcoming camp environment.',
                    'I will treat fellow camp members, neighbours, and participants with kindness, respect, and consideration.',
                    'I will take responsibility for my own wellbeing and contribute to a culture where others feel safe doing the same.',
                    'I will address concerns directly, respectfully, and in a timely manner whenever possible.',
                    'I understand that Glåüm is a collaborative effort and that no one person is responsible for carrying the entire camp.',
                    'I will leave Glåüm better than I found it.',
                  ]}
                />
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1.7, color: '#F3EDE6', opacity: 0.85, marginTop: '0.4rem' }}>
                  <input
                    type="checkbox"
                    name="acknowledgements"
                    value="I agree to comply with all terms and obligations set forth in the Glåüm Sponsorship & Shrimp Awareness Agreement, including but not limited to the reasonable promotion, celebration, and veneration of shrimp; the cultivation of shrimp-positive discourse; and the advancement of public awareness regarding the contributions of shrimp to community, attunement, and human flourishing. Compliance may occur through direct advocacy, symbolic representation, educational outreach, interpretive dance, or other approved methods."
                    style={{ marginTop: '0.3rem', width: '1rem', height: '1rem', flexShrink: 0, accentColor: '#D239F8', cursor: 'pointer' }}
                  />
                  I agree to comply with all terms and obligations set forth in the Glåüm Sponsorship &amp; Shrimp Awareness Agreement, including but not limited to the reasonable promotion, celebration, and veneration of shrimp; the cultivation of shrimp-positive discourse; and the advancement of public awareness regarding the contributions of shrimp to community, attunement, and human flourishing. Compliance may occur through direct advocacy, symbolic representation, educational outreach, interpretive dance, or other approved methods.
                </label>
              </div>
            </div>

            <div style={dividerStyle} />

            {/* ── SECTION 7 — Final Glåüm Questions ── */}
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
        </>}
      </div>
    </div>
  )
}
