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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  // Direct passthrough fields. Legacy contribution_type / event_type / capacity are
  // NOT here — they're derived from participation_type + shift_type_id (see
  // lib/event-type-compat.ts).
  const allowed = ['day','time','title','subtitle','detail_desc','icon_type','sort_order','visible','highlight','is_recurring','participation_type','shift_type_id','requires_ack','event_date','event_category','start_time','end_time']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  // Non-shift events never carry shift times.
  if ('participation_type' in body && body.participation_type !== 'shift') {
    updates.start_time = null
    updates.end_time = null
  }
  // `day` derives from the real date whenever one is set (wrong-weekday-proof).
  if ('event_date' in body) {
    const derived = weekdayFromISO(body.event_date)
    if (derived) updates.day = derived
  }

  // Re-derive the legacy columns whenever participation/type/capacity is touched,
  // using the incoming value where present, else the row's current value.
  if ('participation_type' in body || 'shift_type_id' in body || 'capacity' in body) {
    const { data: existing } = await supabaseAdmin
      .from('schedule_events').select('participation_type, shift_type_id, capacity').eq('id', params.id).single()
    const pType = 'participation_type' in body ? body.participation_type : existing?.participation_type ?? 'general'
    const stId = 'shift_type_id' in body ? body.shift_type_id : existing?.shift_type_id ?? null
    const cap = 'capacity' in body ? body.capacity : existing?.capacity ?? null
    // Keep shift_type_id/requires_ack consistent with participation_type.
    const effShiftType = pType === 'shift' ? stId : null
    updates.shift_type_id = effShiftType
    if (pType !== 'mandatory') updates.requires_ack = false
    const legacy = await deriveLegacyColumns(supabaseAdmin, pType, effShiftType, cap)
    updates.contribution_type = legacy.contribution_type
    updates.event_type = legacy.event_type
    updates.capacity = legacy.capacity
  }

  const { data, error } = await supabaseAdmin
    .from('schedule_events')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('schedule_events')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
