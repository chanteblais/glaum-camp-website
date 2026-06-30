// Shared category definitions for the Manage (/admin) and Configure
// (/admin/configure) pages. Each page's in-page category headings and the
// AdminNav jump-links read from these lists so labels and anchor ids stay in sync.

export type AdminCategory = {
  id: string
  label: string
}

// Manage — operate on people and live activity.
export const MANAGE_CATEGORIES: AdminCategory[] = [
  { id: 'people', label: 'People' },
  { id: 'groups', label: 'Groups' },
  { id: 'program', label: 'Program' },
  { id: 'communication', label: 'Communication' },
]

// Configure — define the standalone structures the rest of the app reads from.
export const CONFIGURE_CATEGORIES: AdminCategory[] = [
  { id: 'forms', label: 'Forms & Fields' },
  { id: 'recognition', label: 'Recognition & Tasks' },
  { id: 'structure', label: 'Structure' },
  { id: 'system', label: 'Access & System' },
]

const ALL = [...MANAGE_CATEGORIES, ...CONFIGURE_CATEGORIES]

export const catLabel = (id: string) => ALL.find(c => c.id === id)?.label ?? id
