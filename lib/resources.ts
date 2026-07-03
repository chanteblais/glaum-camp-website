import { supabaseAdmin } from './supabase'

// Unmet needs across visible lists, for the home-dashboard "Bring Something"
// banner: items with a target (offers excluded) whose claims fall short.
// Demand-driven — the banner renders nothing once everything is covered.
export type UnmetNeed = { id: string; name: string; listTitle: string; remaining: number }

export async function getUnmetResourceNeeds(): Promise<UnmetNeed[]> {
  const { data: lists, error } = await supabaseAdmin
    .from('resource_lists')
    .select('id, title, sort_order')
    .eq('visible', true)
  // Table missing (pre-migration) → no banner rather than a crash.
  if (error || !lists || lists.length === 0) return []

  const listById = Object.fromEntries(lists.map(l => [l.id, l]))

  const { data: items } = await supabaseAdmin
    .from('resources')
    .select('id, list_id, name, quantity_needed, sort_order, created_at')
    .in('list_id', lists.map(l => l.id))
    .not('quantity_needed', 'is', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (!items || items.length === 0) return []

  const { data: claims } = await supabaseAdmin
    .from('resource_claims')
    .select('resource_id, quantity')
    .in('resource_id', items.map(i => i.id))
  const claimed: Record<string, number> = {}
  for (const c of claims ?? []) claimed[c.resource_id] = (claimed[c.resource_id] ?? 0) + c.quantity

  return items
    .map(i => ({
      id: i.id,
      name: i.name,
      listTitle: listById[i.list_id]?.title ?? '',
      remaining: (i.quantity_needed as number) - (claimed[i.id] ?? 0),
      _sort: (listById[i.list_id]?.sort_order ?? 0) * 1000 + i.sort_order,
    }))
    .filter(i => i.remaining > 0)
    .sort((a, b) => a._sort - b._sort)
    .map(({ id, name, listTitle, remaining }) => ({ id, name, listTitle, remaining }))
}

// A member's resource claims, shaped for the Active Commitments card
// ("Camping Stove ×2 · Shared Kitchen"). Claims on hidden lists still show —
// the member made the commitment; hiding a list gates discovery, not honesty.
export type MemberResourceClaim = {
  id: string
  resourceName: string
  listTitle: string
  quantity: number
  icon: string | null
}

export async function getMemberResourceClaims(clerkUserId: string | null | undefined): Promise<MemberResourceClaim[]> {
  if (!clerkUserId) return []
  const { data, error } = await supabaseAdmin
    .from('resource_claims')
    .select('id, quantity, resources(name, icon, sort_order, resource_lists(title, sort_order))')
    .eq('clerk_user_id', clerkUserId)

  // Table missing (pre-migration) → no rows rather than a crash.
  if (error) return []

  type ResourceEmbed = {
    name: string
    icon: string | null
    sort_order: number
    resource_lists: { title: string; sort_order: number } | { title: string; sort_order: number }[] | null
  }
  type Row = {
    id: string
    quantity: number
    // Supabase types the embeds as arrays; runtime returns a single row for a to-one FK.
    resources: ResourceEmbed | ResourceEmbed[] | null
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
        icon: res.icon,
        _sort: (list?.sort_order ?? 0) * 1000 + res.sort_order,
      }
    })
    .filter((c): c is NonNullable<typeof c> => !!c)
    .sort((a, b) => a._sort - b._sort)
    .map(({ id, resourceName, listTitle, quantity, icon }) => ({ id, resourceName, listTitle, quantity, icon }))
}
