import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { weekdayFromISO } from '@/lib/shift-hours'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  // Direct passthrough fields. Capacity is NOT here — it's normalized against
  // participation_type below (only shifts carry one).
  const allowed = ['day','time','title','subtitle','detail_desc','icon_type','sort_order','visible','highlight','is_recurring','participation_type','shift_type_id','requires_ack','event_date','start_time','end_time','needs_lead','recurrence_days','show_on_schedule']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  // `day` derives from the real date whenever one is set (wrong-weekday-proof).
  if ('event_date' in body) {
    const derived = weekdayFromISO(body.event_date)
    if (derived) updates.day = derived
  }
  // Recurrence days only make sense on recurring events.
  if ('is_recurring' in body && !body.is_recurring) updates.recurrence_days = null

  // Normalize the shift-only fields whenever participation/type/capacity is
  // touched, using the incoming value where present, else the row's current value.
  if ('participation_type' in body || 'shift_type_id' in body || 'capacity' in body) {
    const { data: existing } = await supabaseAdmin
      .from('schedule_events').select('participation_type, shift_type_id, capacity').eq('id', params.id).single()
    const pType = 'participation_type' in body ? body.participation_type : existing?.participation_type ?? 'general'
    const stId = 'shift_type_id' in body ? body.shift_type_id : existing?.shift_type_id ?? null
    const cap = 'capacity' in body ? body.capacity : existing?.capacity ?? null
    // Keep shift_type_id/requires_ack/capacity consistent with participation_type.
    updates.shift_type_id = pType === 'shift' ? stId : null
    if (pType !== 'mandatory') updates.requires_ack = false
    updates.capacity = pType === 'shift' ? cap : null
  }

  const { data, error } = await supabaseAdmin
    .from('schedule_events')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Removing a night from a recurring event must also remove that night's
  // signups — member_shift_signups rows are occurrence_date-keyed and the
  // ON DELETE CASCADE only covers whole-event deletes, so a trimmed night
  // would otherwise keep phantom signups (counted by hours/rosters/reminders)
  // for a night that no longer exists. Only runs when the saved row holds a
  // materialised day subset; going back to "every day" (NULL) removes nothing.
  // The admin UI confirms the count before sending this PATCH.
  if ('recurrence_days' in body && data?.is_recurring && Array.isArray(data.recurrence_days) && data.recurrence_days.length > 0) {
    const keep = new Set<string>(data.recurrence_days)
    const { data: signups, error: signupsError } = await supabaseAdmin
      .from('member_shift_signups')
      .select('id, occurrence_date')
      .eq('schedule_event_id', params.id)
    if (signupsError) {
      return NextResponse.json({ error: `The event was saved, but checking the removed nights' signups failed: ${signupsError.message}. Re-save to retry.` }, { status: 500 })
    }
    const staleIds = (signups ?? [])
      .filter(s => s.occurrence_date && !keep.has(s.occurrence_date))
      .map(s => s.id)
    if (staleIds.length > 0) {
      const { error: cleanupError } = await supabaseAdmin
        .from('member_shift_signups')
        .delete()
        .in('id', staleIds)
      if (cleanupError) {
        return NextResponse.json({ error: `The event was saved, but deleting the removed nights' ${staleIds.length} signup(s) failed: ${cleanupError.message}. Re-save to retry.` }, { status: 500 })
      }
    }
  }

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
