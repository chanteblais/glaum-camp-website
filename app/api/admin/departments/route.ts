import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('id, name, description, icon, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ departments: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, description, icon, sort_order } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('departments')
    .insert({ name, description: description ?? null, icon: icon ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ department: data })
}
