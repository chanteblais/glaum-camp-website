// Distinction rules — admin-configurable honours derived from member facts.
//
// Architectural principle: we STORE FACTS (lib/member-facts.ts) and DERIVE
// distinctions from rules. Earned medals are never persisted; they're recomputed
// on every render from the member's facts + the admin's rule config.
//
// Mirrors the Attunement Tasks system (lib/site-config.ts → parseAttunementTasks,
// app/admin/AttunementTasksManager.tsx): config is one JSON string stored in
// page_content under `config_distinctions`, edited in DistinctionsManager.

// The evaluation context is the merged namespace of derived system facts
// (lib/member-facts.ts) AND stored profile values (member_profiles.values),
// keyed by registry field key. The engine reads it generically — it neither
// knows nor cares where a value came from. See docs/profile-architecture.md.
export type FactContext = Record<string, unknown>

export type DistinctionOp = 'gte' | 'lte' | 'eq' | 'includes' | 'count_gte' | 'is_true' | 'is_false'

export const DISTINCTION_OPS: { value: DistinctionOp; label: string; forTypes: string[] }[] = [
  { value: 'gte',       label: '≥',            forTypes: ['number'] },
  { value: 'lte',       label: '≤',            forTypes: ['number'] },
  { value: 'eq',        label: '=',            forTypes: ['number', 'string'] },
  { value: 'includes',  label: 'includes',     forTypes: ['string[]'] },
  // Cardinality: how many values are selected (e.g. "Veteran — Event Experience
  // has at least 3 values"). Value is the threshold count.
  { value: 'count_gte', label: 'has at least', forTypes: ['string[]'] },
  { value: 'is_true',   label: 'is true',      forTypes: ['boolean'] },
  { value: 'is_false',  label: 'is false',     forTypes: ['boolean'] },
]

export type DistinctionCondition = {
  fact: string
  op: DistinctionOp
  value?: string | number
}

export type DistinctionRule = {
  id: string
  label: string
  description?: string
  /** Medal art URL (an existing group icon_image, or a pasted image URL). */
  image?: string
  /** Emoji glyph fallback, rendered in a CSS frame when no `image` is set. */
  glyph?: string
  /** Which fact supplies the medal's engraved year (e.g. `joined_year`). */
  yearFact?: string
  /** All conditions must pass (AND). */
  conditions: DistinctionCondition[]
  enabled: boolean
}

export type EarnedDistinction = {
  id: string
  label: string
  description?: string
  image?: string
  glyph?: string
  year?: number
}

// Default honours — populate the cabinet out of the box. Rules referencing facts
// we can't yet derive (e.g. camps_attended for "Glåüm Elder") are defined here so
// the architecture is visible, but they stay dormant until that fact exists.
export const DEFAULT_DISTINCTIONS: DistinctionRule[] = [
  {
    id: 'founder',
    label: 'Founding Member',
    description: 'Here from the beginning.',
    glyph: '⛺',
    yearFact: 'joined_year',
    conditions: [{ fact: 'joined_year', op: 'lte', value: 2026 }],
    enabled: true,
  },
  {
    id: 'five-year',
    label: 'Five Year Attunement',
    description: 'Five years with Glåüm.',
    glyph: '✦',
    yearFact: 'joined_year',
    conditions: [{ fact: 'years_since_joined', op: 'gte', value: 5 }],
    enabled: true,
  },
  {
    id: 'many-hands',
    label: 'Many Hands',
    description: 'Lends a hand across many groups.',
    glyph: '✋',
    conditions: [{ fact: 'group_count', op: 'gte', value: 3 }],
    enabled: true,
  },
  {
    id: 'glaum-elder',
    label: 'Glåüm Elder',
    description: 'Ten camps and counting.',
    glyph: '🌳',
    // Dormant until `camps_attended` becomes a derivable fact.
    conditions: [{ fact: 'camps_attended', op: 'gte', value: 10 }],
    enabled: true,
  },
]

const VALID_OPS = new Set<DistinctionOp>(DISTINCTION_OPS.map(o => o.value))

function parseCondition(c: unknown): DistinctionCondition | null {
  if (!c || typeof c !== 'object') return null
  const obj = c as Record<string, unknown>
  if (typeof obj.fact !== 'string') return null
  if (!VALID_OPS.has(obj.op as DistinctionOp)) return null
  const value =
    typeof obj.value === 'number' || typeof obj.value === 'string' ? obj.value : undefined
  return { fact: obj.fact, op: obj.op as DistinctionOp, value }
}

export function parseDistinctions(raw?: string | null): DistinctionRule[] {
  if (!raw) return DEFAULT_DISTINCTIONS
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return DEFAULT_DISTINCTIONS
    return arr
      .filter((r: unknown): r is Record<string, unknown> =>
        !!r && typeof (r as { label?: unknown }).label === 'string')
      .map((r, i) => ({
        id: typeof r.id === 'string' && r.id ? r.id : `distinction-${i}`,
        label: r.label as string,
        description: typeof r.description === 'string' ? r.description : undefined,
        image: typeof r.image === 'string' && r.image ? r.image : undefined,
        glyph: typeof r.glyph === 'string' && r.glyph ? r.glyph : undefined,
        yearFact: typeof r.yearFact === 'string' && r.yearFact ? r.yearFact : undefined,
        conditions: Array.isArray(r.conditions)
          ? (r.conditions.map(parseCondition).filter(Boolean) as DistinctionCondition[])
          : [],
        enabled: r.enabled !== false,
      }))
  } catch {
    return DEFAULT_DISTINCTIONS
  }
}

function conditionPasses(c: DistinctionCondition, facts: FactContext): boolean {
  // A condition on an absent/null fact never passes (keeps dormant rules dormant).
  const raw = facts[c.fact]

  switch (c.op) {
    case 'is_true':  return raw === true
    case 'is_false': return raw === false
    case 'gte':      return typeof raw === 'number' && typeof c.value === 'number' && raw >= c.value
    case 'lte':      return typeof raw === 'number' && typeof c.value === 'number' && raw <= c.value
    case 'eq':
      if (raw == null) return false
      return String(raw) === String(c.value)
    case 'includes':
      return Array.isArray(raw) && raw.map(String).includes(String(c.value))
    case 'count_gte':
      return Array.isArray(raw) && typeof c.value === 'number' && raw.length >= c.value
    default:
      return false
  }
}

// Evaluate enabled rules against a member's facts and return the earned medals.
export function evaluateDistinctions(
  facts: FactContext,
  rules: DistinctionRule[],
): EarnedDistinction[] {
  return rules
    .filter(r => r.enabled && r.conditions.length > 0 && r.conditions.every(c => conditionPasses(c, facts)))
    .map(r => {
      const yearVal = r.yearFact ? facts[r.yearFact] : undefined
      return {
        id: r.id,
        label: r.label,
        description: r.description,
        image: r.image,
        glyph: r.glyph,
        year: typeof yearVal === 'number' ? yearVal : undefined,
      }
    })
}
