import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { memberDisplayNames } from '@/lib/member-names'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') return null
  return userId
}

// Full admin view: every list (visible or not) with its items, and per-item
// claims carrying display names — the organizer always sees who to chase.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: lists, error } = await supabaseAdmin
    .from('resource_lists')
    .select('id, title, description, group_id, department_id, role_id, visible, sort_order, groups(name), departments(name), roles(name)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: items } = await supabaseAdmin
    .from('resources')
    .select('id, list_id, name, note, quantity_needed, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const { data: claims } = await supabaseAdmin
    .from('resource_claims')
    .select('resource_id, clerk_user_id, quantity')

  const names = await memberDisplayNames((claims ?? []).map(c => c.clerk_user_id))

  const claimsByResource: Record<string, { name: string; quantity: number }[]> = {}
  for (const c of claims ?? []) {
    ;(claimsByResource[c.resource_id] ??= []).push({
      name: names[c.clerk_user_id] ?? 'Unknown member',
      quantity: c.quantity,
    })
  }

  const itemsByList: Record<string, unknown[]> = {}
  for (const it of items ?? []) {
    const itemClaims = claimsByResource[it.id] ?? []
    ;(itemsByList[it.list_id] ??= []).push({
      ...it,
      claimed: itemClaims.reduce((s, c) => s + c.quantity, 0),
      claimants: itemClaims,
    })
  }

  // Supabase types the embeds as arrays; runtime returns a single row for a to-one FK.
  type NameEmbed = { name: string } | { name: string }[] | null
  const embedName = (e: NameEmbed) => (Array.isArray(e) ? e[0]?.name : e?.name) ?? null
  type ListRow = { id: string; title: string; description: string | null; group_id: string | null; department_id: string | null; role_id: string | null; visible: boolean; sort_order: number; groups: NameEmbed; departments: NameEmbed; roles: NameEmbed }
  return NextResponse.json({
    lists: ((lists ?? []) as unknown as ListRow[]).map(l => ({
      id: l.id, title: l.title, description: l.description,
      group_id: l.group_id, department_id: l.department_id, role_id: l.role_id,
      visible: l.visible, sort_order: l.sort_order,
      // The steward is display context only; at most one FK is set (migration 052).
      steward_name: embedName(l.groups) ?? embedName(l.departments) ?? embedName(l.roles),
      items: itemsByList[l.id] ?? [],
    })),
  })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, group_id, department_id, role_id, visible, sort_order } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  if ([group_id, department_id, role_id].filter(Boolean).length > 1) {
    return NextResponse.json({ error: 'A list has at most one steward' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('resource_lists')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      group_id: group_id || null,
      department_id: department_id || null,
      role_id: role_id || null,
      visible: visible ?? true,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ list: { ...data, steward_name: null, items: [] } })
}
