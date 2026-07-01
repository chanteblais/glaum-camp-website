import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

// Member-facing self-service for opt-in groups (e.g. Setup / Teardown / Decor).
// The set a member may self-manage = groups whose collection is visible
// (group_collections.show_on_profile) AND that are marked selectable
// (groups.apply_selectable). Collection visibility is the source of truth here;
// the apply-form `group_select` field governs the application wizard only.
// Groups with no collection default to visible so orphaned groups still surface.

// Returns the set of group ids members may opt into on the Participate page.
async function selectableGroupIds(): Promise<Set<string>> {
  const { data: groups, error } = await supabaseAdmin
    .from('groups')
    .select('id, apply_selectable, collection_id, group_collections(show_on_profile)')

  // Table missing (pre-migration) → nothing selectable rather than a 500.
  if (error) return new Set<string>()

  type Row = {
    id: string
    apply_selectable: boolean | null
    collection_id: string | null
    // Supabase types the embed as an array; runtime returns a single row for a to-one FK.
    group_collections: { show_on_profile: boolean } | { show_on_profile: boolean }[] | null
  }

  const ids = new Set<string>()
  for (const g of (groups ?? []) as unknown as Row[]) {
    if (!g.apply_selectable) continue
    const col = Array.isArray(g.group_collections) ? g.group_collections[0] : g.group_collections
    const collectionVisible = col?.show_on_profile ?? true
    if (collectionVisible) ids.add(g.id)
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
    .select('id, name, description, icon, icon_image, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: mine } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('clerk_user_id', userId)
  const joined = new Set((mine ?? []).map(m => m.group_id))

  const offered = (groups ?? []).filter(g => ids.has(g.id))
  return NextResponse.json({
    groups: offered.map(g => ({ ...g, joined: joined.has(g.id) })),
  })
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
