'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DISTINCTION_OPS,
  type DistinctionCondition,
  type DistinctionOp,
  type DistinctionRule,
} from '@/lib/distinctions'
import type { DistinctionCatalogEntry, DistinctionValueType } from '@/lib/profile-fields'

const GOLD = '#C8A848'
const PURPLE = '#D239F8'
const CREAM = '#F3EDE6'

export type GroupIconOption = { name: string; image: string }

const isBoolOp = (op: DistinctionOp) => op === 'is_true' || op === 'is_false'
// Count ops compare the NUMBER of selected values, so their value input is numeric
// even though the fact itself is a list (string[]).
const isCountOp = (op: DistinctionOp) => op === 'count_gte'

// ── Medal art upload ─────────────────────────────────────────────────────────
// Uploads a custom medal image for a single distinction, normalized onto the
// standard icon frame server-side, and reports the resulting URL upward so it's
// written into the rule's `image` field (and autosaved with the rest of the JSON).
// Shows a live thumbnail of whatever `value` currently is — uploaded, a reused
// group icon, or a pasted URL.
function MedalUpload({ ruleId, value, onChange }: {
  ruleId: string
  value: string | undefined
  onChange: (url: string | undefined) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true); setErr(null)
    const fd = new FormData()
    fd.append('icon', file)
    const res = await fetch(`/api/admin/distinctions/${encodeURIComponent(ruleId)}/icon`, { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(data.error ?? 'Upload failed'); setBusy(false); return }
    onChange(data.image)
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{
        width: 28, height: 28, flexShrink: 0, borderRadius: '0.35rem',
        border: '1px solid rgba(200,168,72,0.2)', background: 'rgba(255,255,255,0.03)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {value
          ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <span style={{ fontSize: '0.55rem', opacity: 0.3 }}>—</span>}
      </span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        style={{ ...selectStyle, cursor: busy ? 'wait' : 'pointer', color: '#FFFACD', opacity: busy ? 0.5 : 1 }}
        title="Upload a custom medal image"
      >
        {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/webp,image/svg+xml,image/jpeg,image/gif" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
      {err && <span style={{ fontSize: '0.62rem', color: '#ff8a8a' }}>{err}</span>}
    </span>
  )
}

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

export function DistinctionsManager({
  initialDistinctions,
  groupIconOptions,
  factCatalog,
}: {
  initialDistinctions: DistinctionRule[]
  groupIconOptions: GroupIconOption[]
  /** Facts a rule may reference — system (derived) + stored profile fields. */
  factCatalog: DistinctionCatalogEntry[]
}) {
  const factType = (key: string): DistinctionValueType =>
    factCatalog.find(f => f.key === key)?.type ?? 'string'
  const opsForFact = (key: string) =>
    DISTINCTION_OPS.filter(o => o.forTypes.includes(factType(key)))
  const numberFacts = factCatalog.filter(f => f.type === 'number')

  // A new condition defaults to the first number fact (else first fact), with a
  // valid operator/value for its type.
  const defaultCondition = (): DistinctionCondition => {
    const f = numberFacts[0] ?? factCatalog[0]
    if (!f) return { fact: 'years_since_joined', op: 'gte', value: 1 }
    const op = opsForFact(f.key)[0]?.value ?? 'eq'
    return { fact: f.key, op, value: isBoolOp(op) ? undefined : (f.type === 'number' ? 1 : '') }
  }

  const [rules, setRules] = useState<DistinctionRule[]>(initialDistinctions)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Manual save: edits stay local until "Save changes" is clicked. `dirty` tracks
  // unsaved edits so the button/status make the state obvious.
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/page-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_distinctions: JSON.stringify(rules) }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to save')
      } else {
        setError(null); setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
      }
    } catch { setError('Network error') }
    setSaving(false)
  }

  // Warn before leaving (tab close / refresh) with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  function update(next: DistinctionRule[]) { setRules(next); setDirty(true); setSaved(false) }
  const patch = (idx: number, change: Partial<DistinctionRule>) =>
    update(rules.map((r, i) => i === idx ? { ...r, ...change } : r))

  function patchCondition(ruleIdx: number, condIdx: number, change: Partial<DistinctionCondition>) {
    patch(ruleIdx, {
      conditions: rules[ruleIdx].conditions.map((c, i) => i === condIdx ? { ...c, ...change } : c),
    })
  }

  return (
    <div>
      <p style={{ fontSize: '0.78rem', opacity: 0.5, lineHeight: 1.6, margin: '0 0 1.25rem' }}>
        Distinctions are the engraved medals in each member&rsquo;s{' '}
        <strong style={{ opacity: 0.8 }}>Cabinet of Distinctions</strong>. They&rsquo;re earned
        automatically — a member receives one when their facts satisfy <em>all</em> of a rule&rsquo;s
        conditions. Medals are never assigned by hand; they&rsquo;re derived from member data, so they
        stay correct over time.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.25rem' }}>
        {rules.length === 0 && (
          <p style={{ textAlign: 'center', opacity: 0.4, fontStyle: 'italic', fontSize: '0.82rem', padding: '1rem 0' }}>
            No distinctions defined. The cabinet stays empty until you add one.
          </p>
        )}

        {rules.map((rule, idx) => (
          <div
            key={rule.id}
            style={{
              border: '1px solid rgba(200,168,72,0.15)', borderRadius: '0.75rem',
              background: 'rgba(200,168,72,0.02)', padding: '0.95rem 1rem',
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              opacity: rule.enabled ? 1 : 0.55,
            }}
          >
            {/* Enable toggle */}
            <button
              onClick={() => patch(idx, { enabled: !rule.enabled })}
              aria-pressed={rule.enabled}
              title={rule.enabled ? 'Active' : 'Disabled'}
              style={{
                width: '40px', height: '22px', borderRadius: '9999px', flexShrink: 0, marginTop: '0.15rem',
                border: 'none', cursor: 'pointer',
                background: rule.enabled ? GOLD : 'rgba(255,255,255,0.12)',
                transition: 'background 0.2s', position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: '3px', left: rule.enabled ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: rule.enabled ? '#1A0A24' : 'rgba(255,255,255,0.5)',
                transition: 'left 0.2s',
              }} />
            </button>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.7rem', minWidth: 0 }}>
              {/* Label + description */}
              <input
                value={rule.label}
                onChange={e => patch(idx, { label: e.target.value })}
                placeholder="Label (e.g. Five Year Attunement)"
                style={{ ...inputStyle, width: '100%' }}
              />
              <input
                value={rule.description ?? ''}
                onChange={e => patch(idx, { description: e.target.value })}
                placeholder="Short caption (optional)"
                style={{ ...inputStyle, width: '100%', fontSize: '0.78rem', opacity: 0.85 }}
              />

              {/* Medal art */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={tinyLabel}>Medal</span>
                <input
                  value={rule.glyph ?? ''}
                  onChange={e => patch(idx, { glyph: e.target.value })}
                  placeholder="✦"
                  title="Emoji glyph (used when no image)"
                  style={{ ...selectStyle, width: '3rem', textAlign: 'center' }}
                />
                <select
                  value={rule.image ?? ''}
                  onChange={e => patch(idx, { image: e.target.value || undefined })}
                  style={selectStyle}
                  title="Reuse a group icon"
                >
                  <option value="" style={{ background: '#1A0A24' }}>— use glyph —</option>
                  {groupIconOptions.map(g => (
                    <option key={g.image} value={g.image} style={{ background: '#1A0A24' }}>{g.name} icon</option>
                  ))}
                </select>
                <input
                  value={rule.image ?? ''}
                  onChange={e => patch(idx, { image: e.target.value || undefined })}
                  placeholder="or paste image URL"
                  style={{ ...inputStyle, flex: 1, minWidth: '8rem', fontSize: '0.72rem' }}
                />
                <MedalUpload
                  ruleId={rule.id}
                  value={rule.image}
                  onChange={url => patch(idx, { image: url })}
                />
              </div>

              {/* Conditions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderLeft: '1px solid rgba(200,168,72,0.18)', paddingLeft: '0.7rem' }}>
                <span style={{ ...tinyLabel, opacity: 0.45 }}>Earned when ALL of:</span>
                {rule.conditions.length === 0 && (
                  <span style={{ fontSize: '0.7rem', opacity: 0.35, fontStyle: 'italic' }}>
                    No conditions — this rule never fires. Add one.
                  </span>
                )}
                {rule.conditions.map((c, ci) => {
                  const ops = opsForFact(c.fact)
                  return (
                    <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <select
                        value={c.fact}
                        onChange={e => {
                          const fact = e.target.value
                          const allowed = opsForFact(fact)
                          const op = allowed.some(o => o.value === c.op) ? c.op : allowed[0]?.value ?? 'eq'
                          patchCondition(idx, ci, { fact, op })
                        }}
                        style={selectStyle}
                      >
                        {factCatalog.map(f => (
                          <option key={f.key} value={f.key} style={{ background: '#1A0A24' }}>{f.label}</option>
                        ))}
                      </select>
                      <select
                        value={c.op}
                        onChange={e => {
                          const op = e.target.value as DistinctionOp
                          const change: Partial<DistinctionCondition> = { op }
                          // Keep the value valid for the new operator's input kind.
                          if (isBoolOp(op)) change.value = undefined
                          else if (isCountOp(op) && typeof c.value !== 'number') change.value = 1
                          patchCondition(idx, ci, change)
                        }}
                        style={selectStyle}
                      >
                        {ops.map(o => (
                          <option key={o.value} value={o.value} style={{ background: '#1A0A24' }}>{o.label}</option>
                        ))}
                      </select>
                      {!isBoolOp(c.op) && (() => {
                        const numeric = factType(c.fact) === 'number' || isCountOp(c.op)
                        return (
                          <input
                            value={c.value ?? ''}
                            onChange={e => {
                              const v = e.target.value
                              patchCondition(idx, ci, { value: numeric ? (v === '' ? undefined : Number(v)) : v })
                            }}
                            type={numeric ? 'number' : 'text'}
                            min={isCountOp(c.op) ? 1 : undefined}
                            placeholder={isCountOp(c.op) ? 'count' : 'value'}
                            style={{ ...selectStyle, width: '5rem' }}
                          />
                        )
                      })()}
                      <button
                        onClick={() => patch(idx, { conditions: rule.conditions.filter((_, i) => i !== ci) })}
                        title="Remove condition"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff8a8a', opacity: 0.45, fontSize: '0.8rem', padding: '0 0.1rem' }}
                      >✕</button>
                    </div>
                  )
                })}
                <button
                  onClick={() => patch(idx, { conditions: [...rule.conditions, defaultCondition()] })}
                  style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: GOLD, opacity: 0.6, fontSize: '0.72rem', letterSpacing: '0.04em', padding: '0.1rem 0' }}
                >+ Add condition</button>
              </div>

              {/* Year source */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={tinyLabel}>Engraved year</span>
                <select
                  value={rule.yearFact ?? ''}
                  onChange={e => patch(idx, { yearFact: e.target.value || undefined })}
                  style={selectStyle}
                >
                  <option value="" style={{ background: '#1A0A24' }}>— none —</option>
                  {numberFacts.map(f => (
                    <option key={f.key} value={f.key} style={{ background: '#1A0A24' }}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Move + delete */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
              <button
                onClick={() => {
                  if (idx === 0) return
                  const next = [...rules]
                  ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                  update(next)
                }}
                disabled={idx === 0}
                title="Move up"
                style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: GOLD, opacity: idx === 0 ? 0.2 : 0.5, fontSize: '0.75rem', padding: '0.1rem' }}
              >▲</button>
              <button
                onClick={() => {
                  if (idx === rules.length - 1) return
                  const next = [...rules]
                  ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
                  update(next)
                }}
                disabled={idx === rules.length - 1}
                title="Move down"
                style={{ background: 'none', border: 'none', cursor: idx === rules.length - 1 ? 'default' : 'pointer', color: GOLD, opacity: idx === rules.length - 1 ? 0.2 : 0.5, fontSize: '0.75rem', padding: '0.1rem' }}
              >▼</button>
              <button
                onClick={() => {
                  if (!window.confirm(`Remove "${rule.label}"?`)) return
                  update(rules.filter((_, i) => i !== idx))
                }}
                title="Remove"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff8a8a', opacity: 0.45, fontSize: '0.8rem', padding: '0.1rem', marginTop: '0.15rem' }}
              >✕</button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => update([
          ...rules,
          { id: `distinction-${Date.now()}`, label: 'New distinction', glyph: '✦', conditions: [defaultCondition()], enabled: true },
        ])}
        style={{
          width: '100%', padding: '0.65rem',
          border: '1px dashed rgba(210,57,248,0.25)',
          borderRadius: '0.75rem', background: 'transparent',
          color: PURPLE, fontSize: '0.8rem', letterSpacing: '0.08em',
          cursor: 'pointer', opacity: 0.6,
        }}
      >+ Add distinction</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.25rem' }}>
        <button
          onClick={save}
          disabled={!dirty || saving}
          style={{
            padding: '0.6rem 1.6rem', borderRadius: '9999px', border: 'none',
            cursor: (!dirty || saving) ? 'default' : 'pointer',
            background: (!dirty || saving) ? 'rgba(200,168,72,0.15)' : GOLD,
            color: (!dirty || saving) ? 'rgba(243,237,230,0.5)' : '#1A0A24',
            fontSize: '0.82rem', letterSpacing: '0.06em', fontWeight: 600,
            transition: 'all 0.15s',
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <span style={{ fontSize: '0.75rem' }}>
          {error
            ? <span style={{ color: '#ff8a8a' }}>{error}</span>
            : saving ? null
            : dirty ? <span style={{ color: PURPLE, opacity: 0.85 }}>Unsaved changes</span>
            : saved ? <span style={{ color: GOLD, opacity: 0.7 }}>Saved ✓</span>
            : null}
        </span>
      </div>
    </div>
  )
}
