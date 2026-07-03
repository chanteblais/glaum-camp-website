import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminResourceLists } from '@/lib/admin-program-data'

// Full admin view: every list (visible or not) with its items, and per-item
// claims carrying display names — the organizer always sees who to chase.
// Assembly lives in lib/admin-program-data.ts (shared with /admin/program's
// server render); this route is the client's refresh path.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    return NextResponse.json({ lists: await getAdminResourceLists() })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, group_id, department_id, role_id, visible, sort_order } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  if ([group_id, department_id, role_id].filter(Boolean).length > 1) {
    return NextResponse.json({ error: 'A list has at most one steward' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('resource_lists')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      group_id: group_id || null,
      department_id: department_id || null,
      role_id: role_id || null,
      visible: visible ?? true,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ list: { ...data, steward_name: null, items: [] } })
}
