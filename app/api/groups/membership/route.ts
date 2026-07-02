import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

// Member-facing self-service for opt-in groups (e.g. Setup / Teardown / Decor).
// A group is self-joinable iff its collection has self_join = true. This is a
// single collection-level gate (migration 044) — profile display (show_on_profile)
// is an independent, orthogonal concern. Groups with no collection are not
// self-joinable (there's no collection to opt them in). The apply-form
// `group_select` field governs the application wizard only, not this surface.

// Returns the set of group ids members may opt into on the Participate page.
async function selectableGroupIds(): Promise<Set<string>> {
  const { data: groups, error } = await supabaseAdmin
    .from('groups')
    .select('id, collection_id, group_collections(self_join)')

  // Table missing (pre-migration) → nothing selectable rather than a 500.
  if (error) return new Set<string>()

  type Row = {
    id: string
    collection_id: string | null
    // Supabase types the embed as an array; runtime returns a single row for a to-one FK.
    group_collections: { self_join: boolean } | { self_join: boolean }[] | null
  }

  const ids = new Set<string>()
  for (const g of (groups ?? []) as unknown as Row[]) {
    const col = Array.isArray(g.group_collections) ? g.group_collections[0] : g.group_collections
    if (col?.self_join) ids.add(g.id)
  }
  return ids
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ids = await selectableGroupIds()
  if (ids.size === 0) return NextResponse.json({ groups: [] })

  const { data: groups, error } = await supabaseAdmin
    .from('groups')
    .select('id, name, description, icon, icon_image, sort_order, collection_id, required_shift_hours, group_collections(name, sort_order), shift_types:required_shift_type_id(name)')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: mine } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('clerk_user_id', userId)
  const joined = new Set((mine ?? []).map(m => m.group_id))

  type Row = {
    id: string
    name: string
    description: string | null
    icon: string | null
    icon_image: string | null
    collection_id: string | null
    required_shift_hours: number | null
    // Supabase types the embeds as arrays; runtime returns a single row for a to-one FK.
    group_collections: { name: string; sort_order: number } | { name: string; sort_order: number }[] | null
    shift_types: { name: string } | { name: string }[] | null
  }

  const offered = ((groups ?? []) as unknown as Row[])
    .filter(g => ids.has(g.id))
    .map(g => {
      const col = Array.isArray(g.group_collections) ? g.group_collections[0] : g.group_collections
      const shiftType = Array.isArray(g.shift_types) ? g.shift_types[0] : g.shift_types
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        icon: g.icon,
        icon_image: g.icon_image,
        collection_id: g.collection_id,
        collection_name: col?.name ?? null,
        collection_sort: col?.sort_order ?? 0,
        joined: joined.has(g.id),
        // The shift commitment joining this group carries (null = none) — shown
        // on the row so members know what they're taking on before they join.
        shift_commitment: shiftType ? { hours: g.required_shift_hours ?? 1, type: shiftType.name } : null,
      }
    })
    // Order by collection, keeping the existing within-collection sort_order (stable sort).
    .sort((a, b) => a.collection_sort - b.collection_sort)

  return NextResponse.json({ groups: offered })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { group_id, joined } = await req.json()
  if (!group_id || typeof joined !== 'boolean') {
    return NextResponse.json({ error: 'group_id and joined are required' }, { status: 400 })
  }

  // Only selectable groups in a visible collection are self-manageable.
  const ids = await selectableGroupIds()
  if (!ids.has(group_id)) {
    return NextResponse.json({ error: 'This group cannot be self-managed' }, { status: 403 })
  }

  if (joined) {
    const { error } = await supabaseAdmin
      .from('group_members')
      .upsert({ group_id, clerk_user_id: userId, source: 'application' }, { onConflict: 'group_id,clerk_user_id', ignoreDuplicates: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabaseAdmin
      .from('group_members')
      .delete()
      .eq('group_id', group_id)
      .eq('clerk_user_id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, joined })
}
