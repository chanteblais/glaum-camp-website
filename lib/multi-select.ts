// Multi-select with stand-alone ("or") options.
//
// Some multi-select questions have answers that can't be combined with the
// rest: "Which years have you camped? 2022 / 2023 / 2024 / 2025 — or Newbie".
// An option listed in `exclusive` stands alone: picking it clears every other
// selection, and picking any regular option clears the stand-alones. Renderers
// show stand-alone options after an "— or —" divider so the either/or reads at
// a glance.

/** The next selection after toggling `opt`, honouring stand-alone options. */
export function toggleMultiValue(values: string[], opt: string, exclusive: string[] = []): string[] {
  if (values.includes(opt)) return values.filter(v => v !== opt)
  if (exclusive.includes(opt)) return [opt]
  return [...values.filter(v => !exclusive.includes(v)), opt]
}

/** Options split for rendering: regular first, stand-alones after the divider. */
export function splitExclusive(options: string[], exclusive: string[] = []): { regular: string[]; standalone: string[] } {
  return {
    regular: options.filter(o => !exclusive.includes(o)),
    standalone: options.filter(o => exclusive.includes(o)),
  }
}
