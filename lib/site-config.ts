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

// ── Attunement checklist ────────────────────────────────────────────────────
// The member-facing "Attunement Status" checklist on /profile. Every item is
// admin-managed (Admin → Manage → Attunement Tasks) and tied to a requirement
// that auto-completes when the member meets it. Stored as JSON in page_content
// key "config_attunement_tasks".

export type AttunementRequirement = 'role' | 'shift' | 'contribution' | 'photo' | 'approved'

export type AttunementTask = {
  id: string
  label: string
  requirement: AttunementRequirement
  enabled: boolean
}

// The requirement types an admin can assign to a task, in dropdown order.
// `hint` is shown to admins; the actual completion logic lives where the
// member's data is available (app/profile/page.tsx).
export const ATTUNEMENT_REQUIREMENTS: { value: AttunementRequirement; label: string; hint: string }[] = [
  { value: 'role',         label: 'Role selected',        hint: 'Completes when the member has an approved role.' },
  { value: 'shift',        label: 'Shift signup',         hint: 'Completes when the member is assigned to a shift.' },
  { value: 'contribution', label: 'Camp contribution',    hint: 'Completes when the member picks a contribution (setup / teardown / decor).' },
  { value: 'photo',        label: 'Photo uploaded',       hint: 'Completes when the member uploads a profile photo.' },
  { value: 'approved',     label: 'Application approved',  hint: 'Always complete on the member profile — use as a reassuring first step.' },
]

const VALID_ATTUNEMENT_REQUIREMENTS = new Set<AttunementRequirement>(
  ATTUNEMENT_REQUIREMENTS.map(r => r.value)
)

// Default checklist — mirrors the original hardcoded list so behaviour is
// unchanged until an admin edits it.
export const DEFAULT_ATTUNEMENT_TASKS: AttunementTask[] = [
  { id: 'approved',     label: 'Application Approved',   requirement: 'approved',     enabled: true },
  { id: 'photo',        label: 'Photo Uploaded',         requirement: 'photo',        enabled: true },
  { id: 'contribution', label: 'Contribution Selected',  requirement: 'contribution', enabled: true },
  { id: 'role',         label: 'Role Selected',          requirement: 'role',         enabled: true },
  { id: 'shift',        label: 'Shift Assigned',         requirement: 'shift',        enabled: true },
]

export function parseAttunementTasks(raw?: string | null): AttunementTask[] {
  if (!raw) return DEFAULT_ATTUNEMENT_TASKS
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return DEFAULT_ATTUNEMENT_TASKS
    return arr
      .filter((t: unknown): t is Record<string, unknown> =>
        !!t && typeof (t as { label?: unknown }).label === 'string' &&
        VALID_ATTUNEMENT_REQUIREMENTS.has((t as { requirement?: AttunementRequirement }).requirement as AttunementRequirement)
      )
      .map((t, i) => ({
        id: typeof t.id === 'string' && t.id ? t.id : `task-${i}`,
        label: t.label as string,
        requirement: t.requirement as AttunementRequirement,
        enabled: t.enabled !== false,
      }))
  } catch {
    return DEFAULT_ATTUNEMENT_TASKS
  }
}
