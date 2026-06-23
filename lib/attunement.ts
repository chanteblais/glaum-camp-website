import { parseAttunementTasks } from '@/lib/site-config'

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
  hasContribution: boolean
  roleDone: boolean
  hasShift: boolean
  shiftSignupOpen: boolean
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
  return parseAttunementTasks(configJson)
    .filter(t => t.enabled && (t.requirement !== 'shift' || state.shiftSignupOpen))
    .map(t => {
      switch (t.requirement) {
        case 'photo':        return { id: t.id, label: t.label, done: state.hasPhoto, section: 'photo' as const }
        case 'contribution': return { id: t.id, label: t.label, done: state.hasContribution }
        case 'role':         return { id: t.id, label: t.label, done: state.roleDone, href: '/signup' }
        case 'shift':        return { id: t.id, label: t.label, done: state.hasShift, href: '/signup' }
        case 'approved':
        default:             return { id: t.id, label: t.label, done: true }
      }
    })
}
