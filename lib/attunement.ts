import { parseAttunementTasks } from '@/lib/site-config'
import type { MemberGroup } from '@/lib/groups'
import type { DerivedShiftRequirement } from '@/lib/shift-attunement'

// One item in the member attunement checklist, as consumed by AttunementStatus
// (profile) and the home dashboard banner.
export type AttunementChecklistItem = {
  id: string
  label: string
  done: boolean
  href?: string
  section?: 'photo' | 'contribution'
}

// The member's current state, derived from their application + camp signup.
export type AttunementState = {
  hasPhoto: boolean
  // Member's group-membership counts: per collection id, and the total across
  // all collections (drives 'collection' requirement tasks).
  groupCountsByCollection: Record<string, number>
  totalGroupCount: number
  roleDone: boolean
  hasShift: boolean
  shiftSignupOpen: boolean
  // Shift-hours state (lib/shift-attunement.ts getMemberShiftState):
  //   hoursByShiftType — summed durations of the member's held shifts, per type
  //   derivedShiftRequirements — obligations from their groups/roles (extra lines)
  hoursByShiftType: Record<string, number>
  derivedShiftRequirements: DerivedShiftRequirement[]
}

// Reduce a member's groups into the counts the attunement checklist needs.
// Shared by the home dashboard and profile so both derive identical state.
export function memberGroupCounts(memberGroups: MemberGroup[]): {
  groupCountsByCollection: Record<string, number>
  totalGroupCount: number
} {
  const groupCountsByCollection: Record<string, number> = {}
  for (const g of memberGroups) {
    if (g.collectionId) {
      groupCountsByCollection[g.collectionId] = (groupCountsByCollection[g.collectionId] ?? 0) + 1
    }
  }
  return { groupCountsByCollection, totalGroupCount: memberGroups.length }
}

// Single source of truth for the attunement checklist, shared by the home
// dashboard banner (app/page.tsx) and the profile checklist (app/profile/page.tsx).
// Both pages MUST build the list from here so their counts stay in sync.
// Honours each task's `enabled` flag and drops the shift task while shift signup
// is closed (it can't be completed yet).
export function buildAttunementChecklist(
  configJson: string | null | undefined,
  state: AttunementState,
): AttunementChecklistItem[] {
  const authored = parseAttunementTasks(configJson)
    .filter(t => t.enabled && (t.requirement !== 'shift' || state.shiftSignupOpen))
    .map(t => {
      switch (t.requirement) {
        case 'photo':      return { id: t.id, label: t.label, done: state.hasPhoto, section: 'photo' as const }
        case 'collection': {
          const need = t.requiredCount ?? 1
          const have = t.collectionId
            ? (state.groupCountsByCollection[t.collectionId] ?? 0)
            : state.totalGroupCount
          return { id: t.id, label: t.label, done: have >= need, href: '/signup' }
        }
        case 'role':       return { id: t.id, label: t.label, done: state.roleDone, href: '/signup' }
        case 'shift': {
          // "Any shift" (no type) keeps the legacy boolean — one signup counts,
          // regardless of whether that shift's start/end times are set yet.
          if (!t.shiftTypeId) return { id: t.id, label: t.label, done: state.hasShift, href: '/signup' }
          // Typed task = the universal hours requirement: sum the member's held
          // hours in that shift type against the task's required hours.
          const need = t.requiredHours ?? 1
          const have = state.hoursByShiftType[t.shiftTypeId] ?? 0
          return { id: t.id, label: `${t.label} — ${have}/${need}h`, done: have >= need, href: '/signup' }
        }
        case 'approved':
        default:           return { id: t.id, label: t.label, done: true }
      }
    })

  // Derived obligations from the member's groups/roles (conditional requirements).
  // These aren't authored tasks — they appear because of what the member joined,
  // and disappear if they leave. Gated on shift signup being open, like the
  // authored shift tasks.
  const derived: AttunementChecklistItem[] = state.shiftSignupOpen
    ? state.derivedShiftRequirements.map(r => {
        const have = state.hoursByShiftType[r.shiftTypeId] ?? 0
        return { id: r.id, label: `${r.label} — ${have}/${r.requiredHours}h`, done: have >= r.requiredHours, href: '/signup' }
      })
    : []

  return [...authored, ...derived]
}
