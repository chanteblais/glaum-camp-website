import { supabaseAdmin } from './supabase'

// clerk_user_id → a schedule_event_id they hold (any one of them). Reads
// member_shift_signups — the single source of shift holds since the legacy
// camp_signups column drop (migration 065). Shared by the Manage and Overview
// admin pages so "has a shift" means the same thing on both.
export async function getShiftEventByUser(): Promise<Record<string, string | null>> {
  const { data: multiSignupsRaw } = await supabaseAdmin
    .from('member_shift_signups')
    .select('clerk_user_id, schedule_event_id')
  const map: Record<string, string | null> = {}
  for (const s of multiSignupsRaw ?? []) {
    if (s.schedule_event_id) map[s.clerk_user_id] = s.schedule_event_id
  }
  return map
}
