import { supabaseAdmin } from './supabase'
import { memberDisplayNames } from './member-names'
import type { ScheduleEvent, ShiftTypeOption, RosterEntry } from '@/app/admin/ScheduleManager'
import type { LeadUpEvent } from '@/app/admin/LeadUpGatheringsManager'
import type { ResourceList, StewardOptions } from '@/app/admin/ResourcesManager'

// Server-side assembly for the Program tab's managers. Each function is the
// single source for one admin GET's response body: /admin/program calls them
// directly (so the tab is populated on first paint, no mount-fetch wave) and
// the /api/admin/* routes keep serving the client's refresh path from the
// same code — the "Server-rendered section data" pattern in
// docs/architecture.md → Auth.

export type { RosterEntry }

export async function getAdminScheduleEvents(): Promise<ScheduleEvent[]> {
  const { data, error } = await supabaseAdmin
    .from('schedule_events')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ScheduleEvent[]
}

export type ShiftTypeRow = ShiftTypeOption & { icon: string | null; sort_order: number }

export async function getAdminShiftTypes(): Promise<ShiftTypeRow[]> {
  const { data, error } = await supabaseAdmin
    .from('shift_types')
    .select('id, name, icon, sort_order')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ShiftTypeRow[]
}

// Who holds each shift, for the admin schedule editor's per-event roster.
// Holds = member_shift_signups (carries the lead role) ∪ the legacy
// camp_signups.schedule_event_id (members only), deduped per (member, event) —
// the same union as fetchAllHolds in app/api/shift-signups/route.ts, so the
// admin count always agrees with the member-facing "N signed up".
// legacy_only marks holds with no member_shift_signups row: set_shift_role
// (PATCH /api/admin/signups/[userId]) can't promote those.
export async function getAdminRosters(): Promise<Record<string, RosterEntry[]>> {
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
  return rosters
}

// All lead-up gatherings with their RSVP headcounts (admin view).
export async function getAdminLeadUpEvents(): Promise<LeadUpEvent[]> {
  const [{ data, error }, { data: rsvps }] = await Promise.all([
    supabaseAdmin
      .from('lead_up_events')
      .select('*')
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true }),
    supabaseAdmin.from('lead_up_event_rsvps').select('lead_up_event_id'),
  ])
  if (error) throw new Error(error.message)

  const counts: Record<string, number> = {}
  for (const r of rsvps ?? []) {
    counts[r.lead_up_event_id] = (counts[r.lead_up_event_id] ?? 0) + 1
  }
  return (data ?? []).map(e => ({ ...e, rsvp_count: counts[e.id] ?? 0 })) as LeadUpEvent[]
}

// Full admin resources view: every list (visible or not) with its items, and
// per-item claims carrying display names — the organizer always sees who to chase.
export async function getAdminResourceLists(): Promise<ResourceList[]> {
  const [{ data: lists, error }, { data: items }, { data: claims }] = await Promise.all([
    supabaseAdmin
      .from('resource_lists')
      .select('id, title, description, group_id, department_id, role_id, visible, sort_order, groups(name), departments(name), roles(name)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('resources')
      .select('id, list_id, name, note, quantity_needed, offered_by, icon, sort_order')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('resource_claims')
      .select('resource_id, clerk_user_id, quantity'),
  ])
  if (error) throw new Error(error.message)

  const names = await memberDisplayNames([
    ...(claims ?? []).map(c => c.clerk_user_id),
    ...(items ?? []).map(i => i.offered_by).filter(Boolean) as string[],
  ])

  const claimsByResource: Record<string, { name: string; quantity: number }[]> = {}
  for (const c of claims ?? []) {
    ;(claimsByResource[c.resource_id] ??= []).push({
      name: names[c.clerk_user_id] ?? 'Unknown member',
      quantity: c.quantity,
    })
  }

  const itemsByList: Record<string, unknown[]> = {}
  for (const it of items ?? []) {
    const itemClaims = claimsByResource[it.id] ?? []
    ;(itemsByList[it.list_id] ??= []).push({
      ...it,
      // NULL quantity_needed = open member offer (migration 053).
      offered_by_name: it.offered_by ? names[it.offered_by] ?? 'Unknown member' : null,
      claimed: itemClaims.reduce((s, c) => s + c.quantity, 0),
      claimants: itemClaims,
    })
  }

  // Supabase types the embeds as arrays; runtime returns a single row for a to-one FK.
  type NameEmbed = { name: string } | { name: string }[] | null
  const embedName = (e: NameEmbed) => (Array.isArray(e) ? e[0]?.name : e?.name) ?? null
  type ListRow = { id: string; title: string; description: string | null; group_id: string | null; department_id: string | null; role_id: string | null; visible: boolean; sort_order: number; groups: NameEmbed; departments: NameEmbed; roles: NameEmbed }
  return ((lists ?? []) as unknown as ListRow[]).map(l => ({
    id: l.id, title: l.title, description: l.description,
    group_id: l.group_id, department_id: l.department_id, role_id: l.role_id,
    visible: l.visible, sort_order: l.sort_order,
    // The steward is display context only; at most one FK is set (migration 052).
    steward_name: embedName(l.groups) ?? embedName(l.departments) ?? embedName(l.roles),
    items: itemsByList[l.id] ?? [],
  })) as ResourceList[]
}

// The steward dropdown's option pools (at most one steward per list — migration 052).
export async function getStewardOptions(): Promise<StewardOptions> {
  const [{ data: groups }, { data: departments }, { data: roles }] = await Promise.all([
    supabaseAdmin.from('groups').select('id, name').order('sort_order', { ascending: true }),
    supabaseAdmin.from('departments').select('id, name').order('sort_order', { ascending: true }),
    supabaseAdmin.from('roles').select('id, name, department_id').order('sort_order', { ascending: true }),
  ])
  const deptName = Object.fromEntries((departments ?? []).map(d => [d.id as string, d.name as string]))
  return {
    groups: (groups ?? []).map(g => ({ id: g.id as string, name: g.name as string })),
    departments: (departments ?? []).map(d => ({ id: d.id as string, name: d.name as string })),
    roles: (roles ?? []).map(r => ({
      id: r.id as string,
      name: r.name as string,
      department_name: r.department_id ? deptName[r.department_id] ?? null : null,
    })),
  }
}
