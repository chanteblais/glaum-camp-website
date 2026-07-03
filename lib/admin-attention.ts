import { supabaseAdmin } from './supabase'

// Data behind the admin console's "Needs attention" digest (A1) and the
// days-to-camp runway strip (A2) — see docs/admin-ux-handoff.md. Derived
// entirely from existing tables; no new config.

export type AttentionItem = {
  id: string
  text: string   // "12 applications await review"
  verb: string   // "Review"
  href: string   // deep link into the console
}

export type RunwayMilestone = {
  label: string
  dateLabel: string // "Jul 5"
  href: string
}

export type AdminRunway = {
  daysToCamp: number | null
  milestones: RunwayMilestone[]
}

const todayLocal = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

const shortDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// Whole days from today until an ISO date (noon-anchored to dodge DST edges).
const daysUntil = (iso: string) =>
  Math.round((Date.parse(iso + 'T12:00:00') - Date.parse(todayLocal() + 'T12:00:00')) / 86_400_000)

// At most five prioritized, actionable lines. Every line names work and links
// to where it's done. Order = review queues first, then time-sensitive comms.
export async function getAttentionItems(): Promise<AttentionItem[]> {
  const [apps, vols, roleReqs, roleSuggs, { data: gatherings }, { data: leadShifts }, { data: shiftHolds }, { data: legacyHolds }] = await Promise.all([
    supabaseAdmin.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('volunteers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('camp_signups').select('clerk_user_id', { count: 'exact', head: true }).eq('role_approval_status', 'pending'),
    supabaseAdmin.from('role_suggestions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin
      .from('lead_up_events')
      .select('id, title, event_date, visible, notified_at')
      .eq('visible', true)
      .gte('event_date', todayLocal())
      .order('event_date', { ascending: true }),
    // Full-but-leadless shifts: the organizer opted the shift into having a
    // lead (049), every seat is taken, and nobody holds the ✦ — the one state
    // members can no longer notice at signup time, so it's flagged here.
    supabaseAdmin
      .from('schedule_events')
      .select('id, title, capacity, event_date')
      .eq('participation_type', 'shift')
      .eq('visible', true)
      .eq('needs_lead', true)
      .gt('capacity', 0)
      .or(`event_date.is.null,event_date.gte.${todayLocal()}`),
    supabaseAdmin.from('member_shift_signups').select('clerk_user_id, schedule_event_id, role'),
    supabaseAdmin.from('camp_signups').select('clerk_user_id, schedule_event_id').not('schedule_event_id', 'is', null),
  ])

  const items: AttentionItem[] = []
  const n = (c: number | null | undefined) => c ?? 0

  if (n(apps.count) > 0) items.push({
    id: 'applications',
    text: `${apps.count} application${apps.count === 1 ? '' : 's'} await${apps.count === 1 ? 's' : ''} review`,
    verb: 'Review', href: '/admin#people',
  })
  if (n(vols.count) > 0) items.push({
    id: 'volunteers',
    text: `${vols.count} volunteer signup${vols.count === 1 ? '' : 's'} pending`,
    verb: 'Review', href: '/admin#people',
  })
  if (n(roleReqs.count) > 0) items.push({
    id: 'role-requests',
    text: `${roleReqs.count} role request${roleReqs.count === 1 ? '' : 's'} await${roleReqs.count === 1 ? 's' : ''} an answer`,
    verb: 'Answer', href: '/admin#people',
  })
  if (n(roleSuggs.count) > 0) items.push({
    id: 'role-suggestions',
    text: `${roleSuggs.count} role suggestion${roleSuggs.count === 1 ? '' : 's'} from members`,
    verb: 'Answer', href: '/admin#people',
  })

  const unnotified = (gatherings ?? []).find(g => !g.notified_at)
  if (unnotified) items.push({
    id: `notify-${unnotified.id}`,
    text: `“${unnotified.title}” (${unnotified.event_date ? shortDate(unnotified.event_date) : 'undated'}) hasn't been announced`,
    verb: 'Notify', href: '/admin#program',
  })

  // Holds = member_shift_signups ∪ legacy camp_signups.schedule_event_id,
  // deduped per (member, event); leads exist only on the new table. Mirrors
  // fetchAllHolds in app/api/shift-signups/route.ts so "full" agrees with the
  // member-facing counts.
  const holdsByEvent = new Map<string, Set<string>>()
  const leadEvents = new Set<string>()
  for (const r of [...(shiftHolds ?? []), ...(legacyHolds ?? [])]) {
    if (!r.schedule_event_id) continue
    const set = holdsByEvent.get(r.schedule_event_id) ?? new Set<string>()
    set.add(r.clerk_user_id)
    holdsByEvent.set(r.schedule_event_id, set)
    if ('role' in r && r.role === 'lead') leadEvents.add(r.schedule_event_id)
  }
  const leadless = (leadShifts ?? []).filter(s =>
    !leadEvents.has(s.id) && (holdsByEvent.get(s.id)?.size ?? 0) >= (s.capacity as number)
  )
  if (leadless.length === 1) items.push({
    id: `leadless-${leadless[0].id}`,
    text: `“${leadless[0].title}” is fully signed up but has no lead ✦`,
    verb: 'Assign', href: '/admin#program',
  })
  else if (leadless.length > 1) items.push({
    id: 'leadless-shifts',
    text: `${leadless.length} shifts are fully signed up but have no lead ✦`,
    verb: 'Assign', href: '/admin#program',
  })

  return items.slice(0, 5)
}

// The thin always-visible strip under the admin tabs: days to camp + the next
// couple of dated milestones on the runway.
export async function getAdminRunway(): Promise<AdminRunway> {
  const [{ data: cfgRows }, { data: gatherings }] = await Promise.all([
    supabaseAdmin
      .from('page_content')
      .select('key, value')
      .in('key', ['config_event_start_date']),
    supabaseAdmin
      .from('lead_up_events')
      .select('title, event_date')
      .eq('visible', true)
      .gte('event_date', todayLocal())
      .order('event_date', { ascending: true })
      .limit(2),
  ])

  const start = (cfgRows ?? []).find(r => r.key === 'config_event_start_date')?.value || null
  const daysToCamp = start ? Math.max(0, daysUntil(start)) : null

  const milestones: RunwayMilestone[] = (gatherings ?? [])
    .filter(g => g.event_date)
    .map(g => ({ label: g.title as string, dateLabel: shortDate(g.event_date as string), href: '/admin#program' }))
  if (start) milestones.push({ label: 'Camp begins', dateLabel: shortDate(start), href: '/admin#program' })

  return { daysToCamp, milestones: milestones.slice(0, 3) }
}
