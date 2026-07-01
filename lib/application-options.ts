// Contribution type — one entry per communal responsibility option.
// Stored in page_content key "community_contribution_types" as JSON.
// Falls back to DEFAULT_CONTRIBUTION_TYPES if that key is absent.
export type ContributionType = {
  value: string              // stored in setup_preference TEXT[] on applications
  icon: string               // emoji shown in the commitments card
  description: string        // one-line description shown in commitments card
  autoForDeptKeyword?: string | null  // if dept name contains this (case-insensitive), auto-add on profile
}

export const DEFAULT_CONTRIBUTION_TYPES: ContributionType[] = [
  { value: 'Setup',    icon: '⚒️',  description: 'Help build and transform the space before camp begins.', autoForDeptKeyword: null },
  { value: 'Teardown', icon: '🔩',  description: 'Help break down and restore the site after camp ends.',  autoForDeptKeyword: null },
  { value: 'Decor',    icon: '🕯️', description: 'Create and maintain the visual atmosphere of camp.',     autoForDeptKeyword: 'decor' },
  { value: 'Other',    icon: '🤝',  description: 'Contributing in another capacity.',                       autoForDeptKeyword: null },
]

// Derived from DEFAULT_CONTRIBUTION_TYPES for backward-compatibility.
// Prefer passing ContributionType[] directly rather than using this constant.
export const SETUP_PREFERENCE_OPTIONS = DEFAULT_CONTRIBUTION_TYPES.map(t => t.value) as unknown as readonly string[]

export const ATTENDANCE_OPTIONS = ['Full event', 'Partial event', 'Unsure'] as const

// Default options — overridable via page_content key "member_membership_types"
export const MEMBERSHIP_TYPE_OPTIONS = [
  'Camping on site',
  'Staying nearby but participating',
  'Mostly visiting socially',
  'Not sure yet',
] as const

export const RIDESHARE_OPTIONS = [
  'I need a ride',
  'I can offer a ride',
  "I'm sorted",
  'Not sure yet',
] as const

export const EDITABLE_APPLICATION_FIELDS = [
  'preferred_name',
  'pronouns',
  'phone',
  'instagram',
  'location',
  'attendance',
  'arrival_date',
  'departure_date',
  'membership_type',
  'vehicle',
  'space_requirements',
  'structures',
  'rideshare',
] as const

export type EditableApplicationField = (typeof EDITABLE_APPLICATION_FIELDS)[number]

// Parse contribution types from a raw page_content JSON string.
// Returns DEFAULT_CONTRIBUTION_TYPES on any parse failure.
export function parseContributionTypes(raw: string | undefined | null): ContributionType[] {
  if (!raw) return DEFAULT_CONTRIBUTION_TYPES
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as ContributionType[]
  } catch { /* fall through */ }
  return DEFAULT_CONTRIBUTION_TYPES
}
