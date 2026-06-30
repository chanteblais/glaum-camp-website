import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — visible lead-up gatherings for the current member, each with its RSVP
// headcount and whether this member has RSVP'd. Drives the /schedule section.
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Only approved members see lead-up gatherings.
  const { data: member } = await supabaseAdmin
    .from('members')
    .select('status')
    .eq('clerk_user_id', userId)
    .eq('status', 'approved')
    .maybeSingle()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: events, error } = await supabaseAdmin
    .from('lead_up_events')
    .select('*')
    .eq('visible', true)
    .order('event_date', { ascending: true, nullsFirst: false })
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (events ?? []).map(e => e.id)
  const counts: Record<string, number> = {}
  const mine = new Set<string>()
  if (ids.length) {
    const { data: rsvps } = await supabaseAdmin
      .from('lead_up_event_rsvps')
      .select('lead_up_event_id, clerk_user_id')
      .in('lead_up_event_id', ids)
    for (const r of rsvps ?? []) {
      counts[r.lead_up_event_id] = (counts[r.lead_up_event_id] ?? 0) + 1
      if (r.clerk_user_id === userId) mine.add(r.lead_up_event_id)
    }
  }

  const result = (events ?? []).map(e => ({
    ...e,
    rsvp_count: counts[e.id] ?? 0,
    rsvped: mine.has(e.id),
  }))
  return NextResponse.json({ events: result })
}
