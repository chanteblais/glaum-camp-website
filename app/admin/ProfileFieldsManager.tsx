'use client'

import { useCallback, useRef, useState } from 'react'
import {
  PROFILE_FIELD_TYPES,
  SYSTEM_PROFILE_FIELDS,
  type ProfileField,
  type ProfileFieldType,
} from '@/lib/profile-fields'

const GOLD = '#C8A848'
const PURPLE = '#D239F8'
const CREAM = '#F3EDE6'

const inputStyle: React.CSSProperties = {
  background: 'transparent', border: 'none',
  borderBottom: '1px solid rgba(200,168,72,0.2)',
  color: CREAM, fontSize: '0.85rem', outline: 'none',
  padding: '0 0 0.15rem', fontFamily: 'inherit', boxSizing: 'border-box',
}
const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,168,72,0.2)',
  borderRadius: '0.3rem', color: CREAM, fontSize: '0.75rem',
  padding: '0.2rem 0.4rem', outline: 'none', fontFamily: 'inherit',
}
const tinyLabel: React.CSSProperties = {
  fontSize: '0.62rem', opacity: 0.4, letterSpacing: '0.08em',
  textTransform: 'uppercase', whiteSpace: 'nowrap',
}

const typeHasOptions = (t: ProfileFieldType) =>
  PROFILE_FIELD_TYPES.find(x => x.value === t)?.hasOptions ?? false

// camelCase key suggestion from a label, e.g. "Event Experience" → "eventExperience".
function keyFromLabel(label: string): string {
  const words = label.trim().toLowerCase().match(/[a-z0-9]+/g)
  if (!words || words.length === 0) return ''
  return words[0] + words.slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join('')
}

// Small pill toggle reused for the four capability flags + enable.
function Toggle({ on, onClick, title }: { on: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={title}
      style={{
        width: '34px', height: '19px', borderRadius: '9999px', flexShrink: 0,
        border: 'none', cursor: 'pointer', position: 'relative',
        background: on ? GOLD : 'rgba(255,255,255,0.12)', transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: '3px', left: on ? '18px' : '3px',
        width: '13px', height: '13px', borderRadius: '50%',
        background: on ? '#1A0A24' : 'rgba(255,255,255,0.5)', transition: 'left 0.2s',
      }} />
    </button>
  )
}

function FlagRow({ field, onChange }: {
  field: ProfileField
  onChange: (change: Partial<ProfileField>) => void
}) {
  const flags: { key: keyof ProfileField; label: string; title: string }[] = [
    { key: 'public',              label: 'Visible',      title: 'Shown on the member’s profile. Off = visible to admins only (in the member’s application detail)' },
    { key: 'memberEditable',      label: 'Editable',     title: 'Members can edit their own value' },
    { key: 'applicationEligible', label: 'In apps',      title: 'Can be used as an application question' },
    { key: 'distinctionEligible', label: 'In rules',     title: 'Can be referenced by distinction rules' },
    { key: 'askExisting',         label: 'Catch-up',     title: 'Prompt existing members who haven’t filled this in yet' },
    { key: 'required',            label: 'Required',     title: 'Catch-up prompt can’t be dismissed (use together with Catch-up)' },
  ]
  return (
    <div style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {flags.map(f => (
        <span key={f.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Toggle on={!!field[f.key]} onClick={() => onChange({ [f.key]: !field[f.key] })} title={f.title} />
          <span style={tinyLabel}>{f.label}</span>
        </span>
      ))}
    </div>
  )
}

// Comma-separated options editor. Keeps the RAW typed text in local state so you
// can actually type commas and spaces — the parsed options are derived in the
// background and the text is re-normalized on blur. (Binding the input straight to
// options.join(', ') made separators un-typeable: the trailing empty segment got
// filtered out and spaces trimmed on every keystroke.) Keyed by field key upstream
// so reordering fields gives each its own fresh text.
function OptionsInput({ value, onChange }: { value: string[]; onChange: (opts: string[]) => void }) {
  const [text, setText] = useState(() => value.join(', '))
  return (
    <input
      value={text}
      onChange={e => {
        setText(e.target.value)
        onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))
      }}
      onBlur={() => setText(value.join(', '))}
      placeholder="Options, comma-separated (e.g. 2022, 2023, 2024)"
      style={{ ...inputStyle, flex: 1, minWidth: '12rem', fontSize: '0.75rem' }}
    />
  )
}

