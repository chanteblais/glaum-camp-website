// ── Camp dues ────────────────────────────────────────────────────────────────
// Member-facing payment info for camp dues, shown on /dues and configured in
// Admin → Community → Camp Dues. Stored as JSON in page_content key
// "config_dues". Per-member paid state lives on members.dues_paid_at (migration
// 065); this config only describes HOW to pay, not WHO has paid.
//
// This year dues are collected manually (by email / e-transfer). Amounts are
// free text so the organizer controls currency + formatting (no currency
// assumption baked in) — a Stripe integration is a future TODO.

export type DuesMode = 'fixed' | 'sliding'

// Which populations owe dues (migration 067). Camp members get the full flow
// (self-report + attunement + tracker); volunteers are admin-tracked only (they
// have no self-serve dues surface). Default: members only.
export type DuesAudience = {
  members: boolean
  volunteers: boolean
}

export type DuesConfig = {
  // Master switch — when false, dues are off everywhere (no attunement task,
  // no /dues, no tracker). Default true so existing configs keep collecting.
  enabled: boolean
  // Who owes dues.
  audience: DuesAudience
  // Where members send payment (e-transfer / PayPal email, etc.). '' = unset.
  paymentEmail: string
  // 'fixed' = one set amount; 'sliding' = a pay-what-you-can range.
  mode: DuesMode
  // Fixed mode: the single amount, free text (e.g. "$50").
  amount: string
  // Sliding mode: the low + high ends of the suggested range (free text).
  minAmount: string
  maxAmount: string
  // How-to-pay blurb, rendered markdown-lite on /dues (reference to include,
  // deadline, sliding-scale guidance, etc.).
  instructions: string
}

export const DEFAULT_DUES_CONFIG: DuesConfig = {
  // Off by default — dues must be deliberately turned on per community.
  enabled: false,
  audience: { members: true, volunteers: false },
  paymentEmail: '',
  mode: 'fixed',
  amount: '',
  minAmount: '',
  maxAmount: '',
  instructions: '',
}

export function parseDuesConfig(raw?: string | null): DuesConfig {
  if (!raw) return DEFAULT_DUES_CONFIG
  try {
    const o = JSON.parse(raw)
    if (!o || typeof o !== 'object') return DEFAULT_DUES_CONFIG
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    const aud = (o.audience && typeof o.audience === 'object') ? o.audience : {}
    return {
      // Off unless explicitly turned on — dues start off and are enabled by hand.
      enabled: o.enabled === true,
      audience: {
        members: aud.members !== false,       // default true
        volunteers: aud.volunteers === true,  // default false
      },
      paymentEmail: str(o.paymentEmail).trim(),
      mode: o.mode === 'sliding' ? 'sliding' : 'fixed',
      amount: str(o.amount).trim(),
      minAmount: str(o.minAmount).trim(),
      maxAmount: str(o.maxAmount).trim(),
      instructions: str(o.instructions),
    }
  } catch {
    return DEFAULT_DUES_CONFIG
  }
}

// Dues are live for a population only when the feature is on AND that audience
// is selected. Members get the full flow; volunteers are admin-tracked only.
export const duesAppliesToMembers = (c: DuesConfig): boolean => c.enabled && c.audience.members
export const duesAppliesToVolunteers = (c: DuesConfig): boolean => c.enabled && c.audience.volunteers

// A human-readable amount for display, or null when nothing is configured yet.
// Fixed → the amount; sliding → "min–max" (or whichever end is set).
export function formatDuesAmount(cfg: DuesConfig): string | null {
  if (cfg.mode === 'sliding') {
    const { minAmount: lo, maxAmount: hi } = cfg
    if (lo && hi) return `${lo}–${hi}`
    if (lo) return `${lo}+`
    if (hi) return `up to ${hi}`
    return null
  }
  return cfg.amount || null
}

// True once the config carries enough to show members something actionable
// (somewhere to pay, an amount, or instructions).
export function duesConfigReady(cfg: DuesConfig): boolean {
  return !!(cfg.paymentEmail || formatDuesAmount(cfg) || cfg.instructions.trim())
}
