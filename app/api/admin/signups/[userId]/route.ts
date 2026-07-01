import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.publicMetadata?.role === 'admin' ? userId : null
}

// PATCH: clear the member's role, remove one shift (remove_shift: <event_id>),
// or clear all their shifts (clear_shift). Shifts live in member_shift_signups
// (many-to-many) plus the legacy camp_signups.schedule_event_id — both cleared.
export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (!body.clear_role && !body.clear_shift && !body.remove_shift) {
    return NextResponse.json({ error: 'Nothing to clear' }, { status: 400 })
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