export function ProfileFieldsManager({ initialFields }: { initialFields: ProfileField[] }) {
  const [fields, setFields] = useState<ProfileField[]>(initialFields)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keys that already existed when the manager loaded — these may have member
  // answers saved against them (member_profiles.values is keyed by field key), so
  // their key must stay stable. Renaming such a field's LABEL never re-keys it.
  const persistedKeys = useRef(new Set(initialFields.map(f => f.key)))

  const save = useCallback((next: ProfileField[]) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/admin/page-content', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config_profile_fields: JSON.stringify(next) }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setError(d.error ?? 'Failed to save'); setSaved(false)
        } else {
          setError(null); setSaved(true); setTimeout(() => setSaved(false), 1800)
        }
      } catch { setError('Network error'); setSaved(false) }
    }, 600)
  }, [])

  function update(next: ProfileField[]) { setFields(next); save(next) }

  // Stored (admin-defined) fields are editable + reorderable; system fields are
  // shown read-only below as a reference for the distinction rule builder.
  const stored = fields.filter(f => !f.system)
  const system = fields.filter(f => f.system)

  // Patch / move / delete operate on the stored slice but write back the full
  // list (stored first, then system) so system fields are preserved untouched.
  const commitStored = (nextStored: ProfileField[]) => update([...nextStored, ...system])
  const patch = (idx: number, change: Partial<ProfileField>) =>
    commitStored(stored.map((f, i) => i === idx ? { ...f, ...change } : f))

  const usedKeys = new Set(fields.map(f => f.key))

  function addField() {
    let key = 'newField'
    let n = 1
    while (usedKeys.has(key)) { key = `newField${++n}` }
    commitStored([
      ...stored,
      {
        key, label: 'New field', type: 'text',
        public: true, memberEditable: true, applicationEligible: true,
        distinctionEligible: false, enabled: true,
      },
    ])
  }

  return (
    <div>
      <p style={{ fontSize: '0.78rem', opacity: 0.5, lineHeight: 1.6, margin: '0 0 1.25rem' }}>
        Profile fields are the details you keep about each member — things like skills, languages,
        or which years they&rsquo;ve camped. Add a field once, and you can ask for it on the
        application form and use it to award distinctions. Each member&rsquo;s answer lives on their
        profile, so the same field works everywhere.
        <br />
        <span style={{ opacity: 0.7 }}>
          Use the toggles on each field to choose where it shows up. The <strong>system fields</strong>{' '}
          at the bottom are filled in automatically (like how many groups someone belongs to) and can
          be used in distinction rules.
        </span>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.25rem' }}>
        {stored.length === 0 && (
          <p style={{ textAlign: 'center', opacity: 0.4, fontStyle: 'italic', fontSize: '0.82rem', padding: '1rem 0' }}>
            No custom profile fields yet. Add one to start building the member schema.
          </p>
        )}

        {stored.map((field, idx) => {
          const keyConflict = stored.some((o, i) => i !== idx && o.key === field.key) ||
            system.some(s => s.key === field.key)
          return (
            <div
              key={idx}
              style={{
                border: '1px solid rgba(200,168,72,0.15)', borderRadius: '0.75rem',
                background: 'rgba(200,168,72,0.02)', padding: '0.95rem 1rem',
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                opacity: field.enabled ? 1 : 0.55,
              }}
            >
              <Toggle on={field.enabled} onClick={() => patch(idx, { enabled: !field.enabled })} title={field.enabled ? 'Active' : 'Disabled'} />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.7rem', minWidth: 0 }}>
                {/* Label + key */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <input
                    value={field.label}
                    onChange={e => {
                      // Auto-track key from label only for NEW fields (added this
                      // session) whose key still matches the auto-suggestion. Fields
                      // loaded from the server keep their key so renaming the label
                      // never orphans saved member answers keyed by it.
                      const prevAuto = keyFromLabel(field.label)
                      const change: Partial<ProfileField> = { label: e.target.value }
                      const isNew = !persistedKeys.current.has(field.key)
                      if (isNew && (field.key === prevAuto || field.key === '')) {
                        change.key = keyFromLabel(e.target.value)
                      }
                      patch(idx, change)
                    }}
                    placeholder="Display name (e.g. Event Experience)"
                    style={{ ...inputStyle, flex: 1, minWidth: '10rem' }}
                  />
                  <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={tinyLabel}>Key</span>
                    <input
                      value={field.key}
                      onChange={e => patch(idx, { key: e.target.value.replace(/\s+/g, '') })}
                      placeholder="eventExperience"
                      style={{ ...selectStyle, width: '9rem', color: keyConflict ? '#ff8a8a' : '#C9B68F', fontFamily: 'monospace' }}
                      title={keyConflict ? 'Key must be unique' : 'Internal key — the stable identity for saved answers. Changing it disconnects existing member responses.'}
                    />
                  </span>
                </div>

                <input
                  value={field.description ?? ''}
                  onChange={e => patch(idx, { description: e.target.value || undefined })}
                  placeholder="Helper text (optional)"
                  style={{ ...inputStyle, width: '100%', fontSize: '0.78rem', opacity: 0.85 }}
                />

                {/* Type + options */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={tinyLabel}>Type</span>
                  <select
                    value={field.type}
                    onChange={e => {
                      const type = e.target.value as ProfileFieldType
                      patch(idx, { type, options: typeHasOptions(type) ? (field.options ?? []) : undefined })
                    }}
                    style={selectStyle}
                  >
                    {PROFILE_FIELD_TYPES.map(t => (
                      <option key={t.value} value={t.value} style={{ background: '#1A0A24' }}>{t.label}</option>
                    ))}
                  </select>
                  {typeHasOptions(field.type) && (
                    <OptionsInput
                      key={field.key}
                      value={field.options ?? []}
                      onChange={opts => patch(idx, { options: opts })}
                    />
                  )}
                </div>

                {/* Capability flags */}
                <FlagRow field={field} onChange={change => patch(idx, change)} />
              </div>

              {/* Move + delete */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                <button
                  onClick={() => { if (idx === 0) return; const n = [...stored]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; commitStored(n) }}
                  disabled={idx === 0} title="Move up"
                  style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: GOLD, opacity: idx === 0 ? 0.2 : 0.5, fontSize: '0.75rem', padding: '0.1rem' }}
                >▲</button>
                <button
                  onClick={() => { if (idx === stored.length - 1) return; const n = [...stored]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; commitStored(n) }}
                  disabled={idx === stored.length - 1} title="Move down"
                  style={{ background: 'none', border: 'none', cursor: idx === stored.length - 1 ? 'default' : 'pointer', color: GOLD, opacity: idx === stored.length - 1 ? 0.2 : 0.5, fontSize: '0.75rem', padding: '0.1rem' }}
                >▼</button>
                <button
                  onClick={() => { if (!window.confirm(`Remove "${field.label}"?`)) return; commitStored(stored.filter((_, i) => i !== idx)) }}
                  title="Remove"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff8a8a', opacity: 0.45, fontSize: '0.8rem', padding: '0.1rem', marginTop: '0.15rem' }}
                >✕</button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={addField}
        style={{
          width: '100%', padding: '0.65rem',
          border: '1px dashed rgba(210,57,248,0.25)', borderRadius: '0.75rem',
          background: 'transparent', color: PURPLE, fontSize: '0.8rem',
          letterSpacing: '0.08em', cursor: 'pointer', opacity: 0.6,
        }}
      >+ Add profile field</button>

      {/* System fields — read-only reference */}
      <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(200,168,72,0.12)', paddingTop: '1rem' }}>
        <p style={{ ...tinyLabel, opacity: 0.45, marginBottom: '0.6rem' }}>System fields (derived · read-only)</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(system.length ? system : SYSTEM_PROFILE_FIELDS).map(f => (
            <span
              key={f.key}
              title={`${f.type}${f.distinctionEligible ? ' · usable in rules' : ''}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.25rem 0.7rem', borderRadius: '9999px',
                border: '1px solid rgba(200,168,72,0.18)', background: 'rgba(255,255,255,0.02)',
                fontSize: '0.74rem', opacity: 0.8,
              }}
            >
              {f.label}
              <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', opacity: 0.45 }}>{f.key}</span>
            </span>
          ))}
        </div>
      </div>

      <div style={{ minHeight: '1.2rem', marginTop: '0.75rem' }}>
        {error && <p style={{ fontSize: '0.78rem', color: '#ff8a8a', margin: 0 }}>{error}</p>}
        {!error && saved && <p style={{ fontSize: '0.72rem', color: GOLD, opacity: 0.6, margin: 0 }}>Saved ✓</p>}
      </div>
    </div>
  )
}
