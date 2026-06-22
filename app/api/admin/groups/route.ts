import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') return null
  return userId
}

export async function GET() {
  const { data: groups, error } = await supabaseAdmin
    .from('groups')
    .select('id, name, description, icon, apply_selectable, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach a member count to each group (one extra query, joined in JS).
  const { data: memberRows } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
  const counts: Record<string, number> = {}
  for (const r of memberRows ?? []) counts[r.group_id] = (counts[r.group_id] ?? 0) + 1

  return NextResponse.json({
    groups: (groups ?? []).map(g => ({ ...g, member_count: counts[g.id] ?? 0 })),
  })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, description, icon, apply_selectable, sort_order } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('groups')
    .insert({
      name,
      description: description ?? null,
      icon: icon ?? null,
      apply_selectable: !!apply_selectable,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ group: { ...data, member_count: 0 } })
}
