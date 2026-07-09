import type { CSSProperties } from 'react'

// Shared "APPROVED CAMPER" status pill — illuminated amethyst glass.
// Single source of truth for both the member's own /profile header and the
// public /members/[id] profile, so the two never drift. Pass `style` to tweak
// per-placement (e.g. margins) without forking the look; `label` swaps the
// text for the other registers (e.g. VOLUNTEER) while keeping the glass.
export function ApprovedCamperPill({ style, label = 'APPROVED CAMPER' }: { style?: CSSProperties; label?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '6px 18px',
      borderRadius: '9999px',
      background: 'linear-gradient(180deg, rgba(95,48,120,0.24) 0%, rgba(68,30,94,0.30) 50%, rgba(43,18,66,0.34) 100%)',
      border: '1px solid rgba(210,160,255,0.13)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      boxShadow: '0 0 0 1px rgba(255,220,255,0.04) inset, 0 0 10px rgba(175,75,255,0.08), 0 2px 6px rgba(0,0,0,0.28)',
      fontFamily: 'var(--font-cormorant-garamond), serif',
      fontSize: '12px',
      fontWeight: 500,
      letterSpacing: '0.16em',
      color: '#DA5FBF',
      textShadow: '0 1px 1px rgba(20,6,35,0.35)',
      ...style,
    }}>
      ✦ {label} ✦
    </span>
  )
}
