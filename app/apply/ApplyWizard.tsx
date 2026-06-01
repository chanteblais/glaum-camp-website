'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import type { MemberFormConfig, StepConfig, FieldConfig } from '@/lib/form-config'

// ── Constants ─────────────────────────────────────────────────────────────────

const DRAFT_KEY = 'glaum-apply-draft-v2'

const MILESTONES = [
  'Application\nReceived',
  'Registry Entry\nin Progress',
  'Participation\nPlanned',
  'Attunement\nPending',
  'Welcome to\nGlåüm',
]

const MILESTONE_FOR_KEY: Record<string, number> = {
  basic: 0, registry: 1, plans: 2, roles: 2, agreement: 3, shrimp: 4,
}

const AGREEMENT_ITEMS = [
  'I have taken time to familiarise myself with Glåüm and believe it is a community I would genuinely enjoy contributing to.',
  'I understand Glåüm is participatory.',
  'I will contribute honestly within my capacity.',
  'I will communicate if my plans or availability change.',
  'I will help maintain shared spaces and support the collective wellbeing of camp.',
  'I understand setup and teardown are shared responsibilities.',
  'I understand no one person is responsible for carrying the entire camp.',
  'I will treat fellow camp members, neighbours, and participants with kindness, respect, and consideration.',
  'I will leave Glåüm better than I found it.',
  'I agree to comply with all terms and obligations set forth in the Glåüm Sponsorship & Shrimp Awareness Agreement, including but not limited to the reasonable promotion, celebration, and veneration of shrimp.',
]

const DEPT_OPTIONS = [
  'Ceremonial Affairs',
  'Tiny Hand Services',
  'Nourishment',
  'Aesthetic Operations',
  'Environmental Stewardship',
  'Illumination & Electrical Affairs',
  'Logistics & Material Relocation',
  'Many Hands Coordination',
  'Records & Documentation',
]

type FormData = {
  // I
  first_name: string; last_name: string; preferred_name: string; pronouns: string
  email: string; phone: string; instagram: string; location: string
  emergency_contact: string; referral: string; camped_before: string
  avatar_url: string | null
  // II
  about_you: string; special_skills: string; find_at_camp: string
  glaum_acceptance: string; attunement_status: string; attunement_status_other: string
  // III
  attendance: string; arrival_date: string; departure_date: string
  vehicle: string; structures: string; rideshare: string
  // IV
  department_interests: string[]; leadership_interest: string
  setup_preference: string[]; setup_limitations: string[]; setup_notes: string
  // V
  acknowledgements: string[]
  // VI
  shrimp_relationship: string
  // Custom sections
  custom_answers: Record<string, string | string[]>
}

const BLANK: FormData = {
  first_name: '', last_name: '', preferred_name: '', pronouns: '',
  email: '', phone: '', instagram: '', location: '',
  emergency_contact: '', referral: '', camped_before: '', avatar_url: null,
  about_you: '', special_skills: '', find_at_camp: '',
  glaum_acceptance: '', attunement_status: '', attunement_status_other: '',
  attendance: '', arrival_date: '', departure_date: '',
  vehicle: '', structures: '', rideshare: '',
  department_interests: [], leadership_interest: '',
  setup_preference: [], setup_limitations: [], setup_notes: '',
  acknowledgements: [],
  shrimp_relationship: '',
  custom_answers: {},
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const GOLD = '#C8A848'
const CREAM = '#F3EDE6'
const PURPLE = '#D239F8'

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '0.65rem 0.9rem',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(200,168,72,0.22)',
  borderRadius: '0.65rem',
  color: CREAM, fontSize: '0.9rem', outline: 'none',
  transition: 'border-color 0.2s',
}

// ── Field lookup helper ───────────────────────────────────────────────────────

type FlHelper = {
  visible: (fieldKey: string) => boolean
  required: (fieldKey: string) => boolean
  label:    (fieldKey: string) => string
  desc:     (fieldKey: string) => string | undefined
}

function makeFlHelper(formConfig: MemberFormConfig, stepKey: string): FlHelper {
  const step = formConfig.steps.find(s => s.key === stepKey)
  return {
    visible: (fieldKey: string) => step?.fields.find(f => f.key === fieldKey)?.visible ?? true,
    required: (fieldKey: string) => step?.fields.find(f => f.key === fieldKey)?.required ?? false,
    label:    (fieldKey: string) => step?.fields.find(f => f.key === fieldKey)?.label ?? fieldKey,
    desc:     (fieldKey: string) => step?.fields.find(f => f.key === fieldKey)?.description,
  }
}

// ── Small components ──────────────────────────────────────────────────────────

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <p style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: GOLD, opacity: 0.75, margin: '0 0 0.4rem' }}>
      {children}{optional && <span style={{ opacity: 0.5, marginLeft: '0.4rem', textTransform: 'none', letterSpacing: 0, fontSize: '0.78rem' }}>(optional)</span>}
    </p>
  )
}

