import type { CSSProperties } from 'react'

// The fixed ornamental hands framing most pages. The source SVGs are ~750
// paths each — cheap to composite on desktop, but phones re-rasterize them at
// 3× device-pixel-ratio (and re-blur them under any frosted bar), so below
// 768px the <picture> swaps in pre-struck WebP rasters instead
// (scripts/raster-hands.mjs regenerates them from the SVGs).
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
      <picture>
        <source media="(max-width: 768px)" srcSet="/hands-left.mobile.webp" />
        <img src="/hands-left.svg" alt="" aria-hidden role="presentation" style={{ ...common, left: 0 }} />
      </picture>
      <picture>
        <source media="(max-width: 768px)" srcSet="/hands-right.mobile.webp" />
        <img src="/hands-right.svg" alt="" aria-hidden role="presentation" style={{ ...common, right: 0 }} />
      </picture>
    </>
  )
}
