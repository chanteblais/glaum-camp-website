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
  // 'required'  — authored attunement tasks: the community's minimum expectation.
  //               Only these gate "Attuned".
  // 'commitment' — derived from groups/roles the member chose to join: shown as
  //               a guide to meeting what they signed up for, never a blocker.
  tier: 'required' | 'commitment'
}

// Split helpers so every consumer applies the same semantics.
export const requiredItems = (items: AttunementChecklistItem[]) =>
  items.filter(i => i.tier !== 'commitment')
export const commitmentItems = (items: AttunementChecklistItem[]) =>
  items.filter(i => i.tier === 'commitment')

// The member's current state, derived from their application + camp signup.
export type AttunementState = {
  hasPhoto: boolean
  // Camp dues (migration 067): true once an admin records the member paid.
  // Manual/email-collected this year, so it's admin-set rather than derived.
  duesPaid: boolean
  // The member self-reported paying (068), pending admin confirmation. Counts as
  // done for the checklist (they've done their part) — shown "awaiting
  // confirmation" — so they aren't nudged; an admin can revert if it never lands.
  duesReported: boolean
  // Whether camp dues are live for members (config_dues enabled + members
  // audience, 069). When off, any authored `dues` task is dropped from the list.
  duesActiveForMembers: boolean
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
  const tier = 'required' as const
  const authored = parseAttunementTasks(configJson)
    .filter(t => t.enabled
      && (t.requirement !== 'shift' || state.shiftSignupOpen)
      && (t.requirement !== 'dues' || state.duesActiveForMembers))
    .map(t => {
      switch (t.requirement) {
        case 'photo':      return { id: t.id, label: t.label, done: state.hasPhoto, section: 'photo' as const, tier }
        case 'dues': {
          // Confirmed paid, or self-reported and awaiting confirmation — both
          // count as done so a member who's paid isn't nagged while unreconciled.
          const done = state.duesPaid || state.duesReported
          const label = !state.duesPaid && state.duesReported ? `${t.label} · awaiting confirmation` : t.label
          return { id: t.id, label, done, href: '/dues', tier }
        }
        case 'collection': {
          const need = t.requiredCount ?? 1
          const have = t.collectionId
            ? (state.groupCountsByCollection[t.collectionId] ?? 0)
            : state.totalGroupCount
          return { id: t.id, label: t.label, done: have >= need, href: '/participate', tier }
        }
        case 'role':       return { id: t.id, label: t.label, done: state.roleDone, href: '/participate', tier }
        case 'shift': {
          // "Any shift" (no type) keeps the legacy boolean — one signup counts,
          // regardless of whether that shift's start/end times are set yet.
          if (!t.shiftTypeId) return { id: t.id, label: t.label, done: state.hasShift, href: '/participate', tier }
          // Typed task = the universal hours requirement: sum the member's held
          // hours in that shift type against the task's required hours.
          const need = t.requiredHours ?? 1
          const have = state.hoursByShiftType[t.shiftTypeId] ?? 0
          return { id: t.id, label: `${t.label} — ${have}/${need}h`, done: have >= need, href: '/participate', tier }
        }
        case 'approved':
        default:           return { id: t.id, label: t.label, done: true, tier }
      }
    })

  // Derived obligations from the member's groups/roles (conditional requirements).
  // These aren't authored tasks — they appear because of what the member joined,
  // and disappear if they leave. Gated on shift signup being open, like the
  // authored shift tasks. They are 'commitment' tier: a guide to what the member
  // signed up for, never a gate on "Attuned".
  const derived: AttunementChecklistItem[] = state.shiftSignupOpen
    ? state.derivedShiftRequirements.map(r => {
        const have = state.hoursByShiftType[r.shiftTypeId] ?? 0
        return { id: r.id, label: `${r.label} — ${have}/${r.requiredHours}h`, done: have >= r.requiredHours, href: '/participate', tier: 'commitment' as const }
      })
    : []

  return [...authored, ...derived]
}

// Hour totals behind the checklist, for the "minimum vs your commitments"
// summary: minimumHours = the community-wide expectation (authored shift-hours
// tasks); commitmentHours = extra hours the member took on by joining
// groups/roles that carry a requirement. Gated on shift signup like the list.
export function attunementHoursSummary(
  configJson: string | null | undefined,
  state: AttunementState,
): { minimumHours: number; commitmentHours: number } {
  if (!state.shiftSignupOpen) return { minimumHours: 0, commitmentHours: 0 }
  const minimumHours = parseAttunementTasks(configJson)
    .filter(t => t.enabled && t.requirement === 'shift' && t.shiftTypeId)
    .reduce((n, t) => n + (t.requiredHours ?? 1), 0)
  const commitmentHours = state.derivedShiftRequirements.reduce((n, r) => n + r.requiredHours, 0)
  return { minimumHours, commitmentHours }
}
