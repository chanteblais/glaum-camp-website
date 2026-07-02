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
  const [apps, vols, roleReqs, roleSuggs, { data: gatherings }] = await Promise.all([
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
