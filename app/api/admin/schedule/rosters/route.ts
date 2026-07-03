import { NextResponse } from 'next/server'
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

// Who holds each shift, for the admin schedule editor's per-event roster.
// Holds = member_shift_signups (carries the lead role) ∪ the legacy
// camp_signups.schedule_event_id (members only), deduped per (member, event) —
// the same union as fetchAllHolds in app/api/shift-signups/route.ts, so the
// admin count always agrees with the member-facing "N signed up".
// legacy_only marks holds with no member_shift_signups row: set_shift_role
// (PATCH /api/admin/signups/[userId]) can't promote those.
export type RosterEntry = {
  clerk_user_id: string
  name: string
  role: 'member' | 'lead'
  legacy_only: boolean
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [{ data: many }, { data: legacy }] = await Promise.all([
    supabaseAdmin.from('member_shift_signups').select('clerk_user_id, schedule_event_id, role'),
    supabaseAdmin.from('camp_signups').select('clerk_user_id, schedule_event_id').not('schedule_event_id', 'is', null),
  ])

  type Hold = { role: 'member' | 'lead'; legacy_only: boolean }
  const byEvent = new Map<string, Map<string, Hold>>()
  const holdersFor = (eventId: string) => {
    const holders = byEvent.get(eventId) ?? new Map<string, Hold>()
    byEvent.set(eventId, holders)
    return holders
  }
  for (const r of many ?? []) {
    if (!r.schedule_event_id) continue
    holdersFor(r.schedule_event_id).set(r.clerk_user_id, { role: r.role === 'lead' ? 'lead' : 'member', legacy_only: false })
  }
  for (const r of legacy ?? []) {
    if (!r.schedule_event_id) continue
    const holders = holdersFor(r.schedule_event_id)
    if (!holders.has(r.clerk_user_id)) holders.set(r.clerk_user_id, { role: 'member', legacy_only: true })
  }

  const allIds = Array.from(byEvent.values()).flatMap(h => Array.from(h.keys()))
  const names = await memberDisplayNames(allIds)

  const rosters: Record<string, RosterEntry[]> = {}
  byEvent.forEach((holders, eventId) => {
    rosters[eventId] = Array.from(holders.entries())
      .map(([clerk_user_id, h]) => ({
        clerk_user_id,
        name: names[clerk_user_id] ?? 'Unknown member',
        role: h.role,
        legacy_only: h.legacy_only,
      }))
      // Leads first, then alphabetical — the ✦ reads at a glance.
      .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'lead' ? -1 : 1))
  })

  return NextResponse.json({ rosters })
}
