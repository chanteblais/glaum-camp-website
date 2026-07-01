// Profile Field Registry — the canonical schema for member profile data.
//
// Architectural principle (see docs/profile-architecture.md): the member PROFILE
// is the source of truth. Applications collect values that populate these fields;
// distinctions evaluate them. A field defined here is the single place that says
// what a piece of member data means, how it's typed, who can see/edit it, and
// where it may be used.
//
// Like every other admin-config in this app (config_distinctions,
// config_attunement_tasks), the registry is one JSON string stored in
// page_content under `config_profile_fields`, edited in ProfileFieldsManager.
//
// Two kinds of field share one namespace:
//   • stored fields  — admin-defined attributes, populated by applications /
//                       member self-edit, persisted in member_profiles.values.
//   • system fields  — read-only facts DERIVED at evaluation time (groups,
//                       tenure, designation, …). Never stored; never editable.
//                       These mirror lib/member-facts.ts so the distinction rule
//                       builder can treat both kinds uniformly (Phase 2).

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProfileFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'single_select'
  | 'multi_select'
  | 'date'

export type ProfileFieldDefault = string | number | boolean | string[]

export type ProfileField = {
  /** Internal key, e.g. `eventExperience`. Stable identity; values keyed by this. */
  key: string
  /** Display name, e.g. "Event Experience". */
  label: string
  /** Optional helper text shown under the field. */
  description?: string
  type: ProfileFieldType
  /** Allowed options for single_select / multi_select. */
  options?: string[]
  /** Default value when the member has none. */
  default?: ProfileFieldDefault
  /** Visible on the member-facing / public profile. */
  public: boolean
  /** Members may edit their own value. */
  memberEditable: boolean
  /** May be surfaced as a question inside application forms. */
  applicationEligible: boolean
  /** May be referenced in distinction rule conditions. */
  distinctionEligible: boolean
  /**
   * Prompt existing members who have no value yet to fill this in (Phase 4.5 —
   * "I should've asked this on the application"). Only meaningful alongside
   * memberEditable. Optional prompts are dismissible; see `required`.
   */
  askExisting?: boolean
  /**
   * When an `askExisting` prompt is also required, members can't dismiss it — it
   * persists until answered. Optional (`required` false) prompts offer "Not now".
   */
  required?: boolean
  /**
   * Read-only DERIVED fact (groups, tenure, designation, …). Not stored, not
   * editable, not application-eligible. Present in the registry so distinctions
   * and the profile UI see stored + derived fields in one namespace.
   */
  system?: boolean
  /**
   * Built-in core field that always exists and can't be reconfigured, disabled,
   * or removed by admins (e.g. Bio → the profile's About section). Unlike system
   * fields it's still member-editable and stored (member_profiles.values); it's
   * simply locked out of the Profile Fields manager's editable list.
   */
  locked?: boolean
  /** Disabled fields are ignored everywhere (kept for re-enable). */
  enabled: boolean
}

// Catalog for the manager UI — drives which extra inputs a type needs.
export const PROFILE_FIELD_TYPES: { value: ProfileFieldType; label: string; hasOptions: boolean }[] = [
  { value: 'text',          label: 'Text',          hasOptions: false },
  { value: 'textarea',      label: 'Long text',     hasOptions: false },
  { value: 'number',        label: 'Number',        hasOptions: false },
  { value: 'boolean',       label: 'Yes / No',      hasOptions: false },
  { value: 'single_select', label: 'Single select', hasOptions: true  },
  { value: 'multi_select',  label: 'Multi select',  hasOptions: true  },
  { value: 'date',          label: 'Date',          hasOptions: false },
]

// Distinction rules operate over a small value-type vocabulary
// (number / boolean / string / string[]). Map each profile field type onto it so
// Phase 2 can drive the rule builder's operators directly from the registry,
// replacing the hardcoded MEMBER_FACT_CATALOG.
export type DistinctionValueType = 'number' | 'boolean' | 'string' | 'string[]'

export function distinctionValueType(type: ProfileFieldType): DistinctionValueType {
  switch (type) {
    case 'number':        return 'number'
    case 'boolean':       return 'boolean'
    case 'multi_select':  return 'string[]'
    default:              return 'string' // text, textarea, single_select, date
  }
}

// ── Defaults ──────────────────────────────────────────────────────────────────

