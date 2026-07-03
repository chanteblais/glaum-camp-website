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

// The ornamental rule — hairline with a four-point diamond at its heart.
function DiamondRule() {
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '1rem 0 1.2rem', maxWidth: '26rem' }}>
      <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.55), rgba(200,168,72,0.25))' }} />
      <svg width="12" height="12" viewBox="0 0 12 12" fill={GOLD} opacity="0.85" aria-hidden>
        <path d="M6 0 l1.6 4.4 4.4 1.6 -4.4 1.6 L6 12 4.4 7.6 0 6 l4.4 -1.6 Z" />
      </svg>
      <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.25), rgba(200,168,72,0.05))' }} />
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

const MID = 180

// The main pulse: quiet braid → growing swells → jagged mid-cluster → the
// heartbeat spike → decay → quiet braid.
const MAIN: [number, number][] = [
  [0, 180], [30, 176], [60, 184], [90, 177], [120, 183], [152, 175], [184, 185],
  [218, 166], [252, 194], [286, 160], [318, 198],
  [348, 154], [376, 200], [404, 148], [430, 198],
  [456, 168], [478, 190],
  [494, 168], [506, 212], [518, 46], [531, 336], [544, 24], [557, 302], [570, 108], [582, 218],
  [602, 156], [628, 208], [656, 152], [684, 200], [712, 164],
  [742, 192], [774, 170], [806, 190], [838, 173],
  [868, 184], [900, 177], [932, 182], [966, 178], [1000, 180],
]

// Echo threads — the braid: they hug the baseline, cross the main line in
// the quiet sections, and rise faintly with the spike (offset so the burst
// reads as several strands of the same signal).
const THREAD_B: [number, number][] = [
  [0, 183], [30, 187], [62, 176], [95, 185], [128, 176], [160, 184],
  [200, 190], [235, 170], [270, 192], [305, 168],
  [340, 190], [375, 160], [410, 196], [445, 158], [480, 190],
  [505, 168], [520, 240], [532, 96], [544, 268], [556, 104], [568, 216], [582, 158],
  [610, 190], [645, 164], [680, 192], [715, 170],
  [755, 184], [795, 172], [835, 183], [875, 176], [915, 182], [958, 178], [1000, 181],
]
const THREAD_C: [number, number][] = [
  [0, 177], [35, 182], [70, 175], [105, 181], [140, 176], [175, 182],
  [215, 174], [255, 184], [295, 173], [335, 183],
  [380, 172], [425, 184], [470, 173],
  [510, 190], [526, 140], [540, 210], [554, 146], [570, 190],
  [615, 176], [660, 184], [705, 175], [755, 181], [805, 176], [860, 181], [915, 177], [1000, 179],
]

// Motes: dust along the band, bright blooming orbs crowding the spike, and a
// few glowing nodes sitting right on the trace.
const DUST: [number, number, number, number][] = [
  [120, 150, 0.9, 0.3], [180, 205, 0.8, 0.25], [250, 130, 1.1, 0.35],
  [310, 220, 0.9, 0.3], [365, 120, 1.2, 0.4], [415, 235, 0.9, 0.3],
  [455, 110, 1.0, 0.35], [640, 120, 1.0, 0.35], [700, 230, 0.9, 0.28],
  [760, 140, 1.1, 0.32], [830, 200, 0.8, 0.25], [890, 160, 0.9, 0.28],
]
const ORBS: [number, number, number, number][] = [
  [498, 96, 2.2, 0.85], [516, 260, 1.8, 0.7], [528, 70, 3.1, 1],
  [540, 300, 2.4, 0.8], [552, 120, 2.0, 0.9], [566, 240, 1.6, 0.65],
  [488, 190, 1.5, 0.6], [590, 88, 1.9, 0.75], [606, 250, 1.5, 0.55],
  [470, 250, 1.4, 0.5], [630, 180, 1.3, 0.5],
]

function Waveform() {
  return (
    <svg viewBox="0 0 1000 360" fill="none" aria-hidden style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <filter id="radio-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <radialGradient id="radio-bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={WARM} stopOpacity="0.28" />
          <stop offset="45%" stopColor={WARM} stopOpacity="0.1" />
          <stop offset="100%" stopColor={WARM} stopOpacity="0" />
        </radialGradient>
        {/* the line fades in from the left edge and out to the right */}
        <linearGradient id="radio-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={WARM} stopOpacity="0" />
          <stop offset="0.08" stopColor={WARM} stopOpacity="1" />
          <stop offset="0.92" stopColor={WARM} stopOpacity="1" />
          <stop offset="1" stopColor={WARM} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* warm halo around the heartbeat */}
      <ellipse cx="540" cy={MID} rx="200" ry="150" fill="url(#radio-bloom)" />

      {/* echo threads (the braid) */}
      <path d={smoothPath(THREAD_C)} stroke={GOLD} strokeWidth="0.8" opacity="0.22" />
      <path d={smoothPath(THREAD_B)} stroke={GOLD} strokeWidth="0.9" opacity="0.3" />

      {/* the pulse — glow underlay, then the fine line */}
      <path d={smoothPath(MAIN)} stroke={WARM} strokeWidth="4" opacity="0.22" filter="url(#radio-blur)" />
      <path d={smoothPath(MAIN)} stroke="url(#radio-fade)" strokeWidth="1.4" strokeLinecap="round" />

      {/* dust + blooming orbs */}
      {DUST.map(([x, y, r, o], i) => (
        <circle key={`d${i}`} cx={x} cy={y} r={r} fill={WARM} opacity={o} />
      ))}
      {ORBS.map(([x, y, r, o], i) => (
        <g key={`o${i}`}>
          <circle cx={x} cy={y} r={r * 3.2} fill={WARM} opacity={o * 0.22} filter="url(#radio-blur)" />
          <circle cx={x} cy={y} r={r} fill={WARM} opacity={o} />
        </g>
      ))}
    </svg>
  )
}

export function RadioHero() {
  return (
    <div style={{ position: 'relative', padding: '1.5rem 0 2rem' }}>
      <style>{`
        .radio-hero-wave {
          position: absolute;
          right: -1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 58%;
          max-width: 34rem;
          pointer-events: none;
        }
        @media (max-width: 700px) {
          .radio-hero-wave {
            position: static;
            transform: none;
            width: 100%;
            max-width: none;
            margin-top: 0.5rem;
          }
        }
      `}</style>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '30rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-cormorant-garamond), serif',
            fontWeight: 600,
            fontSize: 'clamp(2.6rem, 7vw, 3.8rem)',
            color: GOLD,
            margin: 0,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem',
            lineHeight: 1,
          }}
        >
          <WavesMark />
          Radio
        </h1>
        <DiamondRule />
        <p
          style={{
            fontFamily: 'var(--font-cormorant-garamond), serif',
            fontStyle: 'italic',
            fontWeight: 500,
            margin: 0,
            fontSize: '1.35rem',
            lineHeight: 1.5,
            letterSpacing: '0.02em',
            color: WARM,
            opacity: 0.95,
          }}
        >
          the pulse of camp —<br />
          tune in to what's happening around you.
        </p>
      </div>

      <div className="radio-hero-wave">
        <Waveform />
      </div>
    </div>
  )
}
