// Shared category definitions for the Community (/admin), Program
// (/admin/program), and Configure (/admin/configure) pages. Each page's
// in-page category headings and the AdminNav jump-links read from these
// lists so labels and anchor ids stay in sync.

export type AdminCategory = {
  id: string
  label: string
}

// Community — tend the community's shared life: its people, its voice, its
// logistics. (Formerly the "Members" tab. Logistics once held Shared Resources,
// which became member-owned on /participate 2026-07-08 and left the console;
// Camp Dues remains under Logistics.)
export const COMMUNITY_CATEGORIES: AdminCategory[] = [
  { id: 'people', label: 'People' },
  { id: 'communication', label: 'Communication' },
  { id: 'logistics', label: 'Logistics' },
]

// Program — the schedule and the runway of gatherings. These ids double as
// the anchors that admin-attention deep links target (/admin/program#schedule).
export const PROGRAM_CATEGORIES: AdminCategory[] = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'lead-up', label: 'Lead-Up Gatherings' },
]

// Configure — define the standalone structures the rest of the app reads from.
export const CONFIGURE_CATEGORIES: AdminCategory[] = [
  { id: 'forms', label: 'Forms & Fields' },
  { id: 'recognition', label: 'Recognition & Tasks' },
  { id: 'structure', label: 'Structure' },
  { id: 'system', label: 'Access & System' },
]

const ALL = [...COMMUNITY_CATEGORIES, ...PROGRAM_CATEGORIES, ...CONFIGURE_CATEGORIES]

export const catLabel = (id: string) => ALL.find(c => c.id === id)?.label ?? id
