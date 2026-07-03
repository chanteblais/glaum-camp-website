import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

// Shift types are requirement-free kinds of shift (Setup, Service, Tea, …).
// Whether a shift is *required* — and for whom — lives on groups/roles (conditional)
// or on attunement tasks (universal), never on the type itself.

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('shift_types')
    .select('id, name, icon, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shiftTypes: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('shift_types')
    .insert({ name: body.name, icon: body.icon || null, sort_order: body.sort_order ?? 0 })
    .select('id, name, icon, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shiftType: data })
}
