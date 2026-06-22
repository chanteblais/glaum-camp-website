// ── Types ─────────────────────────────────────────────────────────────────────

import { DEFAULT_AGREEMENT_ITEMS } from './site-config'

// 'agreement' = a checklist of statements/clauses the applicant must acknowledge
// (all required when the field is required), like the Many Hands Agreement.
// 'group_select' = a checklist of admin-defined Groups (the ones flagged
// "applicants can opt in"). Selections add the applicant to those groups on submit
// (writes to group_choices, not custom_answers). Member form only.
export type FieldType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'file' | 'agreement' | 'group_select'

export type FieldConfig = {
  key: string
  label: string
  description?: string
  visible: boolean
  required: boolean
  canHide: boolean
  canChangeRequired: boolean
  // Layout width within its section. Consecutive 'half' fields pair into a
  // two-column row; an unpaired 'half' renders full width. Defaults to 'full'.
  width?: 'half' | 'full'
  // Non-input layout elements that live in the field list and reorder like
  // fields. 'divider' renders a horizontal rule (its `label` is the optional
  // caption); 'paragraph' renders body copy from its `description`. When unset
  // the entry is a normal input field.
  element?: 'divider' | 'paragraph'
  // Core fields that back NOT NULL columns the rest of the app depends on
  // (identity, display names, contact). Always present + required; the builder
  // renders them read-only and they can't be hidden, reordered, or deleted.
  locked?: boolean
  // admin-added fields only
  isCustom?: boolean
  type?: FieldType
  options?: string[]
}

export type StepConfig = {
  key: string
  num: string
  title: string
  subtitle: string
  visible: boolean
  canHide: boolean
  isCustom?: boolean
  fields: FieldConfig[]
}

export type MemberFormConfig = {
  open: boolean
  steps: StepConfig[]
}

