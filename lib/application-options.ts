export const SETUP_PREFERENCE_OPTIONS = ['Setup', 'Teardown', 'Decor', 'Other'] as const

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
  'setup_preference',
] as const

export type EditableApplicationField = (typeof EDITABLE_APPLICATION_FIELDS)[number]
