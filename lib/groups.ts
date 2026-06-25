import { supabaseAdmin } from './supabase'
import { DEFAULT_CONTRIBUTION_TYPES } from './application-options'

export type MemberGroup = { id: string; name: string; icon: string | null; description: string | null; badge_image: string | null }

// Fetch the groups a member belongs to (ordered by the group's sort_order).
// Replaces the old `setup_preference`-derived "contributions" concept.
export async function getMemberGroups(clerkUserId: string | null | undefined): Promise<MemberGroup[]> {
  if (!clerkUserId) return []
  const { data } = await supabaseAdmin
    .from('group_members')
    .select('groups(id, name, icon, description, badge_image, sort_order)')
    .eq('clerk_user_id', clerkUserId)

  type GroupRow = MemberGroup & { sort_order: number }
  return (data ?? [])
    .map(r => r.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => !!g)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ id, name, icon, description, badge_image }) => ({ id, name, icon, description, badge_image }))
}

// Map of clerk_user_id → group names they belong to. For admin roster/overview
// views that need every member's groups at once (replaces reading setup_preference).
export async function getGroupNamesByUser(): Promise<Record<string, string[]>> {
  const { data } = await supabaseAdmin
    .from('group_members')
    .select('clerk_user_id, groups(name)')

  const map: Record<string, string[]> = {}
  for (const r of data ?? []) {
    const name = (r.groups as unknown as { name: string } | null)?.name
    if (!name || !r.clerk_user_id) continue
    ;(map[r.clerk_user_id] ??= []).push(name)
  }
  return map
}

// Shape the member's groups as the icon/description metadata CommitmentsSection
// expects (it keys icon/desc by the value shown, which is the group name).
// When a group has no description of its own, fall back to the matching default
// contribution one-liner (Setup/Teardown/Decor) so commitment rows still read as
// a living description rather than a bare title.
export function groupCommitmentMeta(groups: MemberGroup[]) {
  return groups.map(g => {
    const fallback = DEFAULT_CONTRIBUTION_TYPES.find(t => t.value.toLowerCase() === g.name.toLowerCase())
    return {
      value: g.name,
      // Prefer the group's own emoji icon; fall back to its uploaded badge image,
      // then to a plain mark. CommitmentsSection renders image-path values as <img>.
      icon: g.icon || g.badge_image || '✦',
      description: g.description || fallback?.description || '',
    }
  })
}
