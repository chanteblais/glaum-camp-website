export const CONTRIBUTION_OPTIONS = [
  'Setup',
  'Teardown',
  'Camp kitchen',
  'Decor / ambiance',
  'Sound / DJ support',
  'Lighting',
  'Welcoming / greeting',
  'Shift coverage',
  'Cleanup',
  'Emotional support / grounding presence',
  'Art support',
  'Tea/snack operations',
  'Logistics / organization',
  'Build crew',
  'Strike crew',
  'General helper',
  '"Put me where needed"',
  'Tiny hand distribution',
  'Shrimp relations',
] as const

export const ATTENDANCE_OPTIONS = ['Full event', 'Partial event', 'Unsure'] as const

export const CAMP_RELATIONSHIP_OPTIONS = [
  'Camp with Glåüm',
  'Stay nearby but participate',
  'Mostly visit socially',
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
  'camp_relationship',
  'vehicle',
  'space_requirements',
  'structures',
  'rideshare',
  'contributions',
] as const

export type EditableApplicationField = (typeof EDITABLE_APPLICATION_FIELDS)[number]