function Field({ label, optional, required, children }: { label: string; optional?: boolean; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <Label optional={optional}>
        {label}
        {required && <span style={{ color: '#ff8a8a', marginLeft: '0.25rem', opacity: 0.85 }}>*</span>}
      </Label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', maxLength, readOnly }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; maxLength?: number; readOnly?: boolean
}) {
  return (
    <input
      type={type} value={value} placeholder={placeholder} maxLength={maxLength} readOnly={readOnly}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle, opacity: readOnly ? 0.5 : 1, cursor: readOnly ? 'default' : 'text' }}
      onFocus={e => { if (!readOnly) e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.22)' }}
    />
  )
}

function Textarea({ value, onChange, placeholder, maxLength = 500 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number
}) {
  return (
    <div>
      <textarea
        value={value} placeholder={placeholder} maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, resize: 'vertical', minHeight: '110px', lineHeight: 1.7 }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.22)' }}
      />
      <p style={{ fontSize: '0.68rem', textAlign: 'right', color: GOLD, opacity: value.length > maxLength * 0.85 ? 0.8 : 0.3, margin: '0.2rem 0 0' }}>
        {value.length} / {maxLength}
      </p>
    </div>
  )
}

function RadioGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {options.map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: CREAM, opacity: value === opt ? 1 : 0.65 }}>
          <div style={{
            width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
            border: `1.5px solid ${value === opt ? GOLD : 'rgba(200,168,72,0.35)'}`,
            background: value === opt ? 'rgba(200,168,72,0.12)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => onChange(opt)}>
            {value === opt && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: GOLD }} />}
          </div>
          <span onClick={() => onChange(opt)}>{opt}</span>
        </label>
      ))}
    </div>
  )
}

function CheckboxGroup({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {options.map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: CREAM, opacity: value.includes(opt) ? 1 : 0.65, lineHeight: 1.5 }}>
          <div style={{
            width: '18px', height: '18px', borderRadius: '3px', flexShrink: 0, marginTop: '2px',
            border: `1.5px solid ${value.includes(opt) ? GOLD : 'rgba(200,168,72,0.35)'}`,
            background: value.includes(opt) ? 'rgba(200,168,72,0.12)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => toggle(opt)}>
            {value.includes(opt) && <span style={{ fontSize: '0.7rem', color: GOLD, fontWeight: 700 }}>✓</span>}
          </div>
          <span onClick={() => toggle(opt)}>{opt}</span>
        </label>
      ))}
    </div>
  )
}

function Divider({ label }: { label?: string }) {
  if (!label) return <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', margin: '2rem 0' }} />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0 1.5rem' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(200,168,72,0.15)' }} />
      <p style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, opacity: 0.5, margin: 0, whiteSpace: 'nowrap' }}>{label}</p>
      <div style={{ flex: 1, height: '1px', background: 'rgba(200,168,72,0.15)' }} />
    </div>
  )
}

// ── Canvas crop helper ────────────────────────────────────────────────────────

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = imageSrc
  })
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas empty')), 'image/jpeg', 0.92))
}

// ── Photo upload + crop ───────────────────────────────────────────────────────

