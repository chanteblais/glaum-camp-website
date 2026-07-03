// The Radio hero — built to Chante's banner mockup (assets/radio_mockup.png):
// the ((✦)) waves mark beside a high-contrast serif RADIO, an ornamental rule
// with a four-point diamond, an elegant italic subtitle, and the frequency
// band on the right. The band is a PULSE — an ECG-like trace ("the pulse of
// camp"): fine braided threads at the edges, irregular swells growing toward
// a dramatic spike cluster wrapped in warm bloom, then decay. All inline SVG.

const GOLD = '#C8A848'
const WARM = '#E0B472' // lighter, warmer gold for the line + subtitle

// ((✦)) — broadcast waves around a four-point star.
function WavesMark() {
  return (
    <svg width="58" height="42" viewBox="0 0 76 52" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M18 8 a26 26 0 0 0 0 36" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M27 15 a16 16 0 0 0 0 22" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <path d="M58 8 a26 26 0 0 1 0 36" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M49 15 a16 16 0 0 1 0 22" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <path d="M38 17 l2.2 6.8 6.8 2.2 -6.8 2.2 -2.2 6.8 -2.2 -6.8 -6.8 -2.2 6.8 -2.2 Z" fill={GOLD} />
    </svg>
  )
}

// The ornamental rule — hairline with a four-point diamond at its heart,
// fading to nothing at its right end so the frequency band can pick the
// line up mid-air.
function DiamondRule() {
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%' }}>
      <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.55), rgba(200,168,72,0.3))' }} />
      <svg width="12" height="12" viewBox="0 0 12 12" fill={GOLD} opacity="0.85" aria-hidden style={{ flexShrink: 0 }}>
        <path d="M6 0 l1.6 4.4 4.4 1.6 -4.4 1.6 L6 12 4.4 7.6 0 6 l4.4 -1.6 Z" />
      </svg>
      <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.3), rgba(200,168,72,0))' }} />
    </div>
  )
}

