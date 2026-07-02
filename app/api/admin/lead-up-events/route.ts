import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { memberDisplayNames } from '@/lib/member-names'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.publicMetadata?.role === 'admin' ? userId : null
}

// GET — all lead-up gatherings with their RSVP headcounts (admin view).
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('lead_up_events')
    .select('*')
    .order('event_date', { ascending: true, nullsFirst: false })
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: rsvps } = await supabaseAdmin
    .from('lead_up_event_rsvps')
    .select('lead_up_event_id, clerk_user_id, role')
  const counts: Record<string, number> = {}
  const leadIdsByEvent: Record<string, string[]> = {}
  for (const r of rsvps ?? []) {
    counts[r.lead_up_event_id] = (counts[r.lead_up_event_id] ?? 0) + 1
    if (r.role === 'lead') {
      leadIdsByEvent[r.lead_up_event_id] = [...(leadIdsByEvent[r.lead_up_event_id] ?? []), r.clerk_user_id]
    }
  }
  const leadNames = await memberDisplayNames(Object.values(leadIdsByEvent).flat())

  const events = (data ?? []).map(e => ({
    ...e,
    rsvp_count: counts[e.id] ?? 0,
    lead_names: (leadIdsByEvent[e.id] ?? []).map(id => leadNames[id]).filter(Boolean),
  }))
  return NextResponse.json({ events })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  // Place new gathering at the end.
  const { data: last } = await supabaseAdmin
    .from('lead_up_events')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sort_order = (last?.sort_order ?? 0) + 1

  const { data, error } = await supabaseAdmin
    .from('lead_up_events')
    .insert([{
      title: body.title,
      description: body.description || null,
      event_date: body.event_date || null,
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      location: body.location || null,
      link: body.link || null,
      host: body.host || null,
      image_url: body.image_url || null,
      visible: body.visible ?? true,
      sort_order,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}