function PhotoUpload({ value, onChange }: { value: string | null; onChange: (url: string) => void }) {
  const [rawSrc, setRawSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  const onCropComplete = useCallback((_: Area, pixels: Area) => setCroppedArea(pixels), [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setRawSrc(url)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    e.target.value = ''
  }

  async function handleSave() {
    if (!rawSrc || !croppedArea) return
    setUploading(true)
    setError(null)
    try {
      const blob = await getCroppedBlob(rawSrc, croppedArea)
      const fd = new FormData()
      fd.append('avatar', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        onChange(data.avatarUrl)
        setRawSrc(null)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Upload failed')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setUploading(false)
  }

  return (
    <>
      {rawSrc && (
        <>
          <div onClick={() => !uploading && setRawSrc(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 61, background: '#130820', border: '1px solid rgba(200,168,72,0.25)', borderRadius: '1rem', padding: '1.5rem', width: '90%', maxWidth: '440px' }}>
            <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1rem', color: GOLD, margin: '0 0 1rem', textAlign: 'center' }}>Adjust Photo</p>
            <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', borderRadius: '0.75rem', overflow: 'hidden', background: '#000' }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <Cropper
                  image={rawSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  style={{
                    containerStyle: { borderRadius: '0.75rem' },
                    cropAreaStyle: { border: '2px solid rgba(200,168,72,0.7)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' },
                  }}
                />
              </div>
            </div>
            <div style={{ margin: '1rem 0 0.25rem' }}>
              <p style={{ fontSize: '0.68rem', letterSpacing: '0.1em', color: GOLD, opacity: 0.55, margin: '0 0 0.5rem', textTransform: 'uppercase' }}>Zoom</p>
              <input
                type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ width: '100%', accentColor: GOLD, cursor: 'pointer' }}
              />
            </div>
            {error && <p style={{ fontSize: '0.8rem', color: '#ff8a8a', margin: '0.5rem 0' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setRawSrc(null)} disabled={uploading} style={{ padding: '0.55rem 1.1rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: CREAM, cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7 }}>Cancel</button>
              <button onClick={handleSave} disabled={uploading} style={{ padding: '0.55rem 1.4rem', borderRadius: '9999px', border: 'none', background: uploading ? 'rgba(200,168,72,0.2)' : 'linear-gradient(135deg,#C8A848,#A8882A)', color: uploading ? GOLD : '#1A0800', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                {uploading ? 'Saving…' : 'Save photo'}
              </button>
            </div>
          </div>
        </>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div
          onClick={() => ref.current?.click()}
          style={{ width: '90px', height: '90px', borderRadius: '50%', flexShrink: 0, border: `2px solid ${value ? 'rgba(111,73,31,0.8)' : 'rgba(200,168,72,0.3)'}`, background: 'rgba(200,168,72,0.06)', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" opacity={0.4} strokeLinecap="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </div>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        <div>
          <button type="button" onClick={() => ref.current?.click()} style={{ padding: '0.45rem 1rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.35)', background: 'transparent', color: GOLD, fontSize: '0.8rem', cursor: 'pointer' }}>
            {value ? 'Change photo' : 'Upload photo'}
          </button>
          <p style={{ fontSize: '0.72rem', opacity: 0.4, margin: '0.4rem 0 0', lineHeight: 1.5 }}>
            {value ? 'Looking good. You can change this later.' : 'You can always update this later from your profile.'}
          </p>
        </div>
      </div>
    </>
  )
}

// ── Sections ──────────────────────────────────────────────────────────────────

function SectionI({ form, set, fl }: { form: FormData; set: (k: keyof FormData, v: unknown) => void; fl: FlHelper }) {
  return (
    <>
      <p style={{ fontSize: '0.72rem', opacity: 0.4, textAlign: 'right', marginBottom: '1rem', marginTop: '-0.5rem' }}>
        <span style={{ color: '#ff8a8a' }}>*</span> required
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label={fl.label('first_name')} required={fl.required('first_name')}><Input value={form.first_name} onChange={v => set('first_name', v)} placeholder="First name" maxLength={50} /></Field>
        <Field label={fl.label('last_name')} required={fl.required('last_name')}><Input value={form.last_name} onChange={v => set('last_name', v)} placeholder="Last name" maxLength={50} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {fl.visible('preferred_name') && (
          <Field label={fl.label('preferred_name')} optional={!fl.required('preferred_name')} required={fl.required('preferred_name')}><Input value={form.preferred_name} onChange={v => set('preferred_name', v)} placeholder="If different" maxLength={50} /></Field>
        )}
        {fl.visible('pronouns') && (
          <Field label={fl.label('pronouns')} optional={!fl.required('pronouns')} required={fl.required('pronouns')}><Input value={form.pronouns} onChange={v => set('pronouns', v)} placeholder="e.g. she/her" /></Field>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label={fl.label('email')} required={fl.required('email')}><Input value={form.email} onChange={v => set('email', v)} type="email" placeholder="your@email.com" readOnly={!!form.email} /></Field>
        <Field label={fl.label('phone')} required={fl.required('phone')} optional={!fl.required('phone')}><Input value={form.phone} onChange={v => set('phone', v)} type="tel" placeholder="For camp logistics" /></Field>
      </div>
      {(fl.visible('instagram') || fl.visible('location')) && (
        fl.visible('instagram') && fl.visible('location') ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label={fl.label('instagram')} optional={!fl.required('instagram')}><Input value={form.instagram} onChange={v => set('instagram', v)} placeholder={fl.desc('instagram') ?? '@handle'} /></Field>
            <Field label={fl.label('location')} optional={!fl.required('location')}><Input value={form.location} onChange={v => set('location', v)} placeholder="City, region, or 'the void'" /></Field>
          </div>
        ) : fl.visible('instagram') ? (
          <Field label={fl.label('instagram')} optional={!fl.required('instagram')}><Input value={form.instagram} onChange={v => set('instagram', v)} placeholder={fl.desc('instagram') ?? '@handle'} /></Field>
        ) : (
          <Field label={fl.label('location')} optional={!fl.required('location')}><Input value={form.location} onChange={v => set('location', v)} placeholder="City, region, or 'the void'" /></Field>
        )
      )}
      <Field label={fl.label('emergency_contact')} required={fl.required('emergency_contact')} optional={!fl.required('emergency_contact')}>
        <Input value={form.emergency_contact} onChange={v => set('emergency_contact', v)} placeholder={fl.desc('emergency_contact') ?? 'Name and phone number'} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: fl.visible('referral') ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        {fl.visible('referral') && (
          <Field label={fl.label('referral')} optional={!fl.required('referral')}><Input value={form.referral} onChange={v => set('referral', v)} placeholder="Name or how you found us" /></Field>
        )}
        <Field label={fl.label('camped_before')} required={fl.required('camped_before')} optional={!fl.required('camped_before')}>
          <RadioGroup options={['Yes', 'No']} value={form.camped_before} onChange={v => set('camped_before', v)} />
        </Field>
      </div>
      {fl.visible('avatar_url') && (
        <>
          <Divider label={`${fl.label('avatar_url')}${fl.required('avatar_url') ? ' *' : ''}`} />
          {fl.desc('avatar_url') && (
            <p style={{ fontSize: '0.85rem', lineHeight: 1.8, opacity: 0.5, marginBottom: '1.25rem' }}>
              Please upload a photo for the Many Hands Photo Board. A photo where people can reasonably tell it's you is appreciated.
            </p>
          )}
          <PhotoUpload value={form.avatar_url} onChange={url => set('avatar_url', url)} />
        </>
      )}
    </>
  )
}

function SectionII({ form, set, fl }: { form: FormData; set: (k: keyof FormData, v: unknown) => void; fl: FlHelper }) {
  const showAny = fl.visible('about_you') || fl.visible('special_skills') || fl.visible('find_at_camp')
  return (
    <>
      {showAny && (
        <p style={{ fontSize: '0.9rem', lineHeight: 1.8, opacity: 0.5, marginBottom: '2rem', fontStyle: 'italic' }}>
          These questions help us get to know you and create your official Many Hands Registry entry.
        </p>
      )}
      {fl.visible('about_you') && (
        <Field label={fl.label('about_you')} optional={!fl.required('about_you')}>
          <Textarea value={form.about_you} onChange={v => set('about_you', v)} placeholder="Share the projects, ideas, pursuits, or obsessions lighting you up right now." />
        </Field>
      )}
      {fl.visible('special_skills') && (
        <Field label={fl.label('special_skills')} optional={!fl.required('special_skills')}>
          {fl.desc('special_skills') && <p style={{ fontSize: '0.8rem', opacity: 0.4, margin: '0 0 0.5rem', fontStyle: 'italic' }}>{fl.desc('special_skills')}</p>}
          <Textarea value={form.special_skills} onChange={v => set('special_skills', v)} placeholder="Your answer…" />
        </Field>
      )}
      {fl.visible('find_at_camp') && (
        <Field label={fl.label('find_at_camp')} optional={!fl.required('find_at_camp')}>
          {fl.desc('find_at_camp') && <p style={{ fontSize: '0.8rem', opacity: 0.4, margin: '0 0 0.5rem', fontStyle: 'italic' }}>{fl.desc('find_at_camp')}</p>}
          <Textarea value={form.find_at_camp} onChange={v => set('find_at_camp', v)} placeholder="Your answer…" />
        </Field>
      )}
      {showAny && <Divider />}
      <div style={{ display: 'grid', gridTemplateColumns: fl.visible('attunement_status') ? '1fr 1fr' : '1fr', gap: '2rem' }}>
        <Field label={fl.label('glaum_acceptance')} required={fl.required('glaum_acceptance')}>
          <RadioGroup options={['Yes', 'Not Yet', "It's Complicated"]} value={form.glaum_acceptance} onChange={v => set('glaum_acceptance', v)} />
        </Field>
        {fl.visible('attunement_status') && (
          <Field label={fl.label('attunement_status')} optional={!fl.required('attunement_status')}>
            <RadioGroup
              options={['Emerging', 'Stable', 'Elevated', 'Classified', 'Other']}
              value={form.attunement_status}
              onChange={v => set('attunement_status', v)}
            />
            {form.attunement_status === 'Other' && (
              <div style={{ marginTop: '0.5rem' }}>
                <Input value={form.attunement_status_other} onChange={v => set('attunement_status_other', v)} placeholder="Tell us more…" />
              </div>
            )}
          </Field>
        )}
      </div>
    </>
  )
}

function SectionIII({ form, set, fl }: { form: FormData; set: (k: keyof FormData, v: unknown) => void; fl: FlHelper }) {
  const showDates = fl.visible('arrival_date') || fl.visible('departure_date')
  const showVehicle = fl.visible('vehicle') || fl.visible('structures')
  return (
    <>
      <Field label={fl.label('attendance')} required={fl.required('attendance')}>
        <RadioGroup
          options={['Camping with Glåüm', 'Staying nearby but participating', 'Mostly visiting socially', 'Still figuring it out']}
          value={form.attendance}
          onChange={v => set('attendance', v)}
        />
      </Field>
      {showDates && (
        <>
          <Divider />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {fl.visible('arrival_date') && <Field label={fl.label('arrival_date')} optional={!fl.required('arrival_date')}><Input value={form.arrival_date} onChange={v => set('arrival_date', v)} type="date" /></Field>}
            {fl.visible('departure_date') && <Field label={fl.label('departure_date')} optional={!fl.required('departure_date')}><Input value={form.departure_date} onChange={v => set('departure_date', v)} type="date" /></Field>}
          </div>
        </>
      )}
      {showVehicle && (
        <>
          {fl.visible('vehicle') && <Field label={fl.label('vehicle')} optional={!fl.required('vehicle')}><Input value={form.vehicle} onChange={v => set('vehicle', v)} placeholder={fl.desc('vehicle') ?? 'Make, model, passengers, cargo capacity'} /></Field>}
          {fl.visible('structures') && <Field label={fl.label('structures')} optional={!fl.required('structures')}><Input value={form.structures} onChange={v => set('structures', v)} placeholder={fl.desc('structures') ?? 'Tents, shade structures, etc.'} /></Field>}
        </>
      )}
      {fl.visible('rideshare') && (
        <>
          <Divider label="Rideshare" />
          <Field label={fl.label('rideshare')} optional={!fl.required('rideshare')}>
            <RadioGroup
              options={['I need a ride', 'I can offer a ride', "I'm sorted", 'Not sure yet']}
              value={form.rideshare}
              onChange={v => set('rideshare', v)}
            />
          </Field>
        </>
      )}
    </>
  )
}

function SectionIV({ form, set, fl }: { form: FormData; set: (k: keyof FormData, v: unknown) => void; fl: FlHelper }) {
  return (
    <>
      {fl.visible('dept_interests') && (
        <>
          <Field label={fl.label('dept_interests')} optional={!fl.required('dept_interests')}>
            <CheckboxGroup options={DEPT_OPTIONS} value={form.department_interests} onChange={v => set('department_interests', v)} />
          </Field>
          <Divider />
        </>
      )}
      {fl.visible('leadership_interest') && (
        <>
          <Field label={fl.label('leadership_interest')} optional={!fl.required('leadership_interest')}>
            <RadioGroup options={['Yes', 'Maybe', 'Not this year']} value={form.leadership_interest} onChange={v => set('leadership_interest', v)} />
          </Field>
          <Divider label="Communal Responsibilities" />
        </>
      )}
      {!fl.visible('leadership_interest') && <Divider label="Communal Responsibilities" />}
      {fl.visible('setup_preference') && (
        <Field label={fl.label('setup_preference')} optional={!fl.required('setup_preference')}>
          <CheckboxGroup options={['Setup', 'Teardown', 'Decor']} value={form.setup_preference} onChange={v => set('setup_preference', v as string[])} />
        </Field>
      )}
      {fl.visible('setup_limitations') && (
        <Field label={fl.label('setup_limitations')} optional={!fl.required('setup_limitations')}>
          <CheckboxGroup
            options={['None', 'Unable to participate in setup', 'Unable to participate in teardown', 'Unable to participate in either', 'Prefer to discuss privately']}
            value={form.setup_limitations}
            onChange={v => set('setup_limitations', v as string[])}
          />
        </Field>
      )}
      {fl.visible('setup_notes') && (
        <>
          <Divider />
          <Field label={fl.label('setup_notes')} optional={!fl.required('setup_notes')}>
            <Textarea value={form.setup_notes} onChange={v => set('setup_notes', v)} placeholder="Your answer…" maxLength={800} />
          </Field>
        </>
      )}
    </>
  )
}

function SectionV({ form, set }: { form: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const allChecked = form.acknowledgements.length === AGREEMENT_ITEMS.length
  return (
    <>
      <p style={{ fontSize: '0.85rem', lineHeight: 1.8, opacity: 0.5, marginBottom: '2rem' }}>
        Please acknowledge the following. All items are required to complete your application.
      </p>
      <CheckboxGroup
        options={AGREEMENT_ITEMS}
        value={form.acknowledgements}
        onChange={v => set('acknowledgements', v as string[])}
      />
      {!allChecked && form.acknowledgements.length > 0 && (
        <p style={{ fontSize: '0.78rem', color: '#C8A848', opacity: 0.5, marginTop: '1rem', fontStyle: 'italic' }}>
          {AGREEMENT_ITEMS.length - form.acknowledgements.length} item{AGREEMENT_ITEMS.length - form.acknowledgements.length !== 1 ? 's' : ''} remaining
        </p>
      )}
    </>
  )
}

function SectionVI({ form, set, fl }: { form: FormData; set: (k: keyof FormData, v: unknown) => void; fl: FlHelper }) {
  return (
    <>
      <p style={{ fontSize: '0.95rem', lineHeight: 1.8, opacity: 0.55, marginBottom: '2rem', fontStyle: 'italic' }}>
        Before we proceed, there is one final matter that requires your attention.
      </p>
      <Field label={fl.label('shrimp_relationship')} optional={!fl.required('shrimp_relationship')}>
        <Textarea value={form.shrimp_relationship} onChange={v => set('shrimp_relationship', v)} placeholder="Reflect carefully. There are no wrong answers. There are, however, better ones." maxLength={500} />
      </Field>
    </>
  )
}

// ── Custom section (admin-added steps) ───────────────────────────────────────

function CustomSection({ step, answers, setAnswer }: {
  step: StepConfig
  answers: Record<string, string | string[]>
  setAnswer: (key: string, val: string | string[]) => void
}) {
  return (
    <>
      {step.fields.filter(f => f.visible).map(field => (
        <Field key={field.key} label={field.label} optional={!field.required}>
          {field.description && (
            <p style={{ fontSize: '0.8rem', opacity: 0.4, margin: '0 0 0.5rem', fontStyle: 'italic' }}>{field.description}</p>
          )}
          {(!field.type || field.type === 'text') && (
            <Input value={(answers[field.key] as string) ?? ''} onChange={v => setAnswer(field.key, v)} placeholder="Your answer…" />
          )}
          {field.type === 'textarea' && (
            <Textarea value={(answers[field.key] as string) ?? ''} onChange={v => setAnswer(field.key, v)} placeholder="Your answer…" />
          )}
          {field.type === 'radio' && field.options && (
            <RadioGroup options={field.options} value={(answers[field.key] as string) ?? ''} onChange={v => setAnswer(field.key, v)} />
          )}
          {field.type === 'checkbox' && field.options && (
            <CheckboxGroup options={field.options} value={(answers[field.key] as string[]) ?? []} onChange={v => setAnswer(field.key, v as string[])} />
          )}
        </Field>
      ))}
    </>
  )
}

// ── Extra custom fields appended to built-in sections ────────────────────────

function CustomFieldsAppendix({ fields, answers, setAnswer }: {
  fields: FieldConfig[]
  answers: Record<string, string | string[]>
  setAnswer: (key: string, val: string | string[]) => void
}) {
  if (fields.length === 0) return null
  return (
    <>
      <Divider />
      {fields.map(field => (
        <Field key={field.key} label={field.label} optional={!field.required}>
          {field.description && (
            <p style={{ fontSize: '0.8rem', opacity: 0.4, margin: '0 0 0.5rem', fontStyle: 'italic' }}>{field.description}</p>
          )}
          {(!field.type || field.type === 'text') && (
            <Input value={(answers[field.key] as string) ?? ''} onChange={v => setAnswer(field.key, v)} placeholder="Your answer…" />
          )}
          {field.type === 'textarea' && (
            <Textarea value={(answers[field.key] as string) ?? ''} onChange={v => setAnswer(field.key, v)} placeholder="Your answer…" />
          )}
          {field.type === 'radio' && field.options && (
            <RadioGroup options={field.options} value={(answers[field.key] as string) ?? ''} onChange={v => setAnswer(field.key, v)} />
          )}
          {field.type === 'checkbox' && field.options && (
            <CheckboxGroup options={field.options} value={(answers[field.key] as string[]) ?? []} onChange={v => setAnswer(field.key, v as string[])} />
          )}
        </Field>
      ))}
    </>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export function ApplyWizard({ userEmail, formConfig }: { userEmail: string; formConfig: MemberFormConfig }) {
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  const steps = formConfig.steps.filter(s => s.visible)
  const lastStep = steps.length - 1

  const [step, setStep] = useState(0)
  const [form, setFormState] = useState<FormData>({ ...BLANK, email: userEmail })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftSaved, setDraftSaved] = useState<Date | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        setFormState(prev => ({ ...prev, ...saved, email: userEmail }))
        setStep(saved.__step ?? 0)
      }
    } catch { /* ignore */ }

    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [userEmail])

  function set(k: keyof FormData, v: unknown) {
    setFormState(prev => {
      const next = { ...prev, [k]: v }
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...next, __step: step })) } catch { /* ignore */ }
      setDraftSaved(new Date())
      return next
    })
  }

  function goTo(s: number) {
    setStep(s)
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, __step: s })) } catch { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function canContinue() {
    const currentStepKey = steps[step]?.key
    const flBasic = makeFlHelper(formConfig, 'basic')

    if (currentStepKey === 'basic') {
      const needPhone = flBasic.required('phone')
      const needEmergency = flBasic.required('emergency_contact')
      const needCamped = flBasic.required('camped_before')
      const needAvatar = flBasic.required('avatar_url')
      return !!(
        form.first_name.trim() &&
        form.last_name.trim() &&
        form.email.trim() &&
        (!needPhone || form.phone.trim()) &&
        (!needEmergency || form.emergency_contact.trim()) &&
        (!needCamped || form.camped_before) &&
        (!needAvatar || form.avatar_url)
      )
    }
    if (currentStepKey === 'registry') return !!(form.glaum_acceptance)
    if (currentStepKey === 'plans') return !!(form.attendance)
    if (currentStepKey === 'agreement') return form.acknowledgements.length === AGREEMENT_ITEMS.length
    // Custom steps: check required fields have answers
    const currentStep = steps[step]
    if (currentStep?.isCustom) {
      return currentStep.fields
        .filter(f => f.visible && f.required)
        .every(f => {
          const val = form.custom_answers[f.key]
          return Array.isArray(val) ? val.length > 0 : !!(val as string)?.trim()
        })
    }
    return true
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          attunement_status: form.attunement_status ? [form.attunement_status] : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSubmitting(false); return }
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  const milestone = MILESTONE_FOR_KEY[steps[step]?.key ?? 'basic'] ?? 0

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '2.5rem', color: GOLD, marginBottom: '0.5rem', textShadow: '0 0 40px rgba(200,168,72,0.4)' }}>✦</p>
          <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: GOLD, marginBottom: '1rem' }}>Application Received</h1>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, opacity: 0.55, marginBottom: '2rem' }}>
            Thank you for applying to Glåüm. Your application is under review. We'll be in touch.
          </p>
          <a href="/profile" style={{ padding: '0.75rem 2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.5)', color: GOLD, textDecoration: 'none', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
            Go to your profile →
          </a>
        </div>
      </div>
    )
  }

  const sidebar = (
    <div style={{
      width: isMobile ? '100%' : '200px',
      flexShrink: 0,
      background: 'rgba(10,3,18,0.55)',
      backdropFilter: 'blur(0px)',
      borderRight: isMobile ? 'none' : '1px solid rgba(200,168,72,0.12)',
      borderBottom: isMobile ? '1px solid rgba(200,168,72,0.12)' : 'none',
      display: 'flex', flexDirection: isMobile ? 'row' : 'column',
      padding: isMobile ? '0.75rem 1rem' : '2.5rem 0 2rem',
      overflowX: isMobile ? 'auto' : 'visible',
    }}>
      {!isMobile && (
        <div style={{ padding: '0 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid rgba(200,168,72,0.1)', marginBottom: '1.5rem' }}>
          <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.4rem', color: GOLD, margin: '0 0 0.1rem', letterSpacing: '0.06em' }}>Glåüm</p>
          <p style={{ fontSize: '0.55rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, opacity: 0.45, margin: 0 }}>APPLICATION FOR MEMBERSHIP</p>
        </div>
      )}

      {steps.map((s, i) => {
        const active = i === step
        const done = i < step
        return (
          <button
            key={i}
            onClick={() => i < step && goTo(i)}
            style={{
              display: 'flex', alignItems: isMobile ? 'center' : 'flex-start',
              gap: isMobile ? '0' : '0.85rem',
              padding: isMobile ? '0.35rem 0.6rem' : '0.7rem 1.5rem',
              background: 'none', border: 'none',
              borderLeft: isMobile ? 'none' : `3px solid ${active ? GOLD : 'transparent'}`,
              cursor: i < step ? 'pointer' : 'default',
              textAlign: 'left', flexShrink: 0,
            }}
          >
            <div style={{
              width: isMobile ? '26px' : '22px',
              height: isMobile ? '26px' : '22px',
              borderRadius: '50%', flexShrink: 0,
              border: `1.5px solid ${active ? GOLD : done ? 'rgba(200,168,72,0.4)' : 'rgba(200,168,72,0.2)'}`,
              background: active ? 'rgba(200,168,72,0.12)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.58rem', color: active ? GOLD : done ? 'rgba(200,168,72,0.6)' : 'rgba(200,168,72,0.35)',
              letterSpacing: '0.02em', fontWeight: active ? 700 : 400,
            }}>
              {done ? '✓' : (ROMAN[i] ?? s.num)}
            </div>
            {!isMobile && (
              <div style={{ opacity: active ? 1 : done ? 0.5 : 0.28 }}>
                <p style={{ fontSize: '0.68rem', letterSpacing: '0.1em', color: active ? GOLD : CREAM, margin: '0 0 0.1rem', fontWeight: active ? 700 : 400 }}>{s.title}</p>
                <p style={{ fontSize: '0.65rem', color: CREAM, margin: 0, opacity: 0.6 }}>{s.subtitle}</p>
              </div>
            )}
          </button>
        )
      })}

      {!isMobile && (
        <div style={{ marginTop: 'auto', padding: '2rem 1.5rem 0', borderTop: '1px solid rgba(200,168,72,0.1)' }}>
          <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '0.75rem', color: GOLD, opacity: 0.35, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>MANY HANDS<br />MAKE LIGHT WORK</p>
        </div>
      )}
    </div>
  )

  const mainContent = (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1.5rem 1.25rem 6rem' : '3rem 3rem 6rem', maxWidth: '720px', width: '100%', margin: '0 auto' }}>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', minHeight: '1rem' }}>
        {draftSaved && (
          <p style={{ fontSize: '0.68rem', letterSpacing: '0.1em', color: GOLD, opacity: 0.35, margin: 0 }}>
            DRAFT SAVED • {draftSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '0.62rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: PURPLE, opacity: 0.65, margin: '0 0 0.4rem' }}>
          SECTION {ROMAN[step] ?? steps[step].num} OF {ROMAN[steps.length - 1] ?? steps[steps.length - 1].num}
        </p>
        <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', color: GOLD, margin: '0 0 0.5rem', letterSpacing: '0.08em', textShadow: '0 0 30px rgba(200,168,72,0.3)' }}>
          {steps[step].title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
          <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.4))' }} />
          <span style={{ color: GOLD, opacity: 0.4, fontSize: '0.65rem' }}>✦</span>
          <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, rgba(200,168,72,0.4), transparent)' }} />
        </div>
        <p style={{ fontSize: '0.8rem', color: CREAM, opacity: 0.4, margin: 0, letterSpacing: '0.05em' }}>{steps[step].subtitle}</p>
      </div>

      {/* Milestone track */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        {MILESTONES.map((label, i) => {
          const done = i < milestone
          const active = i === milestone
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                {i > 0 && <div style={{ flex: 1, height: '1px', background: done ? 'rgba(200,168,72,0.45)' : 'rgba(200,168,72,0.12)' }} />}
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  border: `${active ? 2 : 1.5}px solid ${done ? 'rgba(200,168,72,0.6)' : active ? GOLD : 'rgba(200,168,72,0.2)'}`,
                  background: done ? 'rgba(200,168,72,0.18)' : active ? 'rgba(200,168,72,0.12)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s',
                }}>
                  {done && <span style={{ fontSize: '0.55rem', color: GOLD, opacity: 0.8 }}>✓</span>}
                  {active && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: GOLD }} />}
                </div>
                {i < MILESTONES.length - 1 && <div style={{ flex: 1, height: '1px', background: done ? 'rgba(200,168,72,0.35)' : 'rgba(200,168,72,0.12)' }} />}
              </div>
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.03em', color: GOLD, opacity: active ? 0.9 : done ? 0.5 : 0.25, textAlign: 'center', lineHeight: 1.4, whiteSpace: 'pre-line', margin: '0.5rem 0 0', maxWidth: '70px' }}>
                {label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Form content */}
      <div style={{ marginBottom: '3rem' }}>
        {steps[step]?.key === 'basic'     && <SectionI   form={form} set={set} fl={makeFlHelper(formConfig, 'basic')} />}
        {steps[step]?.key === 'registry'  && <SectionII  form={form} set={set} fl={makeFlHelper(formConfig, 'registry')} />}
        {steps[step]?.key === 'plans'     && <SectionIII form={form} set={set} fl={makeFlHelper(formConfig, 'plans')} />}
        {steps[step]?.key === 'roles'     && <SectionIV  form={form} set={set} fl={makeFlHelper(formConfig, 'roles')} />}
        {steps[step]?.key === 'agreement' && <SectionV   form={form} set={set} />}
        {steps[step]?.key === 'shrimp'    && <SectionVI  form={form} set={set} fl={makeFlHelper(formConfig, 'shrimp')} />}
        {steps[step]?.isCustom && (
          <CustomSection
            step={steps[step]}
            answers={form.custom_answers}
            setAnswer={(k, v) => set('custom_answers', { ...form.custom_answers, [k]: v })}
          />
        )}
        {/* Admin-added custom fields appended to built-in sections */}
        {!steps[step]?.isCustom && (
          <CustomFieldsAppendix
            fields={(steps[step]?.fields ?? []).filter((f: FieldConfig) => f.isCustom && f.visible)}
            answers={form.custom_answers}
            setAnswer={(k, v) => set('custom_answers', { ...form.custom_answers, [k]: v })}
          />
        )}
      </div>

      {error && (
        <p style={{ color: '#ff8a8a', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid rgba(200,168,72,0.1)' }}>
        <button
          onClick={() => step > 0 ? goTo(step - 1) : undefined}
          style={{
            padding: '0.75rem 1.75rem', borderRadius: '9999px',
            border: '1px solid rgba(200,168,72,0.25)', background: 'transparent',
            color: CREAM, cursor: step > 0 ? 'pointer' : 'default', fontSize: '0.82rem',
            letterSpacing: '0.08em', opacity: step > 0 ? 0.75 : 0.2,
          }}
        >
          ← PREVIOUS SECTION
        </button>

        {step < lastStep ? (
          <button
            onClick={() => canContinue() && goTo(step + 1)}
            disabled={!canContinue()}
            style={{
              padding: '0.75rem 2.5rem', borderRadius: '9999px',
              border: 'none', background: canContinue() ? 'linear-gradient(135deg, #C8A848, #A8882A)' : 'rgba(200,168,72,0.2)',
              color: canContinue() ? '#1A0A00' : 'rgba(200,168,72,0.5)',
              cursor: canContinue() ? 'pointer' : 'not-allowed', fontSize: '0.85rem',
              letterSpacing: '0.1em', fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            CONTINUE →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '0.75rem 2.5rem', borderRadius: '9999px',
              border: 'none', background: submitting ? 'rgba(200,168,72,0.2)' : 'linear-gradient(135deg, #C8A848, #A8882A)',
              color: submitting ? 'rgba(200,168,72,0.5)' : '#1A0A00',
              cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
              letterSpacing: '0.1em', fontWeight: 600,
            }}
          >
            {submitting ? 'SUBMITTING…' : 'SUBMIT APPLICATION'}
          </button>
        )}
      </div>

      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.78rem', opacity: 0.4 }}>
        Your progress is saved automatically.{' '}
        <a href="/profile" style={{ color: GOLD, opacity: 0.8, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          Save and Exit
        </a>
      </p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row', color: CREAM }}>
      {sidebar}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        {mainContent}
      </div>
    </div>
  )
}
