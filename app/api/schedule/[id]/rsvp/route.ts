import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

// Confirm the signed-in user is an approved member before they may RSVP.
async function requireApprovedMember(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('applications')
    .select('status')
    .eq('clerk_user_id', userId)
    .eq('status', 'approved')
    .maybeSingle()
  return !!data
}

async function rsvpCount(eventId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('event_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('schedule_event_id', eventId)
  return count ?? 0
}

// GET — return whether the current user has RSVP'd + total count for this event.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { data: existing } = await supabaseAdmin
      .from('event_rsvps')
      .select('id')
      .eq('schedule_event_id', params.id)
      .eq('clerk_user_id', userId)
      .maybeSingle()

    return NextResponse.json({ rsvped: !!existing, count: await rsvpCount(params.id) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load RSVP'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST — toggle the current user's RSVP for this event.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    if (!(await requireApprovedMember(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the event exists and is visible
    const { data: event } = await supabaseAdmin
      .from('schedule_events')
      .select('id')
      .eq('id', params.id)
      .eq('visible', true)
      .maybeSingle()

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    // Allow the client to specify an explicit desired state; default to toggle.
    let desired: 'on' | 'off' | 'toggle' = 'toggle'
    try {
      const body = await req.json()
      if (body?.rsvp === true) desired = 'on'
      else if (body?.rsvp === false) desired = 'off'
    } catch {
      // No / invalid body — fall back to toggle behaviour.
    }

    const { data: existing } = await supabaseAdmin
      .from('event_rsvps')
      .select('id')
      .eq('schedule_event_id', params.id)
      .eq('clerk_user_id', userId)
      .maybeSingle()

    const shouldRemove = desired === 'off' || (desired === 'toggle' && !!existing)

    if (shouldRemove) {
      const { error } = await supabaseAdmin
        .from('event_rsvps')
        .delete()
        .eq('schedule_event_id', params.id)
        .eq('clerk_user_id', userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ rsvped: false, count: await rsvpCount(params.id) })
    }

    if (!existing) {
      const { error } = await supabaseAdmin
        .from('event_rsvps')
        .insert({ schedule_event_id: params.id, clerk_user_id: userId })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ rsvped: true, count: await rsvpCount(params.id) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to RSVP'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