export type VolunteerFormConfig = {
  open: boolean
  fields: FieldConfig[]
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_MEMBER_CONFIG: MemberFormConfig = {
  open: true,
  steps: [
    {
      key: 'basic',
      num: 'I',
      title: 'BASIC INFORMATION',
      subtitle: 'Who you are.',
      visible: true,
      canHide: false,
      fields: [
        { key: 'first_name',       label: 'First Name',                          visible: true, required: true,  canHide: false, canChangeRequired: false, width: 'half', locked: true },
        { key: 'last_name',        label: 'Last Name',                           visible: true, required: true,  canHide: false, canChangeRequired: false, width: 'half', locked: true },
        { key: 'preferred_name',   label: 'Preferred Name',                      visible: true, required: false, canHide: true,  canChangeRequired: false, width: 'half' },
        { key: 'pronouns',         label: 'Pronouns',                            visible: true, required: false, canHide: true,  canChangeRequired: false, width: 'half' },
        { key: 'email',            label: 'Email',                               visible: true, required: true,  canHide: false, canChangeRequired: false, width: 'half', locked: true },
        { key: 'phone',            label: 'Phone Number',                        visible: true, required: true,  canHide: false, canChangeRequired: false, width: 'half', locked: true },
        { key: 'instagram',        label: 'Instagram',       description: '@handle',                            visible: true, required: false, canHide: true,  canChangeRequired: false, width: 'half' },
        { key: 'location',         label: 'Where are you travelling from?',      visible: true, required: false, canHide: true,  canChangeRequired: false, width: 'half' },
        { key: 'emergency_contact',label: 'Emergency Contact', description: 'Name and phone number',           visible: true, required: true,  canHide: true,  canChangeRequired: true,  width: 'full' },
        { key: 'referral',         label: 'Who referred you to Glåüm?',          visible: true, required: false, canHide: true,  canChangeRequired: false, width: 'half' },
        { key: 'camped_before',    label: 'Have you camped with Glåüm before?',  visible: true, required: true,  canHide: true,  canChangeRequired: true,  width: 'half' },
        { key: 'avatar_url',       label: 'Photo', description: 'For the Many Hands Photo Board',              visible: true, required: true,  canHide: false, canChangeRequired: true,  width: 'full', locked: true },
      ],
    },
    {
      key: 'registry',
      num: 'II',
      title: 'MANY HANDS REGISTRY',
      subtitle: 'Tell us about you.',
      visible: true,
      canHide: false,
      fields: [
        { key: 'el_registry_intro', element: 'paragraph', label: 'Intro text', description: 'These questions help us get to know you and create your official Many Hands Registry entry.', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'about_you',         label: 'What are you currently excited about?',                              visible: true, required: false, canHide: true,  canChangeRequired: false, width: 'full' },
        { key: 'special_skills',    label: 'What special skills do you possess?', description: 'What might be useful at camp.', visible: true, required: false, canHide: true, canChangeRequired: false, width: 'full' },
        { key: 'find_at_camp',      label: 'If we encountered you at camp, what would we find you doing?', description: 'Picture a typical Glåüm moment.', visible: true, required: false, canHide: true, canChangeRequired: false, width: 'full' },
        { key: 'el_registry_div', element: 'divider', label: '', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'community_acceptance', label: 'Have you accepted Glåüm into your heart?',  visible: true, required: true,  canHide: true,  canChangeRequired: true,  width: 'half' },
        { key: 'onboarding_status',    label: 'Current Attunement Status',                 visible: true, required: false, canHide: true,  canChangeRequired: false, width: 'half' },
      ],
    },
    {
      key: 'plans',
      num: 'III',
      title: 'WHAT IF PLANS',
      subtitle: "How you'll participate.",
      visible: true,
      canHide: false,
      fields: [
        { key: 'attendance',     label: 'How do you plan to participate this year?',  visible: true, required: true,  canHide: true,  canChangeRequired: true,  width: 'full' },
        { key: 'el_plans_div1',  element: 'divider', label: '', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'arrival_date',   label: 'Approximate Arrival Date',                   visible: true, required: false, canHide: true,  canChangeRequired: false, width: 'half' },
        { key: 'departure_date', label: 'Approximate Departure Date',                 visible: true, required: false, canHide: true,  canChangeRequired: false, width: 'half' },
        { key: 'vehicle',        label: 'Vehicle Information', description: 'Make, model, passengers, cargo capacity', visible: true, required: false, canHide: true, canChangeRequired: false, width: 'full' },
        { key: 'structures',     label: 'Bringing Any Structures?', description: 'Tents, shade structures, etc.',      visible: true, required: false, canHide: true, canChangeRequired: false, width: 'full' },
        { key: 'el_plans_rideshare', element: 'divider', label: 'Rideshare', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'rideshare',      label: 'Rideshare Status',                            visible: true, required: false, canHide: true,  canChangeRequired: false, width: 'full' },
      ],
    },
    {
      key: 'roles',
      num: 'IV',
      title: 'PARTICIPATION & ROLES',
      subtitle: "How you'd like to contribute.",
      visible: true,
      canHide: false,
      fields: [
        { key: 'dept_interests',       label: 'Which departments interest you?',          visible: true, required: false, canHide: true,  canChangeRequired: true, width: 'full' },
        { key: 'el_roles_div1',        element: 'divider', label: '', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'leadership_interest',  label: 'Are you interested in a leadership role?', visible: true, required: false, canHide: true,  canChangeRequired: true, width: 'full' },
        { key: 'el_roles_communal',    element: 'divider', label: 'Communal Responsibilities', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'setup_limitations',    label: 'Setup/Teardown Limitations',               visible: true, required: false, canHide: true,  canChangeRequired: true, width: 'full' },
        { key: 'el_roles_div2',        element: 'divider', label: '', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'setup_notes',          label: 'What brings you to Glåüm this year?',      visible: true, required: false, canHide: true,  canChangeRequired: true, width: 'full' },
      ],
    },
    {
      key: 'agreement',
      num: 'V',
      title: 'THE MANY HANDS AGREEMENT',
      subtitle: 'What we ask of each other.',
      visible: true,
      canHide: false,
      fields: [
        { key: 'el_agreement_intro', element: 'paragraph', label: 'Intro text', description: 'Please acknowledge the following. All items are required to complete your application.', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'acknowledgements', label: 'The Many Hands Agreement', description: 'All items must be acknowledged', visible: true, required: true, canHide: true, canChangeRequired: true, width: 'full', type: 'agreement', options: DEFAULT_AGREEMENT_ITEMS },
      ],
    },
    {
      key: 'shrimp',
      num: 'VI',
      title: 'SHRIMP',
      subtitle: 'A final question.',
      visible: true,
      canHide: true,
      fields: [
        { key: 'el_shrimp_intro', element: 'paragraph', label: 'Intro text', description: 'Before we proceed, there is one final matter that requires your attention.', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'shrimp_relationship', label: 'What is your relationship to shrimp?', visible: true, required: false, canHide: true, canChangeRequired: false, width: 'full' },
      ],
    },
  ],
}

export const DEFAULT_VOLUNTEER_CONFIG: VolunteerFormConfig = {
  open: true,
  fields: [
    { key: 'first_name',     label: 'First Name',                              visible: true, required: true,  canHide: false, canChangeRequired: false },
    { key: 'last_name',      label: 'Last Name',                               visible: true, required: true,  canHide: false, canChangeRequired: false },
    { key: 'preferred_name', label: 'Preferred Name',                          visible: true, required: false, canHide: true,  canChangeRequired: false },
    { key: 'pronouns',       label: 'Pronouns',                                visible: true, required: false, canHide: true,  canChangeRequired: false },
    { key: 'email',          label: 'Email',                                   visible: true, required: true,  canHide: false, canChangeRequired: false },
    { key: 'phone',          label: 'Phone',                                   visible: true, required: true,  canHide: false, canChangeRequired: true  },
    { key: 'avatar_url',     label: 'Photo', description: 'Helps the team put a face to the name', visible: true, required: true, canHide: false, canChangeRequired: true },
    { key: 'signup_intent',  label: 'How would you like to help?',             visible: true, required: false, canHide: false, canChangeRequired: true  },
    { key: 'days_available', label: 'What days are you available?',            visible: true, required: false, canHide: true,  canChangeRequired: false },
    { key: 'other_notes',    label: 'Anything else we should know?',           visible: true, required: false, canHide: true,  canChangeRequired: false },
  ],
}

// ── Merge helpers ─────────────────────────────────────────────────────────────

export function mergeMemberConfig(saved: Partial<MemberFormConfig>): MemberFormConfig {
  const open = saved.open !== undefined ? saved.open : DEFAULT_MEMBER_CONFIG.open
  const defaultStepByKey = new Map(DEFAULT_MEMBER_CONFIG.steps.map(s => [s.key, s]))

  // Merge a built-in field's saved overrides onto its default definition.
  // Locked core fields ignore saved overrides — except `required` when the
  // field is allowed to toggle it (Photo, so admins can permit blank profiles).
  const mergeBuiltIn = (defaultField: FieldConfig, savedField?: FieldConfig): FieldConfig => {
    if (!savedField) return defaultField
    if (defaultField.locked) {
      return defaultField.canChangeRequired && savedField.required !== undefined
        ? { ...defaultField, required: savedField.required }
        : defaultField
    }
    return {
      ...defaultField,
      label:       savedField.label       !== undefined ? savedField.label       : defaultField.label,
      description: savedField.description !== undefined ? savedField.description : defaultField.description,
      visible:     savedField.visible     !== undefined ? savedField.visible     : defaultField.visible,
      required:    savedField.required    !== undefined ? savedField.required    : defaultField.required,
      width:       savedField.width       !== undefined ? savedField.width       : defaultField.width,
      options:     savedField.options     !== undefined ? savedField.options     : defaultField.options,
    }
  }

  // Merge one default (built-in) step with its saved overrides.
  const mergeDefaultStep = (defaultStep: StepConfig, savedStep?: StepConfig): StepConfig => {
    const defaultByKey = new Map(defaultStep.fields.map(f => [f.key, f]))
    const savedFields = savedStep?.fields
    let fields: FieldConfig[]
    if (savedFields) {
      // Honour saved field ORDER. Built-in fields merged with defaults; admin
      // fields kept as-is. Deleted non-core built-ins stay deleted; only locked
      // core fields are re-injected (safety net for the 4 NOT NULL columns).
      const seen = new Set(savedFields.map(f => f.key))
      const ordered = savedFields.map(f =>
        defaultByKey.has(f.key) ? mergeBuiltIn(defaultByKey.get(f.key)!, f) : f
      )
      const missingCore = defaultStep.fields.filter(f => !seen.has(f.key) && f.locked)
      fields = [...ordered, ...missingCore]
    } else {
      fields = defaultStep.fields
    }
    if (!savedStep) return { ...defaultStep, fields }
    return {
      ...defaultStep,
      title:    savedStep.title    !== undefined ? savedStep.title    : defaultStep.title,
      subtitle: savedStep.subtitle !== undefined ? savedStep.subtitle : defaultStep.subtitle,
      visible:  savedStep.visible  !== undefined ? savedStep.visible  : defaultStep.visible,
      fields,
    }
  }

  // No saved config → full defaults.
  if (!saved.steps) {
    return { open, steps: DEFAULT_MEMBER_CONFIG.steps.map(s => mergeDefaultStep(s)) }
  }

  // Preserve the saved order of ALL steps (default + custom), so admin section
  // reordering — including custom sections moved above built-in ones — persists.
  // Built-in steps merge with their defaults; custom steps kept as-is. Deleted
  // built-in steps stay deleted (config is the source of truth).
  const steps = saved.steps.map(savedStep => {
    const defaultStep = defaultStepByKey.get(savedStep.key)
    return defaultStep ? mergeDefaultStep(defaultStep, savedStep) : savedStep
  })

  return { open, steps }
}

export function mergeVolunteerConfig(saved: Partial<VolunteerFormConfig>): VolunteerFormConfig {
  const open = saved.open !== undefined ? saved.open : DEFAULT_VOLUNTEER_CONFIG.open

  const fields = DEFAULT_VOLUNTEER_CONFIG.fields.map(defaultField => {
    const savedField = saved.fields?.find(f => f.key === defaultField.key)
    if (!savedField) return defaultField
    return {
      ...defaultField,
      label:       savedField.label       !== undefined ? savedField.label       : defaultField.label,
      description: savedField.description !== undefined ? savedField.description : defaultField.description,
      visible:     savedField.visible     !== undefined ? savedField.visible     : defaultField.visible,
      required:    savedField.required    !== undefined ? savedField.required    : defaultField.required,
    }
  })

  return { open, fields }
}
