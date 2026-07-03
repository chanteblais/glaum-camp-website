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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  if ('title' in body) {
    if (!body.title?.trim()) return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
    patch.title = body.title.trim()
  }
  if ('description' in body) patch.description = body.description?.trim() || null
  if ('group_id' in body) patch.group_id = body.group_id || null
  if ('department_id' in body) patch.department_id = body.department_id || null
  if ('role_id' in body) patch.role_id = body.role_id || null
  if ([patch.group_id, patch.department_id, patch.role_id].filter(Boolean).length > 1) {
    return NextResponse.json({ error: 'A list has at most one steward' }, { status: 400 })
  }
  if ('visible' in body) patch.visible = !!body.visible
  if ('sort_order' in body) patch.sort_order = Number(body.sort_order) || 0

  const { error } = await supabaseAdmin.from('resource_lists').update(patch).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Items and claims cascade with the list.
  const { error } = await supabaseAdmin.from('resource_lists').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