// System fields mirror lib/member-facts.ts (MEMBER_FACT_CATALOG) one-to-one, so
// Phase 2 can switch the distinction builder onto the registry with no change in
// available facts. These are derived at eval time and never persisted.
const SYSTEM_FIELDS: ProfileField[] = [
  { key: 'joined_year',        label: 'Joined year',         type: 'number',       system: true, public: true,  memberEditable: false, applicationEligible: false, distinctionEligible: true, enabled: true },
  { key: 'years_since_joined', label: 'Years since joining', type: 'number',       system: true, public: false, memberEditable: false, applicationEligible: false, distinctionEligible: true, enabled: true },
  { key: 'group_count',        label: 'Group count',         type: 'number',       system: true, public: false, memberEditable: false, applicationEligible: false, distinctionEligible: true, enabled: true },
  { key: 'groups',             label: 'Groups / Contributions', type: 'multi_select', system: true, public: true, memberEditable: false, applicationEligible: false, distinctionEligible: true, enabled: true },
  { key: 'designation',        label: 'Designation',         type: 'text',         system: true, public: true,  memberEditable: false, applicationEligible: false, distinctionEligible: true, enabled: true },
  { key: 'department',         label: 'Department',          type: 'text',         system: true, public: true,  memberEditable: false, applicationEligible: false, distinctionEligible: true, enabled: true },
  { key: 'camped_before',      label: 'Camped before',       type: 'boolean',      system: true, public: false, memberEditable: false, applicationEligible: false, distinctionEligible: true, enabled: true },
  { key: 'has_photo',          label: 'Has photo',           type: 'boolean',      system: true, public: false, memberEditable: false, applicationEligible: false, distinctionEligible: true, enabled: true },
  { key: 'is_approved',        label: 'Is approved',         type: 'boolean',      system: true, public: false, memberEditable: false, applicationEligible: false, distinctionEligible: true, enabled: true },
]

// Stored example fields — illustrate the model out of the box (the proposal's
// own examples). These become live as the application/profile wiring lands in
// later phases; defining them now lets admins see and shape the vision.
const STORED_DEFAULT_FIELDS: ProfileField[] = [
  { key: 'eventExperience', label: 'Event Experience', description: 'Which years have you camped with Glåüm?', type: 'multi_select', options: ['2022', '2023', '2024', '2025'], public: true, memberEditable: true, applicationEligible: true, distinctionEligible: true, enabled: true },
  { key: 'skills',          label: 'Skills',           description: 'What can you bring to camp?', type: 'multi_select', options: [], public: true, memberEditable: true, applicationEligible: true, distinctionEligible: true, enabled: true },
  { key: 'languages',       label: 'Languages',        type: 'multi_select', options: [], public: true, memberEditable: true, applicationEligible: true, distinctionEligible: false, enabled: true },
  { key: 'quote',           label: 'Quote',            description: 'A short line shown under your name.', type: 'text', public: true, memberEditable: true, applicationEligible: true, distinctionEligible: false, enabled: true },
  { key: 'dietaryPreferences', label: 'Dietary Preferences', type: 'text', public: false, memberEditable: true, applicationEligible: true, distinctionEligible: false, enabled: true },
]

// Locked core fields — always present, canonical config enforced, never
// admin-configurable or deletable. Still member-editable + stored. Bio backs the
// profile's About section, so every member always has it.
const LOCKED_STORED_FIELDS: ProfileField[] = [
  { key: 'bio', label: 'Bio', description: 'A short introduction — shown as the "About" section on your profile.', type: 'textarea', public: true, memberEditable: true, applicationEligible: true, distinctionEligible: false, locked: true, enabled: true },
  { key: 'quote', label: 'Quote', description: 'A short line shown under your name.', type: 'text', public: true, memberEditable: true, applicationEligible: true, distinctionEligible: false, locked: true, enabled: true },
]

export const DEFAULT_PROFILE_FIELDS: ProfileField[] = [...LOCKED_STORED_FIELDS, ...STORED_DEFAULT_FIELDS, ...SYSTEM_FIELDS]

/** The system fields, exposed for re-injection + read-only display in the manager. */
export const SYSTEM_PROFILE_FIELDS: ProfileField[] = SYSTEM_FIELDS

/** Locked core fields, exposed for read-only display in the manager. */
export const LOCKED_PROFILE_FIELDS: ProfileField[] = LOCKED_STORED_FIELDS

const VALID_TYPES = new Set<ProfileFieldType>(PROFILE_FIELD_TYPES.map(t => t.value))
const SYSTEM_KEYS = new Set(SYSTEM_FIELDS.map(f => f.key))
const LOCKED_BY_KEY = new Map(LOCKED_STORED_FIELDS.map(f => [f.key, f]))

function parseDefault(v: unknown, type: ProfileFieldType): ProfileFieldDefault | undefined {
  if (v == null) return undefined
  if (type === 'multi_select') return Array.isArray(v) ? v.map(String) : undefined
  if (type === 'number') return typeof v === 'number' ? v : undefined
  if (type === 'boolean') return typeof v === 'boolean' ? v : undefined
  return typeof v === 'string' ? v : undefined
}

