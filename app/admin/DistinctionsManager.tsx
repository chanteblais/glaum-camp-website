'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DISTINCTION_OPS,
  DISTINCTION_ENGRAVING_MAX,
  type DistinctionCondition,
  type DistinctionOp,
  type DistinctionRule,
} from '@/lib/distinctions'
import {
  builtinAssets,
  orderedCategories,
  type AssetCategory,
  type AssetLibraryItem,
} from '@/lib/asset-library'
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
// Image sizing inside a tile/preview. `fill` = size by height + clip (like the
// Cabinet medal) — right for the heavily-padded circular badge art. `contain` =
// whole image, never cropped — right for icons, which fill their frame and aren't
// round, so they'd lose their tips/edges under `fill`.
type TileFit = 'fill' | 'contain'
function tileImgStyle(fit: TileFit): React.CSSProperties {
  return fit === 'fill'
    ? { height: '132%', width: 'auto', maxWidth: 'none', display: 'block' }
    : { width: '94%', height: '94%', objectFit: 'contain', display: 'block' }
}

// A single selectable medal thumbnail.
function MedalTile({ src, label, selected, onClick, fit = 'contain' }: {
  src: string
  label: string
  selected: boolean
  onClick: () => void
  fit?: TileFit
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      style={{ width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <span style={{
        width: 60, height: 60, borderRadius: '0.5rem', overflow: 'hidden',
        background: 'rgba(8,0,18,0.6)',
        border: selected ? '2px solid #C8A848' : '1px solid rgba(200,168,72,0.2)',
        boxShadow: selected ? '0 0 0 1px rgba(200,168,72,0.4)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" style={tileImgStyle(fit)} />
      </span>
      <span style={{ fontSize: '0.55rem', color: CREAM, opacity: selected ? 0.95 : 0.55, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
        {label}
      </span>
    </button>
  )
}

// Medal image picker: a small trigger showing the current selection that opens a
// modal asset library. The library is grouped into categories (Distinctions,
// Icons, …); the `primaryCategory` tab is shown first but the rest are browsable.
// Replaces the old glyph / paste-URL controls — external admins click an included
// image or upload their own. Built to scale as the library grows.
function MedalPicker({ ruleId, value, onChange, groupIconOptions, primaryCategory = 'distinction' }: {
  ruleId: string
  value: string | undefined
  onChange: (url: string | undefined) => void
  groupIconOptions: GroupIconOption[]
  primaryCategory?: AssetCategory
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [activeCat, setActiveCat] = useState<AssetCategory>(primaryCategory)

  async function upload(file: File) {
    setBusy(true); setErr(null)
    const fd = new FormData()
    fd.append('icon', file)
    const res = await fetch(`/api/admin/distinctions/${encodeURIComponent(ruleId)}/icon`, { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(data.error ?? 'Upload failed'); setBusy(false); return }
    onChange(data.image)
    setBusy(false)
    setOpen(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  type PickItem = { key: string; src: string; label: string; cat: AssetCategory }
  // Items shown for a category: built-in library assets plus, for Icons, the
  // community's reusable group icons (admin-named, so already generic).
  function itemsFor(cat: AssetCategory): PickItem[] {
    const builtins = builtinAssets(cat).map((a: AssetLibraryItem) => ({ key: a.id, src: a.src, label: a.label, cat }))
    if (cat === 'icon') {
      return [...builtins, ...groupIconOptions.map(g => ({ key: `group-${g.image}`, src: g.image, label: g.name, cat }))]
    }
    return builtins
  }

  const cats = orderedCategories(primaryCategory)
  const allItems = cats.flatMap(c => itemsFor(c.value))
  const selected = value ? allItems.find(i => i.src === value) : undefined
  const selectedLabel = value ? (selected?.label ?? '') : 'No image'
  const activeItems = itemsFor(activeCat)
  // Badges (padded circular art) fill; icons/uploads use contain so nothing crops.
  const fitFor = (cat: AssetCategory | undefined): TileFit => (cat === 'distinction' ? 'fill' : 'contain')
  const activeFit = fitFor(activeCat)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      <span style={tinyLabel}>Badge image</span>

      {/* Trigger: current selection + open button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{
          width: 52, height: 52, flexShrink: 0, borderRadius: '0.5rem', overflow: 'hidden',
          background: 'rgba(8,0,18,0.6)', border: '1px solid rgba(200,168,72,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {value
            ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={value} alt="" style={tileImgStyle(fitFor(selected?.cat))} />
            : <span style={{ fontSize: '0.55rem', opacity: 0.3 }}>—</span>}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
          {selectedLabel && <span style={{ fontSize: '0.78rem', color: CREAM, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel}</span>}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={() => { setActiveCat(primaryCategory); setErr(null); setOpen(true) }}
              style={{ ...selectStyle, cursor: 'pointer', color: '#FFFACD' }}
            >
              {value ? 'Change image' : 'Choose image'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                title="Use no image"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: CREAM, opacity: 0.4, fontSize: '0.7rem', textDecoration: 'underline', padding: 0 }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal asset library */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#1A0A24', border: '1px solid rgba(200,168,72,0.5)', borderRadius: '0.75rem', width: 'min(560px, 100%)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.1rem', borderBottom: '1px solid rgba(200,168,72,0.2)' }}>
              <span style={{ fontFamily: 'var(--font-cormorant-garamond), serif', fontSize: '1rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848' }}>Choose an image</span>
              <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: CREAM, opacity: 0.6, fontSize: '1.1rem', lineHeight: 1, padding: '0.2rem' }}>×</button>
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', padding: '0.7rem 1.1rem 0.4rem', flexWrap: 'wrap' }}>
              {cats.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setActiveCat(c.value)}
                  style={{
                    border: '1px solid rgba(200,168,72,0.3)', borderRadius: '9999px', cursor: 'pointer',
                    padding: '0.25rem 0.85rem', fontSize: '0.72rem', letterSpacing: '0.04em',
                    background: activeCat === c.value ? '#C8A848' : 'transparent',
                    color: activeCat === c.value ? '#1A0A24' : CREAM,
                    fontWeight: activeCat === c.value ? 600 : 400,
                    opacity: activeCat === c.value ? 1 : 0.7,
                  }}
                >{c.label}</button>
              ))}
            </div>

            {/* Grid */}
            <div style={{ padding: '0.5rem 1.1rem 0.9rem', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.7rem', alignContent: 'flex-start' }}>
              {activeItems.length === 0 ? (
                <span style={{ fontSize: '0.78rem', opacity: 0.45, fontStyle: 'italic', padding: '1rem 0' }}>No images in this category yet.</span>
              ) : activeItems.map(opt => (
                <MedalTile
                  key={opt.key}
                  src={opt.src}
                  label={opt.label}
                  selected={value === opt.src}
                  fit={activeFit}
                  onClick={() => { onChange(opt.src); setOpen(false) }}
                />
              ))}
            </div>

            {/* Footer: upload your own */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1.1rem', borderTop: '1px solid rgba(200,168,72,0.2)' }}>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                style={{ ...selectStyle, cursor: busy ? 'wait' : 'pointer', color: '#FFFACD', opacity: busy ? 0.5 : 1 }}
              >
                {busy ? 'Uploading…' : '＋ Upload your own'}
              </button>
              {err && <span style={{ fontSize: '0.7rem', color: '#ff8a8a' }}>{err}</span>}
            </div>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/png,image/webp,image/svg+xml,image/jpeg,image/gif" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
    </div>
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
  // Facts that actually represent a calendar year, for the "engraved year" picker —
  // excludes counts/durations like group count or years-since-joining.
  const yearFacts = numberFacts.filter(f =>
    f.key === 'joined_year' || (/\byear\b/i.test(f.label) && !/(since|ago|count|number|#)/i.test(f.label)),
  )

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

              {/* Medal image — pick an included image or upload your own */}
              <MedalPicker
                ruleId={rule.id}
                value={rule.image}
                onChange={url => patch(idx, { image: url })}
                groupIconOptions={groupIconOptions}
              />

              {/* Conditions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderLeft: '1px solid rgba(200,168,72,0.18)', paddingLeft: '0.7rem' }}>
                {/* How it's earned — segmented toggle between automatic (conditions) and by hand. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{ ...tinyLabel, opacity: 0.5 }}>How it&rsquo;s earned</span>
                  <div style={{ display: 'inline-flex', border: '1px solid rgba(200,168,72,0.3)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <button
                      onClick={() => { if (rule.conditions.length === 0) patch(idx, { conditions: [defaultCondition()] }) }}
                      title="Earned automatically when the member's facts meet conditions"
                      style={{ border: 'none', cursor: 'pointer', padding: '0.3rem 0.9rem', fontSize: '0.7rem', letterSpacing: '0.04em', background: rule.conditions.length > 0 ? GOLD : 'transparent', color: rule.conditions.length > 0 ? '#1A0A24' : CREAM, fontWeight: rule.conditions.length > 0 ? 600 : 400, opacity: rule.conditions.length > 0 ? 1 : 0.6 }}
                    >Automatically</button>
                    <button
                      onClick={() => { if (rule.conditions.length > 0) patch(idx, { conditions: [], match: undefined }) }}
                      title="Granted by hand, per-member, from the member's admin page"
                      style={{ border: 'none', borderLeft: '1px solid rgba(200,168,72,0.3)', cursor: 'pointer', padding: '0.3rem 0.9rem', fontSize: '0.7rem', letterSpacing: '0.04em', background: rule.conditions.length === 0 ? PURPLE : 'transparent', color: rule.conditions.length === 0 ? '#fff' : CREAM, fontWeight: rule.conditions.length === 0 ? 600 : 400, opacity: rule.conditions.length === 0 ? 1 : 0.6 }}
                    >By hand</button>
                  </div>
                </div>

                {rule.conditions.length === 0 ? (
                  <span style={{ fontSize: '0.72rem', opacity: 0.45, fontStyle: 'italic', lineHeight: 1.5 }}>
                    Awarded by hand from a member&rsquo;s page: <strong style={{ opacity: 0.8 }}>Admin → open a member → Distinctions</strong>.
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ ...tinyLabel, opacity: 0.45 }}>Earned when</span>
                    {rule.conditions.length > 1 ? (
                      <select
                        value={rule.match ?? 'all'}
                        onChange={e => patch(idx, { match: e.target.value === 'any' ? 'any' : undefined })}
                        style={{ ...selectStyle, padding: '0.1rem 0.3rem' }}
                        title="ALL = every condition (AND) · ANY = at least one (OR)"
                      >
                        <option value="all" style={{ background: '#1A0A24' }}>ALL</option>
                        <option value="any" style={{ background: '#1A0A24' }}>ANY</option>
                      </select>
                    ) : (
                      <span style={{ ...tinyLabel, opacity: 0.45 }}>{(rule.match ?? 'all') === 'any' ? 'ANY' : 'ALL'}</span>
                    )}
                    <span style={{ ...tinyLabel, opacity: 0.45 }}>of:</span>
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
                {rule.conditions.length > 0 && (
                  <button
                    onClick={() => patch(idx, { conditions: [...rule.conditions, defaultCondition()] })}
                    style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: GOLD, opacity: 0.6, fontSize: '0.72rem', letterSpacing: '0.04em', padding: '0.1rem 0' }}
                  >+ Add condition</button>
                )}
              </div>

              {/* Engraving — optional static caption under the medal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={tinyLabel}>Engraving</span>
                <input
                  value={rule.engraving ?? ''}
                  onChange={e => patch(idx, { engraving: e.target.value || undefined })}
                  maxLength={DISTINCTION_ENGRAVING_MAX}
                  placeholder="Optional caption under the medal"
                  title={`Short text engraved beneath the medal — up to ${DISTINCTION_ENGRAVING_MAX} characters`}
                  style={{ ...inputStyle, flex: 1, minWidth: '8rem', fontSize: '0.74rem' }}
                />
                <span style={{ ...tinyLabel, opacity: 0.4, fontVariantNumeric: 'tabular-nums' }}>
                  {(rule.engraving ?? '').length}/{DISTINCTION_ENGRAVING_MAX}
                </span>
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
                  {yearFacts.map(f => (
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
          { id: `distinction-${Date.now()}`, label: 'New distinction', conditions: [defaultCondition()], enabled: true },
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
