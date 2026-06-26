'use client'

import { useCallback, useRef, useState } from 'react'
import {
  DISTINCTION_OPS,
  type DistinctionCondition,
  type DistinctionOp,
  type DistinctionRule,
} from '@/lib/distinctions'
import { MEMBER_FACT_CATALOG, type MemberFactType } from '@/lib/member-facts'

const GOLD = '#C8A848'
const PURPLE = '#D239F8'
const CREAM = '#F3EDE6'

export type GroupIconOption = { name: string; image: string }

const factType = (key: string): MemberFactType =>
  MEMBER_FACT_CATALOG.find(f => f.key === key)?.type ?? 'string'

const opsForFact = (key: string) =>
  DISTINCTION_OPS.filter(o => o.forTypes.includes(factType(key)))

const isBoolOp = (op: DistinctionOp) => op === 'is_true' || op === 'is_false'

const numberFacts = MEMBER_FACT_CATALOG.filter(f => f.type === 'number')

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
}: {
  initialDistinctions: DistinctionRule[]
  groupIconOptions: GroupIconOption[]
}) {
  const [rules, setRules] = useState<DistinctionRule[]>(initialDistinctions)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback((next: DistinctionRule[]) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/admin/page-content', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config_distinctions: JSON.stringify(next) }),
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

  function update(next: DistinctionRule[]) { setRules(next); save(next) }
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
                        {MEMBER_FACT_CATALOG.map(f => (
                          <option key={f.key} value={f.key} style={{ background: '#1A0A24' }}>{f.label}</option>
                        ))}
                      </select>
                      <select
                        value={c.op}
                        onChange={e => patchCondition(idx, ci, { op: e.target.value as DistinctionOp })}
                        style={selectStyle}
                      >
                        {ops.map(o => (
                          <option key={o.value} value={o.value} style={{ background: '#1A0A24' }}>{o.label}</option>
                        ))}
                      </select>
                      {!isBoolOp(c.op) && (
                        <input
                          value={c.value ?? ''}
                          onChange={e => {
                            const v = e.target.value
                            const num = factType(c.fact) === 'number'
                            patchCondition(idx, ci, { value: num ? (v === '' ? undefined : Number(v)) : v })
                          }}
                          type={factType(c.fact) === 'number' ? 'number' : 'text'}
                          placeholder="value"
                          style={{ ...selectStyle, width: '5rem' }}
                        />
                      )}
                      <button
                        onClick={() => patch(idx, { conditions: rule.conditions.filter((_, i) => i !== ci) })}
                        title="Remove condition"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff8a8a', opacity: 0.45, fontSize: '0.8rem', padding: '0 0.1rem' }}
                      >✕</button>
                    </div>
                  )
                })}
                <button
                  onClick={() => patch(idx, { conditions: [...rule.conditions, { fact: 'years_since_joined', op: 'gte', value: 1 }] })}
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
          { id: `distinction-${Date.now()}`, label: 'New distinction', glyph: '✦', conditions: [{ fact: 'years_since_joined', op: 'gte', value: 1 }], enabled: true },
        ])}
        style={{
          width: '100%', padding: '0.65rem',
          border: '1px dashed rgba(210,57,248,0.25)',
          borderRadius: '0.75rem', background: 'transparent',
          color: PURPLE, fontSize: '0.8rem', letterSpacing: '0.08em',
          cursor: 'pointer', opacity: 0.6,
        }}
      >+ Add distinction</button>

      <div style={{ minHeight: '1.2rem', marginTop: '0.75rem' }}>
        {error && <p style={{ fontSize: '0.78rem', color: '#ff8a8a', margin: 0 }}>{error}</p>}
        {!error && saved && <p style={{ fontSize: '0.72rem', color: GOLD, opacity: 0.6, margin: 0 }}>Saved ✓</p>}
      </div>
    </div>
  )
}
