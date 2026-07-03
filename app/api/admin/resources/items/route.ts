import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { list_id, name, note, quantity_needed, icon, sort_order } = await req.json()
  if (!list_id) return NextResponse.json({ error: 'list_id is required' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  // Empty/null target = an open callout (no set need) — migration 053.
  const needed = quantity_needed === '' || quantity_needed == null
    ? null
    : Math.max(1, Math.floor(Number(quantity_needed) || 1))
  const { data, error } = await supabaseAdmin
    .from('resources')
    .insert({
      list_id,
      name: name.trim(),
      note: note?.trim() || null,
      quantity_needed: needed,
      icon: icon || null,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ item: { ...data, offered_by_name: null, claimed: 0, claimants: [] } })
}
