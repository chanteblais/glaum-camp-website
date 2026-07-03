import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

// Member view of shared resources: every VISIBLE list with its items, the
// community-wide claimed total per item, and the caller's own claim quantity.
// Who else claimed what is admin-facing detail — members see totals only.
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lists, error } = await supabaseAdmin
    .from('resource_lists')
    .select('id, title, description, visible, sort_order, groups(name), departments(name), roles(name)')
    .eq('visible', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  // Table missing (pre-migration) → empty section rather than a 500.
  if (error) return NextResponse.json({ lists: [] })
  if (!lists || lists.length === 0) return NextResponse.json({ lists: [] })

  const listIds = lists.map(l => l.id)
  const { data: items } = await supabaseAdmin
    .from('resources')
    .select('id, list_id, name, note, quantity_needed, sort_order')
    .in('list_id', listIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const itemIds = (items ?? []).map(i => i.id)
  const claimTotals: Record<string, number> = {}
  const mine: Record<string, number> = {}
  if (itemIds.length > 0) {
    const { data: claims } = await supabaseAdmin
      .from('resource_claims')
      .select('resource_id, clerk_user_id, quantity')
      .in('resource_id', itemIds)
    for (const c of claims ?? []) {
      claimTotals[c.resource_id] = (claimTotals[c.resource_id] ?? 0) + c.quantity
      if (c.clerk_user_id === userId) mine[c.resource_id] = c.quantity
    }
  }

  const itemsByList: Record<string, unknown[]> = {}
  for (const it of items ?? []) {
    ;(itemsByList[it.list_id] ??= []).push({
      id: it.id,
      name: it.name,
      note: it.note,
      needed: it.quantity_needed,
      claimed: claimTotals[it.id] ?? 0,
      mine: mine[it.id] ?? 0,
    })
  }

  // Supabase types the embeds as arrays; runtime returns a single row for a to-one FK.
  type NameEmbed = { name: string } | { name: string }[] | null
  const embedName = (e: NameEmbed) => (Array.isArray(e) ? e[0]?.name : e?.name) ?? null
  type ListRow = { id: string; title: string; description: string | null; groups: NameEmbed; departments: NameEmbed; roles: NameEmbed }
  return NextResponse.json({
    lists: ((lists ?? []) as unknown as ListRow[])
      .map(l => ({
        id: l.id,
        title: l.title,
        description: l.description,
        // At most one steward FK is set (migration 052) — group, department, or role.
        steward_name: embedName(l.groups) ?? embedName(l.departments) ?? embedName(l.roles),
        items: itemsByList[l.id] ?? [],
      }))
      // An empty list is admin work-in-progress; don't show members a bare heading.
      .filter(l => (l.items as unknown[]).length > 0),
  })
}
