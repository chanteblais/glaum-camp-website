// Schedule colour scheme (shifts redesign). Colours used to key off the legacy
// event_type text (all_hands / camp_tending / service); events now carry
// participation_type + shift_type_id instead, so:
//   · mandatory  → the old all-hands teal (fixed)
//   · shift      → a hue from SHIFT_HUES, assigned by the shift type's position
//                  in the Shift Types registry (sort order) — deterministic and
//                  name-agnostic, so any community's types get distinct colours.
//                  Per-type configurable colour can replace this index later.
//   · general    → a hue from GENERAL_HUES, hashed from the event id — stable
//                  across surfaces and disjoint from the shift palette, so a
//                  general event never impersonates a shift type.

export type Hue = { rgb: string; accent: string }

// Leads with the two hues the old scheme used for shift-ish events (ember
// orange = Camp Tending, rose pink = Service), then extends the family.
export const SHIFT_HUES: Hue[] = [
  { rgb: '240,90,20', accent: '#e6781e' },   // ember orange
  { rgb: '90,150,255', accent: '#6e9cff' },  // lake blue
  { rgb: '110,190,110', accent: '#7dcf8e' }, // moss green
  { rgb: '210,57,248', accent: '#D239F8' },  // glåüm magenta
  { rgb: '240,100,180', accent: '#f064b4' }, // rose pink
  { rgb: '200,168,72', accent: '#C8A848' },  // gold
]

export const MANDATORY_HUE: Hue = { rgb: '40,200,190', accent: '#28c8be' } // all-hands teal

export function shiftHue(index: number): Hue {
  const n = SHIFT_HUES.length
  return SHIFT_HUES[((index % n) + n) % n]
}

// shift_type_id → palette index, from the registry's display order.
export function shiftColorIndexMap(shiftTypes: { id: string }[]): Record<string, number> {
  const map: Record<string, number> = {}
  shiftTypes.forEach((t, i) => { map[t.id] = i })
  return map
}

// General events used to share one neutral styling, which made neighbours like
// the Community Dinner and the Salon read as twins once generals landed on the
// calendar as blocks. Each general event now wears a stable hue of its own,
// hashed from its id. Kept visually apart from SHIFT_HUES, MANDATORY_HUE, and
// the gold/purple chrome.
export const GENERAL_HUES: Hue[] = [
  { rgb: '235,185,80', accent: '#ebb950' },  // honey
  { rgb: '150,120,250', accent: '#9678fa' }, // iris
  { rgb: '120,205,225', accent: '#78cde1' }, // glacier
  { rgb: '255,140,110', accent: '#ff8c6e' }, // coral
  { rgb: '170,215,120', accent: '#aad778' }, // pear
  { rgb: '225,120,205', accent: '#e178cd' }, // orchid
]

export function generalHue(seed: string): Hue {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0
  return GENERAL_HUES[Math.abs(h) % GENERAL_HUES.length]
}
