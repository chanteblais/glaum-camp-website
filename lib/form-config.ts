// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'textarea' | 'radio' | 'checkbox'

export type FieldConfig = {
  key: string
  label: string
  description?: string
  visible: boolean
  required: boolean
  canHide: boolean
  canChangeRequired: boolean
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
        { key: 'first_name',       label: 'First Name',                          visible: true, required: true,  canHide: false, canChangeRequired: false },
        { key: 'last_name',        label: 'Last Name',                           visible: true, required: true,  canHide: false, canChangeRequired: false },
        { key: 'preferred_name',   label: 'Preferred Name',                      visible: true, required: false, canHide: true,  canChangeRequired: false },
        { key: 'pronouns',         label: 'Pronouns',                            visible: true, required: false, canHide: true,  canChangeRequired: false },
        { key: 'email',            label: 'Email',                               visible: true, required: true,  canHide: false, canChangeRequired: false },
        { key: 'phone',            label: 'Phone Number',                        visible: true, required: true,  canHide: false, canChangeRequired: true  },
        { key: 'instagram',        label: 'Instagram',       description: '@handle',                            visible: true, required: false, canHide: true,  canChangeRequired: false },
        { key: 'location',         label: 'Where are you travelling from?',      visible: true, required: false, canHide: true,  canChangeRequired: false },
        { key: 'emergency_contact',label: 'Emergency Contact', description: 'Name and phone number',           visible: true, required: true,  canHide: false, canChangeRequired: true  },
        { key: 'referral',         label: 'Who referred you to Glåüm?',          visible: true, required: false, canHide: true,  canChangeRequired: false },
        { key: 'camped_before',    label: 'Have you camped with Glåüm before?',  visible: true, required: true,  canHide: false, canChangeRequired: true  },
        { key: 'avatar_url',       label: 'Photo', description: 'For the Many Hands Photo Board',              visible: true, required: true,  canHide: false, canChangeRequired: true  },
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
        { key: 'about_you',         label: 'What are you currently excited about?',                              visible: true, required: false, canHide: true,  canChangeRequired: false },
        { key: 'special_skills',    label: 'What special skills do you possess?', description: 'What might be useful at camp.', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'find_at_camp',      label: 'If we encountered you at camp, what would we find you doing?', description: 'Picture a typical Glåüm moment.', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'glaum_acceptance',  label: 'Have you accepted Glåüm into your heart?',                          visible: true, required: true,  canHide: false, canChangeRequired: false },
        { key: 'attunement_status', label: 'Current Attunement Status',                                         visible: true, required: false, canHide: true,  canChangeRequired: false },
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
        { key: 'attendance',     label: 'How do you plan to participate this year?',  visible: true, required: true,  canHide: false, canChangeRequired: false },
        { key: 'arrival_date',   label: 'Approximate Arrival Date',                   visible: true, required: false, canHide: true,  canChangeRequired: false },
        { key: 'departure_date', label: 'Approximate Departure Date',                 visible: true, required: false, canHide: true,  canChangeRequired: false },
        { key: 'vehicle',        label: 'Vehicle Information', description: 'Make, model, passengers, cargo capacity', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'structures',     label: 'Bringing Any Structures?', description: 'Tents, shade structures, etc.',      visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'rideshare',      label: 'Rideshare Status',                            visible: true, required: false, canHide: true,  canChangeRequired: false },
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
        { key: 'dept_interests',       label: 'Which departments interest you?',          visible: true, required: false, canHide: true,  canChangeRequired: false },
        { key: 'leadership_interest',  label: 'Are you interested in a leadership role?', visible: true, required: false, canHide: true,  canChangeRequired: true  },
        { key: 'setup_preference',     label: 'Communal Responsibilities', description: 'Setup, teardown, or decor preference', visible: true, required: false, canHide: true, canChangeRequired: false },
        { key: 'setup_limitations',    label: 'Setup/Teardown Limitations',               visible: true, required: false, canHide: true,  canChangeRequired: false },
        { key: 'setup_notes',          label: 'What brings you to Glåüm this year?',      visible: true, required: false, canHide: true,  canChangeRequired: false },
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
        { key: 'acknowledgements', label: 'The Many Hands Agreement', description: 'All items must be acknowledged', visible: true, required: true, canHide: false, canChangeRequired: false },
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
        { key: 'shrimp_relationship', label: 'What is your relationship to shrimp?', visible: true, required: false, canHide: true, canChangeRequired: false },
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

  const defaultKeys = new Set(DEFAULT_MEMBER_CONFIG.steps.map(s => s.key))

  // Merge saved overrides into default steps (preserves order of saved config if present)
  const savedOrder = saved.steps?.map(s => s.key).filter(k => defaultKeys.has(k)) ?? DEFAULT_MEMBER_CONFIG.steps.map(s => s.key)

  const steps = savedOrder.map(key => {
    const defaultStep = DEFAULT_MEMBER_CONFIG.steps.find(s => s.key === key)!
    const savedStep = saved.steps?.find(s => s.key === key)
    // Built-in fields merged with saved overrides; admin-added fields appended at end
    const builtInFields = defaultStep.fields.map(defaultField => {
      const savedField = savedStep?.fields?.find(f => f.key === defaultField.key)
      if (!savedField) return defaultField
      return {
        ...defaultField,
        label:       savedField.label       !== undefined ? savedField.label       : defaultField.label,
        description: savedField.description !== undefined ? savedField.description : defaultField.description,
        visible:     savedField.visible     !== undefined ? savedField.visible     : defaultField.visible,
        required:    savedField.required    !== undefined ? savedField.required    : defaultField.required,
      }
    })
    const builtInKeys = new Set(defaultStep.fields.map(f => f.key))
    const adminFields = (savedStep?.fields ?? []).filter(f => !builtInKeys.has(f.key))
    const fields = [...builtInFields, ...adminFields]
    if (!savedStep) return { ...defaultStep, fields }
    return {
      ...defaultStep,
      title:    savedStep.title    !== undefined ? savedStep.title    : defaultStep.title,
      subtitle: savedStep.subtitle !== undefined ? savedStep.subtitle : defaultStep.subtitle,
      visible:  savedStep.visible  !== undefined ? savedStep.visible  : defaultStep.visible,
      fields,
    }
  })

  // Append custom steps (not in defaults) — preserved as-is from saved config
  const customSteps: StepConfig[] = (saved.steps ?? []).filter(s => !defaultKeys.has(s.key))

  return { open, steps: [...steps, ...customSteps] }
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
