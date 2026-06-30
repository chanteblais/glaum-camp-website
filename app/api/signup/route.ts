import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

async function requireApprovedCamper(userId: string) {
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const { data: application } = await supabaseAdmin
    .from('members')
    .select('id, status')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .eq('status', 'approved')
    .maybeSingle()

  return application ?? null
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const application = await requireApprovedCamper(userId)
  if (!application) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [deptRes, rolesRes, signupRes, roleCounts, eventSignupCounts, scheduleRes, shiftFlagRes] = await Promise.all([
    supabaseAdmin.from('departments').select('id, name, description, icon, sort_order').order('sort_order'),
    supabaseAdmin.from('roles').select('id, name, description, capacity, sort_order, department_id, purpose, responsibilities_before, responsibilities_during, ideal_for, commitment, commitment_period, requires_approval').order('sort_order'),
    supabaseAdmin.from('camp_signups').select('role_id, schedule_event_id, role_approval_status').eq('clerk_user_id', userId).maybeSingle(),
    supabaseAdmin.from('camp_signups').select('role_id').not('role_id', 'is', null),
    supabaseAdmin.from('camp_signups').select('schedule_event_id').not('schedule_event_id', 'is', null),
    supabaseAdmin.from('schedule_events').select('id, day, time, title, subtitle, icon_type, highlight, is_recurring, capacity').eq('visible', true).order('sort_order'),
    supabaseAdmin.from('page_content').select('value').eq('key', 'config_shift_signup_open').maybeSingle(),
  ])

  const shiftSignupOpen = shiftFlagRes.data?.value !== 'false'

  const roleSignupCounts: Record<string, number> = {}
  for (const row of roleCounts.data ?? []) {
    if (row.role_id) roleSignupCounts[row.role_id] = (roleSignupCounts[row.role_id] ?? 0) + 1
  }

  const evSignupCounts: Record<string, number> = {}
  for (const row of eventSignupCounts.data ?? []) {
    if (row.schedule_event_id) evSignupCounts[row.schedule_event_id] = (evSignupCounts[row.schedule_event_id] ?? 0) + 1
  }

  const rolesWithCounts = (rolesRes.data ?? []).map(r => ({
    ...r,
    signed_up: roleSignupCounts[r.id] ?? 0,
  }))

  const departments = (deptRes.data ?? []).map(d => ({
    ...d,
    roles: rolesWithCounts.filter(r => r.department_id === d.id),
  }))

  // Only include capacity on events so the client knows which are signable
  const scheduleEvents = (scheduleRes.data ?? []).map(e => ({
    ...e,
    signed_up: e.capacity != null ? (evSignupCounts[e.id] ?? 0) : null,
  }))

  return NextResponse.json({
    signup: signupRes.data ?? null,
    departments,
    scheduleEvents,
    shiftSignupOpen,
  })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const application = await requireApprovedCamper(userId)
  if (!application) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { role_id, schedule_event_id } = body

  // role_id can be explicitly null to clear the role; schedule_event_id must be present to set (or omitted)
  if (role_id === undefined && schedule_event_id === undefined) {
    return NextResponse.json({ error: 'at least one field required' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('camp_signups')
    .select('role_id, schedule_event_id, role_approval_status')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  // Resolve final values — explicit null clears, undefined keeps existing
  const next_role_id = Object.prototype.hasOwnProperty.call(body, 'role_id') ? role_id : (existing?.role_id ?? null)
  const next_event_id = Object.prototype.hasOwnProperty.call(body, 'schedule_event_id') ? schedule_event_id : (existing?.schedule_event_id ?? null)

  const isRoleChange = existing?.role_id !== next_role_id
  const isEventChange = existing?.schedule_event_id !== next_event_id

  // Block new/changed shift selections while shift signup is closed.
  // Clearing a shift (next_event_id === null) stays allowed so members can cancel.
  if (isEventChange && next_event_id) {
    const { data: shiftFlag } = await supabaseAdmin
      .from('page_content')
      .select('value')
      .eq('key', 'config_shift_signup_open')
      .maybeSingle()
    if (shiftFlag?.value === 'false') {
      return NextResponse.json({ error: 'Shift signup is currently closed.' }, { status: 403 })
    }
  }

  // Check if the new role requires approval
  let requiresApproval = false
  let roleData: { requires_approval: boolean; name: string } | null = null
  if (next_role_id && isRoleChange) {
    const { data, error: roleError } = await supabaseAdmin.from('roles').select('requires_approval, name').eq('id', next_role_id).single()
    if (roleError) console.error('[Signup] Role fetch error:', roleError)
    roleData = data
    requiresApproval = roleData?.requires_approval ?? false
  }

  // When the role hasn't changed, preserve the existing approval status — don't wipe a pending
  // approval just because the member is updating their shift.
  const role_approval_status = isRoleChange
    ? (next_role_id ? (requiresApproval ? 'pending' : null) : null)
    : (existing?.role_approval_status ?? null)

  // Validate event capacity (skip if they already hold this event)
  if (next_event_id && isEventChange) {
    const { data: event } = await supabaseAdmin
      .from('schedule_events')
      .select('capacity, title')
      .eq('id', next_event_id)
      .single()

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    if (event.capacity != null) {
      const { count } = await supabaseAdmin
        .from('camp_signups')
        .select('id', { count: 'exact', head: true })
        .eq('schedule_event_id', schedule_event_id)

      if ((count ?? 0) >= event.capacity) {
        return NextResponse.json({ error: `"${event.title}" is full` }, { status: 409 })
      }
    }
  }

  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('camp_signups')
    .upsert(
      { clerk_user_id: userId, role_id: next_role_id, schedule_event_id: next_event_id, role_approval_status, updated_at: now },
      { onConflict: 'clerk_user_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify admin if role requires approval
  if (requiresApproval && isRoleChange && next_role_id) {
    const user = await currentUser()
    const name = user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ?? userId

    const { error: notifError } = await supabaseAdmin.from('admin_notifications').insert({
      application_id: application.id,
      event_type: 'role_approval_request',
      message: `${name} requested the "${roleData?.name}" role (requires approval)`,
      details: { role_id: next_role_id, role_name: roleData?.name },
    })
    if (notifError) console.error('[Signup] Approval notification error:', notifError)
  }

  // Notify admin on role or shift change (non-approval roles)
  if (!requiresApproval && next_role_id && (isRoleChange || isEventChange)) {
    const user = await currentUser()
    const name = user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ?? userId

    if (isRoleChange) {
      const [oldRole, newRole] = await Promise.all([
        supabaseAdmin.from('roles').select('name').eq('id', existing?.role_id ?? '').single(),
        supabaseAdmin.from('roles').select('name').eq('id', role_id).single(),
      ])
      await supabaseAdmin.from('admin_notifications').insert({
        application_id: application.id,
        event_type: 'role_change',
        message: `${name} changed their role`,
        details: {
          from_role: oldRole.data?.name ?? existing?.role_id,
          to_role: newRole.data?.name ?? role_id,
        },
      })
    }

    if (isEventChange) {
      const [oldEv, newEv] = await Promise.all([
        supabaseAdmin.from('schedule_events').select('title').eq('id', existing?.schedule_event_id ?? '').single(),
        supabaseAdmin.from('schedule_events').select('title').eq('id', schedule_event_id).single(),
      ])
      await supabaseAdmin.from('admin_notifications').insert({
        application_id: application.id,
        event_type: 'shift_change',
        message: `${name} changed their shift`,
        details: {
          from_shift: oldEv.data?.title ?? existing?.schedule_event_id,
          to_shift: newEv.data?.title ?? schedule_event_id,
        },
      })
    }
  }

  return NextResponse.json({ signup: data })
}
