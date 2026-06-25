// Member "facts" — the raw, store-the-facts-not-the-badge layer that the
// distinction rule engine (lib/distinctions.ts) evaluates against.
//
// Per the profile-refactor decision, this pass is DERIVE-ONLY: we compute only
// facts that are already sourceable from existing data (application + role join
// + group memberships). Facts we can't yet source (camps_attended, shift_count,
// tea_served, …) are intentionally absent — rules that reference them simply
// won't fire until a future migration adds the underlying data.

export type MemberFacts = {
  /** Year the member first applied — best available proxy for "member since". */
  joined_year: number | null
  /** Whole years since joining (current year − joined_year). */
  years_since_joined: number | null
  /** Primary title (role name), only when approved & not pending. */
  designation: string | null
  /** Department the designation belongs to. */
  department: string | null
  /** How many groups the member belongs to. */
  group_count: number
  /** The group names themselves (for `includes` conditions). */
  groups: string[]
  /** Has the member camped with Glåüm before (from the application). */
  camped_before: boolean
  /** Has a profile photo. */
  has_photo: boolean
  /** Application is approved. */
  is_approved: boolean
}

type RoleInfo = {
  name?: string
  description?: string | null
  purpose?: string | null
  departments?: { name?: string; icon?: string } | null
} | null

type ApplicationLike = {
  submitted_at?: string | null
  status?: string | null
  camped_before?: string | null
  avatar_url?: string | null
} | null

type Group = { name: string }

export function buildMemberFacts({
  application,
  roleInfo,
  memberGroups,
  roleApproved,
}: {
  application: ApplicationLike
  roleInfo: RoleInfo
  memberGroups: Group[]
  /** True when the member has an approved (non-pending) role. */
  roleApproved: boolean
}): MemberFacts {
  const joined_year = application?.submitted_at
    ? new Date(application.submitted_at).getFullYear()
    : null
  const years_since_joined =
    joined_year != null ? new Date().getFullYear() - joined_year : null

  const designation = roleApproved ? roleInfo?.name ?? null : null
  const department = roleApproved ? roleInfo?.departments?.name ?? null : null

  return {
    joined_year,
    years_since_joined,
    designation,
    department,
    group_count: memberGroups.length,
    groups: memberGroups.map(g => g.name),
    camped_before: application?.camped_before === 'Yes',
    has_photo: !!application?.avatar_url,
    is_approved: application?.status === 'approved',
  }
}

// Catalog describing each fact for the admin distinction-rule builder, so it can
// render the right operator/value inputs. `type` drives which operators apply:
//   number  → gte / lte / eq
//   boolean → is_true / is_false
//   string  → eq
//   string[]→ includes
export type MemberFactType = 'number' | 'boolean' | 'string' | 'string[]'

export const MEMBER_FACT_CATALOG: { key: keyof MemberFacts; label: string; type: MemberFactType }[] = [
  { key: 'joined_year',        label: 'Joined year',          type: 'number' },
  { key: 'years_since_joined', label: 'Years since joining',  type: 'number' },
  { key: 'group_count',        label: 'Group count',          type: 'number' },
  { key: 'groups',             label: 'Groups',               type: 'string[]' },
  { key: 'designation',        label: 'Designation',          type: 'string' },
  { key: 'department',         label: 'Department',           type: 'string' },
  { key: 'camped_before',      label: 'Camped before',        type: 'boolean' },
  { key: 'has_photo',          label: 'Has photo',            type: 'boolean' },
  { key: 'is_approved',        label: 'Is approved',          type: 'boolean' },
]
