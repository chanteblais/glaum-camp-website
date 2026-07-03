import { supabaseAdmin } from './supabase'

// A member's resource claims, shaped for the Active Commitments card
// ("Camping Stove ×2 · Shared Kitchen"). Claims on hidden lists still show —
// the member made the commitment; hiding a list gates discovery, not honesty.
export type MemberResourceClaim = {
  id: string
  resourceName: string
  listTitle: string
  quantity: number
}

export async function getMemberResourceClaims(clerkUserId: string | null | undefined): Promise<MemberResourceClaim[]> {
  if (!clerkUserId) return []
  const { data, error } = await supabaseAdmin
    .from('resource_claims')
    .select('id, quantity, resources(name, sort_order, resource_lists(title, sort_order))')
    .eq('clerk_user_id', clerkUserId)

  // Table missing (pre-migration) → no rows rather than a crash.
  if (error) return []

  type Row = {
    id: string
    quantity: number
    // Supabase types the embeds as arrays; runtime returns a single row for a to-one FK.
    resources: {
      name: string
      sort_order: number
      resource_lists: { title: string; sort_order: number } | { title: string; sort_order: number }[] | null
    } | { name: string; sort_order: number; resource_lists: { title: string; sort_order: number } | { title: string; sort_order: number }[] | null }[] | null
  }

  return ((data ?? []) as unknown as Row[])
    .map(r => {
      const res = Array.isArray(r.resources) ? r.resources[0] : r.resources
      if (!res) return null
      const list = Array.isArray(res.resource_lists) ? res.resource_lists[0] : res.resource_lists
      return {
        id: r.id,
        resourceName: res.name,
        listTitle: list?.title ?? '',
        quantity: r.quantity,
        _sort: (list?.sort_order ?? 0) * 1000 + res.sort_order,
      }
    })
    .filter((c): c is NonNullable<typeof c> => !!c)
    .sort((a, b) => a._sort - b._sort)
    .map(({ id, resourceName, listTitle, quantity }) => ({ id, resourceName, listTitle, quantity }))
}
