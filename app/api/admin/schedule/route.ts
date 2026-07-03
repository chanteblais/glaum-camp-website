import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { deriveLegacyColumns } from '@/lib/event-type-compat'
import { weekdayFromISO } from '@/lib/shift-hours'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.publicMetadata?.role === 'admin' ? userId : null
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('schedule_events')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  // Place new event at the end of its group
  const { data: last } = await supabaseAdmin
    .from('schedule_events')
    .select('sort_order')
    .eq('is_recurring', body.is_recurring ?? false)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sort_order = (last?.sort_order ?? 0) + 1

  const participation_type = body.participation_type ?? 'general'
  const shift_type_id = participation_type === 'shift' ? (body.shift_type_id ?? null) : null

  // Legacy contribution_type / event_type / capacity are derived from the chosen
  // participation type, not set by hand (see lib/event-type-compat.ts).
  const legacy = await deriveLegacyColumns(supabaseAdmin, participation_type, shift_type_id, body.capacity ?? null)

  const { data, error } = await supabaseAdmin
    .from('schedule_events')
    .insert([{
      // `day` derives from the real date when one is set (wrong-weekday-proof).
      day: weekdayFromISO(body.event_date) ?? body.day ?? '',
      time: body.time,
      title: body.title,
      subtitle: body.subtitle || null,
      detail_desc: body.detail_desc || null,
      icon_type: body.icon_type || 'star',
      sort_order,
      visible: body.visible ?? true,
      highlight: body.highlight ?? false,
      is_recurring: body.is_recurring ?? false,
      // Recurring only: NULL = every day; an array of ISO dates = those days.
      recurrence_days: body.is_recurring ? (body.recurrence_days ?? null) : null,
      participation_type,
      shift_type_id,
      // Every event carries structured times (not just shifts) — the display
      // `time` string is derived from them client-side.
      start_time: body.start_time ?? null,
      end_time: body.end_time ?? null,
      requires_ack: participation_type === 'mandatory' ? (body.requires_ack ?? false) : false,
      event_date: body.event_date ?? null,
      event_category: body.event_category ?? 'at_camp',
      // Lead roles only make sense on signable shifts (049).
      needs_lead: participation_type === 'shift' ? (body.needs_lead ?? false) : false,
      ...legacy,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}
