import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const update: Record<string, unknown> = {}
    if (body.name !== undefined) update.name = body.name
    if (body.description !== undefined) update.description = body.description
    if (body.icon !== undefined) update.icon = body.icon === '' ? null : body.icon
    if (body.icon_image !== undefined) update.icon_image = body.icon_image === '' ? null : body.icon_image
    if (body.apply_selectable !== undefined) update.apply_selectable = !!body.apply_selectable
    if (body.sort_order !== undefined) update.sort_order = body.sort_order
    if (body.join_policy !== undefined) update.join_policy = body.join_policy
    if (body.visibility !== undefined) update.visibility = body.visibility
    if (body.collection_id !== undefined) update.collection_id = body.collection_id === '' ? null : body.collection_id
    if (body.required_shift_type_id !== undefined) update.required_shift_type_id = body.required_shift_type_id || null
    if (body.required_shift_hours !== undefined) update.required_shift_hours = body.required_shift_hours === '' || body.required_shift_hours == null ? null : Number(body.required_shift_hours)

    const { data, error } = await supabaseAdmin
      .from('groups')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ group: data })
  } catch (err) {
    console.error('[PATCH /api/admin/groups/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // group_members rows cascade-delete via the FK.
  const { error } = await supabaseAdmin.from('groups').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
