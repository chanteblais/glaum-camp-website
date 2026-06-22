// Community identity — override via env vars for each deployment.
// These drive metadata, email copy, and any UI where the community name
// appears in code rather than in page_content.

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Glåüm'
export const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME ?? 'What If 2026'
export const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
  `${SITE_NAME} Theme Camp at ${EVENT_NAME}.`

// Default acknowledgement items for the member application agreement step.
// Store an override as JSON in page_content key "member_acknowledgements".
export const DEFAULT_AGREEMENT_ITEMS: string[] = [
  'I have taken time to familiarise myself with this community and believe it is one I would genuinely enjoy contributing to.',
  'I understand this community is participatory.',
  'I will contribute honestly within my capacity.',
  'I will communicate if my plans or availability change.',
  'I will help maintain shared spaces and support the collective wellbeing of camp.',
  'I understand setup and teardown are shared responsibilities.',
  'I understand no one person is responsible for carrying the entire camp.',
  'I will treat fellow camp members, neighbours, and participants with kindness, respect, and consideration.',
  'I will leave camp better than I found it.',
]

// Default attendance options for the application form.
// Store an override as JSON in page_content key "member_attendance_options".
export const DEFAULT_ATTENDANCE_OPTIONS: string[] = [
  'Attending fully',
  'Attending partially',
  'Still figuring it out',
]

// Default membership type options (how someone relates to camp).
// Store an override as JSON in page_content key "member_membership_types".
export const DEFAULT_MEMBERSHIP_TYPE_OPTIONS: string[] = [
  'Camping on site',
  'Staying nearby but participating',
  'Mostly visiting socially',
  'Not sure yet',
]

// Copy for the apply-page track picker ("How would you like to join?") cards.
// Store an override as JSON in page_content key "config_track_picker".
export type TrackCopy = {
  memberTitle: string
  memberDesc: string
  volunteerTitle: string
  volunteerDesc: string
}

export const DEFAULT_TRACK_COPY: TrackCopy = {
  memberTitle: 'Camp Member',
  memberDesc: `Apply for full membership — fill out an application and join the community as a ${SITE_NAME} member.`,
  volunteerTitle: 'Volunteer',
  volunteerDesc: 'Sign up as a volunteer — help with setup, teardown, or other roles without a full membership application.',
}

export function parseTrackCopy(raw?: string | null): TrackCopy {
  if (!raw) return DEFAULT_TRACK_COPY
  try {
    const o = JSON.parse(raw)
    return { ...DEFAULT_TRACK_COPY, ...o }
  } catch {
    return DEFAULT_TRACK_COPY
  }
}
