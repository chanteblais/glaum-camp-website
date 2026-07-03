import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, description, capacity, sort_order, department_id, purpose, responsibilities_before, responsibilities_during, ideal_for, commitment, commitment_period, requires_approval, required_shift_type_id, required_shift_hours } = body

  const { data, error } = await supabaseAdmin
    .from('roles')
    .update({ name, description, capacity, sort_order, department_id, purpose, responsibilities_before, responsibilities_during, ideal_for, commitment, commitment_period, requires_approval, required_shift_type_id: required_shift_type_id || null, required_shift_hours: required_shift_hours === '' || required_shift_hours == null ? null : Number(required_shift_hours) })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ role: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin.from('roles').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
