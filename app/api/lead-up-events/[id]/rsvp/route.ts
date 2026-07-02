import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { memberDisplayNames } from '@/lib/member-names'

// Confirm the signed-in user is an approved member before they may RSVP.
async function requireApprovedMember(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('members')
    .select('status')
    .eq('clerk_user_id', userId)
    .eq('status', 'approved')
    .maybeSingle()
  return !!data
}

// Headcount + resolved lead names, so the UI can re-render from the response.
async function rsvpSummary(eventId: string): Promise<{ count: number; lead_names: string[] }> {
  const { data } = await supabaseAdmin
    .from('lead_up_event_rsvps')
    .select('clerk_user_id, role')
    .eq('lead_up_event_id', eventId)
  const rows = data ?? []
  const leadIds = rows.filter(r => r.role === 'lead').map(r => r.clerk_user_id)
  const names = await memberDisplayNames(leadIds)
  return { count: rows.length, lead_names: leadIds.map(id => names[id]).filter(Boolean) }
}

// POST — toggle the current member's RSVP for this lead-up gathering.
// This is a per-session "I'll be there" headcount only — it never touches
// attunement, shifts, or camp signup.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    if (!(await requireApprovedMember(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the gathering exists, is visible, and hasn't already happened.
    const { data: event } = await supabaseAdmin
      .from('lead_up_events')
      .select('id, event_date')
      .eq('id', params.id)
      .eq('visible', true)
      .maybeSingle()
    if (!event) return NextResponse.json({ error: 'Gathering not found' }, { status: 404 })
    if (event.event_date && event.event_date < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: 'This gathering has already happened' }, { status: 400 })
    }

    // Allow an explicit desired state; default to toggle. An optional `lead`
    // boolean (migration 048) sets the participation role; omitted = keep as-is.
    let desired: 'on' | 'off' | 'toggle' = 'toggle'
    let lead: boolean | undefined
    try {
      const body = await req.json()
      if (body?.rsvp === true) desired = 'on'
      else if (body?.rsvp === false) desired = 'off'
      if (typeof body?.lead === 'boolean') lead = body.lead
    } catch {
      // No / invalid body — fall back to toggle.
    }

    const { data: existing } = await supabaseAdmin
      .from('lead_up_event_rsvps')
      .select('id, role')
      .eq('lead_up_event_id', params.id)
      .eq('clerk_user_id', userId)
      .maybeSingle()

    const shouldRemove = desired === 'off' || (desired === 'toggle' && !!existing)

    if (shouldRemove) {
      const { error } = await supabaseAdmin
        .from('lead_up_event_rsvps')
        .delete()
        .eq('lead_up_event_id', params.id)
        .eq('clerk_user_id', userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ rsvped: false, leading: false, ...(await rsvpSummary(params.id)) })
    }

    const role = lead === undefined ? existing?.role ?? 'member' : lead ? 'lead' : 'member'
    if (!existing) {
      const { error } = await supabaseAdmin
        .from('lead_up_event_rsvps')
        .insert({ lead_up_event_id: params.id, clerk_user_id: userId, role })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (role !== existing.role) {
      const { error } = await supabaseAdmin
        .from('lead_up_event_rsvps')
        .update({ role })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ rsvped: true, leading: role === 'lead', ...(await rsvpSummary(params.id)) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to RSVP'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