// Catmull-Rom → cubic bezier: a smooth organic line through hand-placed
// points. Tight point spacing keeps the spike cluster sharp; wide spacing
// keeps the swells languid.
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1]}`
  }
  return d
}

// Trace coordinates use a 180 baseline; the svg wraps them in a +30 shift so
// the 420-tall canvas has air for the mote field above and below.
const MID = 180

// The main pulse: quiet braid → growing swells → jagged mid-cluster → the
// heartbeat spike → decay → quiet braid.
// Transcribed from assets/radio_mockup.png: the actual extrema were extracted
// per-column from the gold pixels (baseline y=313 in the source), then scaled
// into this viewBox. The crests are ROUND — extrema sit ~35 viewBox units
// apart, so the Catmull-Rom smoother produces her generous U-shaped swings,
// not needles.
const MAIN: [number, number][] = [
  // quiet braid in
  [0, 180], [40, 176], [80, 183], [120, 177], [160, 182],
  // first swells
  [198, 145], [239, 215], [268, 172], [298, 196],
  // taller pair
  [335, 128], [370, 232],
  // the little m-wiggle
  [400, 171], [417, 187], [435, 168], [456, 184],
  // building
  [479, 155], [500, 196],
  // the cluster: crest · deep valley · GIANT crest · deepest valley · tall crest · valley
  [537, 113], [570, 285], [610, 37], [645, 330], [684, 97], [712, 253],
  // decay: small m, then still-substantial swells
  [745, 150], [768, 201], [784, 171], [798, 189],
  [821, 147], [854, 230], [891, 128], [926, 207], [956, 138], [982, 198],
  [1000, 180],
]

// Echo threads — the braid lives at the EDGES in the mock: two fine strands
// weaving tightly around the baseline where the signal is quiet, nearly
// invisible through the loud middle.
const THREAD_B: [number, number][] = [
  [0, 184], [28, 174], [56, 186], [84, 175], [112, 185], [140, 176], [168, 184],
  [220, 178], [290, 184], [360, 176], [430, 184], [500, 177],
  [570, 186], [640, 175], [710, 184],
  [770, 176], [810, 185], [850, 174], [890, 186], [930, 175], [965, 184], [1000, 178],
]
const THREAD_C: [number, number][] = [
  [0, 176], [30, 185], [60, 175], [90, 184], [120, 176], [150, 183],
  [230, 182], [310, 176], [390, 183], [470, 177],
  [550, 182], [630, 178], [700, 182],
  [780, 184], [820, 175], [860, 185], [900, 176], [940, 184], [975, 176], [1000, 182],
]

// The mote field, positions measured off the mockup (r and brightness vary;
// coordinates are absolute on the 1000×420 canvas).
const DUST: [number, number, number, number][] = [
  [140, 130, 1.1, 0.3], [290, 250, 0.9, 0.25], [380, 90, 1.0, 0.3],
  [545, 175, 1.1, 0.4], [665, 330, 0.9, 0.28], [845, 145, 1.0, 0.3],
  [250, 330, 0.9, 0.25], [960, 260, 0.8, 0.25],
]
const ORBS: [number, number, number, number][] = [
  [500, 19, 4.0, 0.95], [642, 30, 3.0, 0.8], [777, 68, 4.0, 0.9],
  [426, 105, 3.2, 0.7], [565, 115, 2.8, 0.85], [751, 114, 2.0, 0.6],
  [170, 168, 3.2, 0.7], [333, 163, 2.0, 0.55], [60, 236, 2.8, 0.6],
  [225, 294, 3.4, 0.75], [465, 265, 2.4, 0.6], [716, 286, 3.0, 0.7],
  [931, 233, 2.4, 0.6], [912, 313, 3.8, 0.85], [465, 353, 2.8, 0.65],
]

function Waveform() {
  return (
    <svg viewBox="0 0 1000 420" fill="none" aria-hidden style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <filter id="radio-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <radialGradient id="radio-bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={WARM} stopOpacity="0.28" />
          <stop offset="45%" stopColor={WARM} stopOpacity="0.1" />
          <stop offset="100%" stopColor={WARM} stopOpacity="0" />
        </radialGradient>
        {/* the line fades in from the left edge (picking up the rule's
            hand-off) and out to the right */}
        <linearGradient id="radio-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={WARM} stopOpacity="0" />
          <stop offset="0.14" stopColor={WARM} stopOpacity="1" />
          <stop offset="0.92" stopColor={WARM} stopOpacity="1" />
          <stop offset="1" stopColor={WARM} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* baseline-relative art shifts +30 into the taller canvas */}
      <g transform="translate(0 30)">
        {/* warm halo around the heartbeat */}
        <ellipse cx="622" cy={MID} rx="210" ry="165" fill="url(#radio-bloom)" />

        {/* echo threads (the edge braid) */}
        <path d={smoothPath(THREAD_C)} stroke={GOLD} strokeWidth="0.9" opacity="0.22" />
        <path d={smoothPath(THREAD_B)} stroke={GOLD} strokeWidth="1" opacity="0.3" />

        {/* the pulse — glow underlay, then the ribbon. The mock's line is
            proportionally substantial (~2px on a 570px-wide band): stroke 3.6
            here renders ~1.6px at the hero's width. */}
        <path d={smoothPath(MAIN)} stroke={WARM} strokeWidth="8" opacity="0.16" filter="url(#radio-blur)" />
        <path d={smoothPath(MAIN)} stroke="url(#radio-fade)" strokeWidth="3.6" strokeLinecap="round" />
      </g>

      {/* the mote field (absolute coordinates, measured off the mockup) */}
      {DUST.map(([x, y, r, o], i) => (
        <circle key={`d${i}`} cx={x} cy={y} r={r} fill={WARM} opacity={o} />
      ))}
      {ORBS.map(([x, y, r, o], i) => (
        <g key={`o${i}`}>
          <circle cx={x} cy={y} r={r * 2.6} fill={WARM} opacity={o * 0.25} filter="url(#radio-blur)" />
          <circle cx={x} cy={y} r={r} fill={WARM} opacity={o} />
        </g>
      ))}
    </svg>
  )
}

export function RadioHero() {
  return (
    <div style={{ position: 'relative', padding: '0.5rem 0 1.5rem' }}>
      {/* The frequency band centers itself on the rule's own 1px row, so its
          baseline IS the rule's line — the rule fades out, the band fades in,
          one continuous thread with the pulse erupting from it. (Inline
          <style> must use dangerouslySetInnerHTML — React escapes ' and >
          in children and hydration trips on the mismatch.) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .radio-rule-row {
          position: relative;
          height: 1px;
          margin: 1rem 0 0.9rem;
        }
        .radio-rule {
          width: 40%;
          min-width: 15rem;
        }
        .radio-hero-wave {
          position: absolute;
          left: 36%;
          right: -1.5rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        @media (max-width: 700px) {
          .radio-rule { width: 62%; min-width: 0; }
          .radio-hero-wave { left: 45%; right: -0.75rem; }
        }
      ` }} />

      <h1
        style={{
          fontFamily: 'var(--font-cormorant-garamond), serif',
          fontWeight: 400,
          fontSize: 'clamp(2.4rem, 6.5vw, 3.5rem)',
          color: GOLD,
          margin: 0,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '1.1rem',
          lineHeight: 1,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <WavesMark />
        Radio
      </h1>

      <div className="radio-rule-row" aria-hidden>
        <div className="radio-rule">
          <DiamondRule />
        </div>
        <div className="radio-hero-wave">
          <Waveform />
        </div>
      </div>

      <p
        style={{
          fontFamily: 'var(--font-cormorant-garamond), serif',
          fontStyle: 'italic',
          fontWeight: 500,
          margin: 0,
          fontSize: '1.1rem',
          lineHeight: 1.5,
          letterSpacing: '0.02em',
          color: WARM,
          opacity: 0.95,
          position: 'relative',
          zIndex: 1,
          maxWidth: '22rem',
        }}
      >
        the pulse of camp —<br />
        tune in to what's happening around you.
      </p>
    </div>
  )
}
