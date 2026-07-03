import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  if ('name' in body) {
    if (!body.name?.trim()) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    patch.name = body.name.trim()
  }
  if ('note' in body) patch.note = body.note?.trim() || null
  if ('icon' in body) patch.icon = body.icon || null
  // Empty/null target = open callout; setting a number turns a member offer
  // into a real need (claims stay attached) — migration 053.
  if ('quantity_needed' in body) {
    patch.quantity_needed = body.quantity_needed === '' || body.quantity_needed == null
      ? null
      : Math.max(1, Math.floor(Number(body.quantity_needed) || 1))
  }
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
