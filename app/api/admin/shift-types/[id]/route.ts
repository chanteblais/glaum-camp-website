import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.icon !== undefined) update.icon = body.icon === '' ? null : body.icon
  if (body.sort_order !== undefined) update.sort_order = body.sort_order

  const { data, error } = await supabaseAdmin
    .from('shift_types')
    .update(update)
    .eq('id', params.id)
    .select('id, name, icon, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shiftType: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // schedule_events.shift_type_id and groups/roles.required_shift_type_id are all
  // ON DELETE SET NULL, so deleting a type nulls its references rather than cascading.
  const { error } = await supabaseAdmin.from('shift_types').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
