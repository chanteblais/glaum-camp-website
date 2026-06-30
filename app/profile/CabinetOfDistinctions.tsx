import type { EarnedDistinction } from '@/lib/distinctions'

// Cabinet of Distinctions — a gallery of earned honours rendered as collectible
// engraved medals. These are honours, NOT controls: nothing here is clickable.
// Distinctions are derived from member facts via evaluateDistinctions(); this
// component only renders the result.

function Medal({ d }: { d: EarnedDistinction }) {
  return (
    <div className="cabinet-medal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
      {/* Engraved oval frame */}
      <div
        title={d.description ?? d.label}
        style={{
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          // Clip the medal art to the circle. Icons are normalized onto a
          // landscape frame (lib/icon-image.ts), so we size them by height and
          // let the transparent sides overflow — overflow:hidden trims that
          // excess to the round edge. (Outer box-shadow is unaffected by clip.)
          overflow: 'hidden',
          background: 'radial-gradient(circle at 38% 30%, rgba(210,57,248,0.16), rgba(8,0,18,0.9) 72%)',
          border: '2px solid #C8A848',
          boxShadow: '0 8px 24px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4), inset 0 0 18px rgba(200,168,72,0.18), inset 0 0 0 1px rgba(255,249,232,0.12)',
        }}
      >
        {d.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={d.image}
            alt={`${d.label} medal`}
            // Size by height (not objectFit) so the artwork — centered on a
            // landscape normalize frame — fills the medal. width:auto +
            // maxWidth:none lets the transparent sides spill past the frame,
            // where overflow:hidden on the circle clips them. This mirrors the
            // commitment-circle icons, so every current and future medal inherits
            // the same generous, padding-free sizing. Aspect ratio is preserved.
            style={{ height: '132%', width: 'auto', maxWidth: 'none', display: 'block', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}
          />
        ) : (
          <span style={{ fontSize: '2.1rem', lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
            {d.glyph ?? '✦'}
          </span>
        )}
      </div>

      {/* Label */}
      <p style={{
        marginTop: '0.35rem',
        fontSize: '0.66rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#EDE0C8',
        lineHeight: 1.4,
        fontFamily: 'var(--font-cormorant-garamond), serif',
        fontWeight: 600,
      }}>
        {d.label}
      </p>
      {d.engraving && (
        <p style={{
          marginTop: '0.2rem',
          fontSize: '0.62rem',
          letterSpacing: '0.04em',
          color: '#C8A848',
          opacity: 0.85,
          fontStyle: 'italic',
          lineHeight: 1.35,
          fontFamily: 'var(--font-cormorant-garamond), serif',
        }}>
          {d.engraving}
        </p>
      )}
      {d.year != null && (
        <p style={{ marginTop: '0.15rem', fontSize: '0.6rem', letterSpacing: '0.14em', color: '#D239F8', opacity: 0.8 }}>
          {d.year}
        </p>
      )}
    </div>
  )
}

export function CabinetOfDistinctions({ distinctions }: { distinctions: EarnedDistinction[] }) {
  if (distinctions.length === 0) return null

  return (
    <div style={{
      border: '1.5px solid rgba(200,168,72,0.7)',
      borderRadius: '1rem',
      background: 'rgba(10,0,20,0.6)',
      overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(200,168,72,0.12), 0 0 24px rgba(200,168,72,0.08)',
    }}>
      <style>{`
        .cabinet-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: flex-start;
          gap: 0.5rem 1.25rem;
          padding: 0.1rem 2.5rem 0.5rem;
        }
        .cabinet-medal { width: 100px; }
        @media (max-width: 600px) {
          .cabinet-grid { gap: 0.5rem 0.75rem; padding: 0.1rem 1.25rem 0.5rem; }
          .cabinet-medal { width: 88px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '0.6rem 1.5rem 0.1rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginBottom: '0.25rem' }}>
          <span aria-hidden style={{ color: '#C8A848', fontSize: '0.75rem', opacity: 0.9 }}>✦</span>
          <span aria-hidden style={{ width: '46px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.6))' }} />
          <p style={{ fontFamily: 'var(--font-cormorant-garamond), serif', fontSize: '1.15rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', margin: 0, textShadow: '0 0 18px rgba(200,168,72,0.35)', whiteSpace: 'nowrap' }}>
            Cabinet of Distinctions
          </p>
          <span aria-hidden style={{ width: '46px', height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.6), transparent)' }} />
          <span aria-hidden style={{ color: '#C8A848', fontSize: '0.75rem', opacity: 0.9 }}>✦</span>
        </div>
        <p style={{ fontSize: '0.82rem', opacity: 0.5, margin: 0, fontStyle: 'italic' }}>
          Earned recognitions and contributions.
        </p>
      </div>

      {/* Medal gallery */}
      <div className="cabinet-grid">
        {distinctions.map(d => <Medal key={d.id} d={d} />)}
      </div>
    </div>
  )
}
