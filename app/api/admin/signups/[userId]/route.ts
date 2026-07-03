import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

// PATCH: clear the member's role, remove one shift (remove_shift: <event_id>),
// clear all their shifts (clear_shift), or set their lead status on one shift
// (set_shift_role: { schedule_event_id, role }). Shifts live in
// member_shift_signups (many-to-many) plus the legacy
// camp_signups.schedule_event_id — both cleared.
export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (!body.clear_role && !body.clear_shift && !body.remove_shift && !body.set_shift_role) {
    return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })
  }

  // Admin promote/demote a lead on a shift the member already holds. Only the
  // many-to-many table carries roles; a legacy-only hold can't be promoted.
  if (body.set_shift_role) {
    const { schedule_event_id, role } = body.set_shift_role
    if (!schedule_event_id || (role !== 'member' && role !== 'lead')) {
      return NextResponse.json({ error: 'set_shift_role needs schedule_event_id and role "member"|"lead"' }, { status: 400 })
    }
    const { error, count } = await supabaseAdmin
      .from('member_shift_signups')
      .update({ role }, { count: 'exact' })
      .eq('clerk_user_id', params.userId)
      .eq('schedule_event_id', schedule_event_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if ((count ?? 0) === 0) {
      return NextResponse.json({ error: 'Member does not hold that shift' }, { status: 404 })
    }
  }

  if (body.clear_role) {
    const { error } = await supabaseAdmin
      .from('camp_signups')
      .update({ role_id: null, role_approval_status: null })
      .eq('clerk_user_id', params.userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (body.remove_shift) {
    const { error } = await supabaseAdmin
      .from('member_shift_signups')
      .delete()
      .eq('clerk_user_id', params.userId)
      .eq('schedule_event_id', body.remove_shift)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await supabaseAdmin
      .from('camp_signups')
      .update({ schedule_event_id: null })
      .eq('clerk_user_id', params.userId)
      .eq('schedule_event_id', body.remove_shift)
  }

  if (body.clear_shift) {
    const { error } = await supabaseAdmin
      .from('member_shift_signups')
      .delete()
      .eq('clerk_user_id', params.userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await supabaseAdmin
      .from('camp_signups')
      .update({ schedule_event_id: null })
      .eq('clerk_user_id', params.userId)
  }

  return NextResponse.json({ success: true })
}
