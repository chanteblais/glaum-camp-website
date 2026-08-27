import type { CSSProperties } from 'react'

// The fixed ornamental hands framing most pages. The source SVGs are ~750
// paths each and gzip to ~138KB combined, so every breakpoint serves the
// pre-struck WebP rasters instead (scripts/raster-hands.mjs regenerates them;
// the SVGs stay in public/ as editable masters only). The filenames carry a
// version because next.config.js serves them with a 1-year immutable cache —
// after regenerating, bump the version in the script AND here.
export function HandsBackdrop({ opacity = 0.85 }: { opacity?: number }) {
  const common: CSSProperties = {
    position: 'fixed',
    top: 0,
    height: '100%',
    width: 'auto',
    pointerEvents: 'none',
    userSelect: 'none',
    opacity,
    zIndex: 0,
  }
  return (
    <>
      <img src="/hands-left.v2.webp" alt="" aria-hidden role="presentation" style={{ ...common, left: 0 }} />
      <img src="/hands-right.v2.webp" alt="" aria-hidden role="presentation" style={{ ...common, right: 0 }} />
    </>
  )
}
