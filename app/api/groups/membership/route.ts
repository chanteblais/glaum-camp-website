import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

// Member-facing self-service for opt-in groups (e.g. Setup / Teardown / Decor).
// The set a member may self-manage = the groups offered by visible `group_select`
// fields in the member form (options list; unset = all groups) — the same source
// of truth the apply flow uses. The legacy per-group `apply_selectable` column is
// no longer authoritative. Admin-only groups aren't exposed here.

// Returns { allowAll, ids } describing which groups members may opt into.
async function selectableGroupIds(): Promise<{ allowAll: boolean; ids: Set<string> }> {
  const { data: cfgRow } = await supabaseAdmin
    .from('page_content')
    .select('value')
    .eq('key', 'config_member_form')
    .maybeSingle()

  const ids = new Set<string>()
  let allowAll = false
  try {
    const cfg = cfgRow?.value
      ? (JSON.parse(cfgRow.value) as { steps?: { fields?: { type?: string; visible?: boolean; options?: string[] }[] }[] })
      : null
    for (const step of cfg?.steps ?? []) {
      for (const f of step.fields ?? []) {
        if (f?.type !== 'group_select' || f.visible === false) continue
        if (f.options === undefined || f.options === null) allowAll = true
        else for (const id of f.options) ids.add(id)
      }
    }
  } catch { /* malformed config → nothing selectable */ }
  return { allowAll, ids }
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowAll, ids } = await selectableGroupIds()
  if (!allowAll && ids.size === 0) return NextResponse.json({ groups: [] })

  const { data: groups, error } = await supabaseAdmin
    .from('groups')
    .select('id, name, description, icon, icon_image, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: mine } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('clerk_user_id', userId)
  const joined = new Set((mine ?? []).map(m => m.group_id))

  const offered = (groups ?? []).filter(g => allowAll || ids.has(g.id))
  return NextResponse.json({
    groups: offered.map(g => ({ ...g, joined: joined.has(g.id) })),
  })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { group_id, joined } = await req.json()
  if (!group_id || typeof joined !== 'boolean') {
    return NextResponse.json({ error: 'group_id and joined are required' }, { status: 400 })
  }

  // Only groups offered by the member form's group_select fields are self-manageable.
  const { allowAll, ids } = await selectableGroupIds()
  if (!allowAll && !ids.has(group_id)) {
    return NextResponse.json({ error: 'This group cannot be self-managed' }, { status: 403 })
  }

  if (joined) {
    const { error } = await supabaseAdmin
      .from('group_members')
      .upsert({ group_id, clerk_user_id: userId, source: 'application' }, { onConflict: 'group_id,clerk_user_id', ignoreDuplicates: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabaseAdmin
      .from('group_members')
      .delete()
      .eq('group_id', group_id)
      .eq('clerk_user_id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, joined })
}
