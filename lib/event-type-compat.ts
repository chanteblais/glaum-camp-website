import type { SupabaseClient } from '@supabase/supabase-js'

// ── Transition compat (shifts redesign) ───────────────────────────────────────
// The admin schedule editor now tags each event with a participation type
// (general | shift | mandatory) and, for shifts, a shift_type_id. The member-facing
// readers (PersonalSchedule, the /signup grid) still read the legacy
// `contribution_type` / `event_type` / `capacity` columns until the member side is
// migrated. To keep the live member schedule working, the admin write path DERIVES
// those legacy columns from the chosen participation type. This shim is removed in
// the final cleanup migration once the readers no longer touch the legacy columns.

export type LegacyScheduleColumns = {
  contribution_type: string | null
  event_type: string | null
  capacity: number | null
}

// Given the participation type + shift type + admin-entered capacity, produce the
// legacy columns the member readers still expect:
//   · shift     → contribution_type = the shift type's name (PersonalSchedule shows
//                 the event to members whose contributions include it); capacity kept
//   · mandatory → event_type = 'all_hands' (shown to everyone)
//   · general   → all null
export async function deriveLegacyColumns(
  db: SupabaseClient,
  participationType: string | null,
  shiftTypeId: string | null,
  requestedCapacity: number | null,
): Promise<LegacyScheduleColumns> {
  if (participationType === 'mandatory') {
    return { contribution_type: null, event_type: 'all_hands', capacity: null }
  }

  if (participationType === 'shift' && shiftTypeId) {
    const { data: st } = await db.from('shift_types').select('name').eq('id', shiftTypeId).single()
    return { contribution_type: st?.name ?? null, event_type: null, capacity: requestedCapacity }
  }

  // general (or shift with no type chosen yet)
  return { contribution_type: null, event_type: null, capacity: null }
}
