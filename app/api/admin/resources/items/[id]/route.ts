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
  if ('name' in body) {
    if (!body.name?.trim()) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    patch.name = body.name.trim()
  }
  if ('note' in body) patch.note = body.note?.trim() || null
  if ('quantity_needed' in body) patch.quantity_needed = Math.max(1, Math.floor(Number(body.quantity_needed) || 1))
  if ('sort_order' in body) patch.sort_order = Number(body.sort_order) || 0

  const { error } = await supabaseAdmin.from('resources').update(patch).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Claims on the item cascade with it.
  const { error } = await supabaseAdmin.from('resources').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
