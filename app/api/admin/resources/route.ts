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
    .select('id, title, description, group_id, visible, sort_order, groups(name)')
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

  type ListRow = { id: string; title: string; description: string | null; group_id: string | null; visible: boolean; sort_order: number; groups: { name: string } | { name: string }[] | null }
  return NextResponse.json({
    lists: ((lists ?? []) as unknown as ListRow[]).map(l => {
      const g = Array.isArray(l.groups) ? l.groups[0] : l.groups
      return {
        id: l.id, title: l.title, description: l.description, group_id: l.group_id,
        visible: l.visible, sort_order: l.sort_order,
        group_name: g?.name ?? null,
        items: itemsByList[l.id] ?? [],
      }
    }),
  })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, group_id, visible, sort_order } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('resource_lists')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      group_id: group_id || null,
      visible: visible ?? true,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ list: { ...data, group_name: null, items: [] } })
}
