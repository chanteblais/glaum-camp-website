import { supabaseAdmin } from './supabase'
import type { MemberRecord } from './members'

// Member suspension (migration 063) — shared by the self-serve route
// (/api/profile/suspend) and the admin route (/api/admin/[id]/suspend).
//
// Suspending releases the member's group + shift commitments (the same rows
// the cancel/remove flows clear) but leaves status, role and everything else
// untouched: a suspended member still sees the whole site, they just hold no
// commitments and the join endpoints refuse new ones. Lifting the suspension
// does NOT restore what was released — the member re-joins what still fits.

export type SuspensionResult = { groupsRemoved: number; shiftsRemoved: number }

export async function suspendMember(
  member: MemberRecord,
  byClerkId: string,
  note?: string,
): Promise<SuspensionResult> {
  // Mark first — if a release below fails, the member is still safely
  // suspended and the join gates already hold.
  const { error } = await supabaseAdmin
    .from('members')
    .update({
      suspended_at: new Date().toISOString(),
      suspended_by: byClerkId,
      suspension_note: note?.trim() || null,
    })
    .eq('id', member.id)
  if (error) throw new Error(error.message)

  // Commitments are keyed by clerk_user_id; a never-signed-in member holds none.
  if (!member.clerk_user_id) return { groupsRemoved: 0, shiftsRemoved: 0 }

  const [groups, shifts] = await Promise.all([
    // Leaving a group also leaves its message thread (group_members is the
    // source of truth for thread access — see docs/group-messaging.md).
    supabaseAdmin
      .from('group_members')
      .delete({ count: 'exact' })
      .eq('clerk_user_id', member.clerk_user_id),
    supabaseAdmin
      .from('member_shift_signups')
      .delete({ count: 'exact' })
      .eq('clerk_user_id', member.clerk_user_id),
    // Legacy single-shift pointer (pre-redesign): clear the shift, keep the
    // role — suspension releases commitments, it never touches the role.
    supabaseAdmin
      .from('camp_signups')
      .update({ schedule_event_id: null })
      .eq('clerk_user_id', member.clerk_user_id)
      .not('schedule_event_id', 'is', null),
  ])
  return { groupsRemoved: groups.count ?? 0, shiftsRemoved: shifts.count ?? 0 }
}

export async function liftSuspension(member: MemberRecord): Promise<void> {
  const { error } = await supabaseAdmin
    .from('members')
    .update({ suspended_at: null, suspended_by: null, suspension_note: null })
    .eq('id', member.id)
  if (error) throw new Error(error.message)
}