function parseField(raw: unknown): ProfileField | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.key !== 'string' || !r.key) return null
  // Locked core fields ignore any saved overrides — the canonical definition wins,
  // so admins can never disable, rename, retype, or un-public them.
  const lockedCanonical = LOCKED_BY_KEY.get(r.key)
  if (lockedCanonical) return { ...lockedCanonical }
  if (typeof r.label !== 'string' || !r.label) return null
  const type = VALID_TYPES.has(r.type as ProfileFieldType) ? (r.type as ProfileFieldType) : 'text'
  const system = r.system === true || SYSTEM_KEYS.has(r.key)
  return {
    key: r.key,
    label: r.label,
    description: typeof r.description === 'string' ? r.description : undefined,
    type,
    options: Array.isArray(r.options) ? r.options.map(String) : undefined,
    default: parseDefault(r.default, type),
    // System fields are inherently non-editable / non-application; never trust
    // saved overrides to loosen that.
    public:              system ? r.public !== false : r.public === true,
    memberEditable:      system ? false : r.memberEditable === true,
    applicationEligible: system ? false : r.applicationEligible === true,
    distinctionEligible: r.distinctionEligible !== false,
    askExisting:         system ? undefined : (r.askExisting === true || undefined),
    required:            system ? undefined : (r.required === true || undefined),
    system: system || undefined,
    enabled: r.enabled !== false,
  }
}

// Parse the saved registry JSON and GUARANTEE every system field is present
// (re-injecting any the saved config dropped), preserving the saved order of the
// rest. Mirrors mergeMemberConfig's "re-inject missing core fields" safety net.
export function parseProfileFields(raw?: string | null): ProfileField[] {
  if (!raw) return DEFAULT_PROFILE_FIELDS
  let parsed: ProfileField[]
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return DEFAULT_PROFILE_FIELDS
    parsed = arr.map(parseField).filter(Boolean) as ProfileField[]
  } catch {
    return DEFAULT_PROFILE_FIELDS
  }
  // De-dupe by key (first wins), then ensure all system fields exist.
  const seen = new Set<string>()
  const fields = parsed.filter(f => (seen.has(f.key) ? false : (seen.add(f.key), true)))
  const missingLocked = LOCKED_STORED_FIELDS.filter(f => !seen.has(f.key))
  const missingSystem = SYSTEM_FIELDS.filter(f => !seen.has(f.key))
  // Locked core fields lead; system (derived) fields trail.
  return [...missingLocked, ...fields, ...missingSystem]
}

// ── Helpers shared by later phases ──────────────────────────────────────────────

/** Stored (non-system), enabled fields — the ones backed by member_profiles. */
export function storedFields(fields: ProfileField[]): ProfileField[] {
  return fields.filter(f => f.enabled && !f.system)
}

/** Fields a distinction rule may reference. */
export function distinctionFields(fields: ProfileField[]): ProfileField[] {
  return fields.filter(f => f.enabled && f.distinctionEligible)
}

/** Fields an application form may surface as questions. */
export function applicationFields(fields: ProfileField[]): ProfileField[] {
  return fields.filter(f => f.enabled && f.applicationEligible)
}

// One entry per fact a distinction rule may reference, in the value-type
// vocabulary the rule engine operates over. Unifies system (derived) + stored
// fields into a single catalog — this replaces the hardcoded MEMBER_FACT_CATALOG
// in the distinction rule builder (Phase 2).
export type DistinctionCatalogEntry = { key: string; label: string; type: DistinctionValueType }

export function distinctionCatalog(fields: ProfileField[]): DistinctionCatalogEntry[] {
  return distinctionFields(fields).map(f => ({
    key: f.key,
    label: f.label,
    type: distinctionValueType(f.type),
  }))
}

// ── Profile catch-up (Phase 4.5) ────────────────────────────────────────────────

/** Reserved key in member_profiles.values holding the field keys a member dismissed. */
export const DISMISSED_KEY = '__dismissedFields'

export function isProfileValueEmpty(v: unknown): boolean {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0)
}

/**
 * Fields to prompt this member to fill in: enabled, member-editable, flagged
 * "ask existing", with no value yet. Required gaps always show; optional gaps the
 * member dismissed are hidden. ("Added after they applied" === "no value" — no
 * need to track when the field was added.)
 */
export function profileGaps(
  fields: ProfileField[],
  values: Record<string, unknown>,
): ProfileField[] {
  const dismissed = new Set(
    Array.isArray(values[DISMISSED_KEY]) ? (values[DISMISSED_KEY] as unknown[]).map(String) : [],
  )
  return fields.filter(f =>
    f.enabled && f.askExisting && f.memberEditable &&
    isProfileValueEmpty(values[f.key]) &&
    (f.required || !dismissed.has(f.key)),
  )
}
