import { supabaseAdmin } from './supabase'

// clerk_user_id → a schedule_event_id they hold (or null if they have a signup
// row but no shift). Union of the many-to-many `member_shift_signups` table and
// the legacy `camp_signups` single column — a member counts as holding a shift
// if at least one row in either table carries an event. Shared by the Manage
// and Overview admin pages so "has a shift" means the same thing on both.
export async function getShiftEventByUser(): Promise<Record<string, string | null>> {
  const [{ data: signupsRaw }, { data: multiSignupsRaw }] = await Promise.all([
    supabaseAdmin.from('camp_signups').select('clerk_user_id, schedule_event_id'),
    supabaseAdmin.from('member_shift_signups').select('clerk_user_id, schedule_event_id'),
  ])
  const map: Record<string, string | null> = Object.fromEntries(
    (signupsRaw ?? []).map(s => [s.clerk_user_id, s.schedule_event_id ?? null])
  )
  for (const s of multiSignupsRaw ?? []) {
    if (s.schedule_event_id) map[s.clerk_user_id] = s.schedule_event_id
  }
  return map
}

export type ShiftHoldRow = { clerk_user_id: string; schedule_event_id: string; occurrence_date: string | null; role: string | null }
export type LegacyShiftHoldRow = { clerk_user_id: string; schedule_event_id: string }

// Raw hold rows from both signup tables — the same two queries the admin
// Overview (shift-hours ledger) and Manage (per-shift roster) each used to run
// separately. Callers build their own grouping on top (occurrence maps, role
// display, etc.); this just guarantees the query + the "which rows count as a
// hold" filter (camp_signups rows with no event don't) are defined once.
export async function fetchShiftHolds(): Promise<{ many: ShiftHoldRow[]; legacy: LegacyShiftHoldRow[] }> {
  const [{ data: many }, { data: legacy }] = await Promise.all([
    supabaseAdmin.from('member_shift_signups').select('clerk_user_id, schedule_event_id, occurrence_date, role'),
    supabaseAdmin.from('camp_signups').select('clerk_user_id, schedule_event_id').not('schedule_event_id', 'is', null),
  ])
  return {
    many: (many ?? []) as ShiftHoldRow[],
    legacy: (legacy ?? []) as LegacyShiftHoldRow[],
  }
}
