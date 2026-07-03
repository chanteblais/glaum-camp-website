// The Radio hero — built to Chante's banner mockup (assets/radio_mockup.png):
// the ((✦)) waves mark beside a high-contrast serif RADIO, an ornamental rule
// with a four-point diamond, an elegant italic subtitle, and the frequency
// band on the right. The band is a PULSE — an ECG-like trace ("the pulse of
// camp"): fine braided threads at the edges, irregular swells growing toward
// a dramatic spike cluster wrapped in warm bloom, then decay. All inline SVG.

const GOLD = '#C8A848'
const WARM = '#E0B472' // lighter, warmer gold for the subtitle
// The band's colours, sampled from the mockup: the line is a warm amber
// (#D8A15A avg) with a bright core (#FDD370); the motes burn #E8AC51.
const LINE = '#DFA55C'
const LINE_CORE = '#FDD370'
const ORB = '#E8AC51'

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

// Trace coordinates use a 180 baseline; the svg wraps them in a +50 shift so
// the 500-tall canvas holds the true-aspect amplitudes (y −32…401) plus air
// for the mote field.
const MID = 180

// The main pulse: quiet braid → growing swells → jagged mid-cluster → the
// heartbeat spike → decay → quiet braid.
// The mockup's trace, VERBATIM: densely sampled per-column from
// assets/radio_mockup.png (gold-pixel run tracking, median-filtered,
// baseline y=313 → 180 here). Extrema-only sampling made pointy crests —
// the mock's roundness lives between the extrema, so the curve itself is
// the data. A few mote-grab glitches were hand-mended against the local
// curve; regenerate with the extraction script in the session notes if the
// mock ever changes.
const MAIN: [number, number][] = [
  [0, 180], [5, 171], [16, 166], [25, 165], [33, 160], [42, 160], [68, 160], [79, 165],
  [89, 172], [100, 186], [111, 204], [121, 214], [132, 221], [142, 223], [153, 218], [163, 204],
  [174, 175], [184, 143], [195, 128], [205, 136], [216, 165], [226, 194], [237, 200], [247, 191],
  [258, 172], [268, 174], [279, 197], [289, 220], [300, 217], [311, 183], [321, 133], [332, 104],
  [342, 117], [353, 178], [363, 243], [374, 253], [384, 218], [395, 189], [405, 189], [416, 209],
  [426, 214], [437, 198], [447, 182], [458, 177], [468, 154], [479, 143], [489, 166], [500, 217],
  [505, 223], [511, 218], [516, 204], [521, 166], [526, 124], [532, 90], [537, 81], [542, 88],
  [547, 121], [553, 188], [558, 268], [563, 316], [568, 334], [574, 334], [579, 311], [584, 256],
  [589, 149], [595, 49], [600, -5], [605, -29], [611, -32], [616, -23], [621, 11], [626, 111],
  [632, 252], [637, 363], [642, 397], [647, 401], [653, 394], [658, 355], [663, 288], [668, 207],
  [674, 117], [679, 64], [684, 58], [689, 67], [695, 114], [700, 178], [705, 253], [711, 278],
  [716, 253], [721, 214], [726, 189], [732, 168], [737, 146], [742, 134], [747, 137], [753, 154],
  [758, 175], [763, 188], [768, 194], [774, 194], [784, 186], [795, 201], [805, 189], [816, 149],
  [826, 142], [837, 177], [847, 239], [858, 255], [868, 209], [879, 134], [889, 105], [900, 121],
  [911, 172], [921, 211], [930, 220], [940, 168], [947, 127], [953, 117], [963, 209], [974, 200],
  [984, 183], [995, 171], [1000, 177],
]

// Echo threads — the braid lives at the EDGES ONLY in the mock: two fine
// strands weaving around the baseline where the signal is quiet, absent
// through the loud middle (no thin lines cross the tall crests). Each
// segment fades out at its inner end.
const THREAD_B_LEFT: [number, number][] = [
  [0, 184], [28, 174], [56, 186], [84, 175], [112, 185], [140, 176], [168, 184],
  [220, 178], [268, 183], [310, 179],
]
const THREAD_B_RIGHT: [number, number][] = [
  [755, 178], [790, 185], [825, 174], [860, 186], [895, 175], [930, 184], [965, 176], [1000, 181],
]
const THREAD_C_LEFT: [number, number][] = [
  [0, 176], [30, 185], [60, 175], [90, 184], [120, 176], [150, 183], [200, 180], [250, 177], [300, 182],
]
const THREAD_C_RIGHT: [number, number][] = [
  [770, 183], [810, 176], [850, 184], [890, 177], [930, 183], [970, 178], [1000, 176],
]

// The mote field, positions measured off the mockup (r and brightness vary;
// coordinates are absolute on the 1000×500 canvas).
const DUST: [number, number, number, number][] = [
  [140, 155, 1.1, 0.3], [290, 298, 0.9, 0.25], [380, 107, 1.0, 0.3],
  [545, 208, 1.1, 0.4], [665, 393, 0.9, 0.28], [845, 173, 1.0, 0.3],
  [250, 393, 0.9, 0.25], [960, 310, 0.8, 0.25],
]
const ORBS: [number, number, number, number][] = [
  [500, 23, 4.0, 0.95], [642, 36, 3.0, 0.8], [777, 81, 4.0, 0.9],
  [426, 125, 3.2, 0.7], [565, 137, 2.8, 0.85], [751, 136, 2.0, 0.6],
  [170, 200, 3.2, 0.7], [333, 194, 2.0, 0.55], [60, 281, 2.8, 0.6],
  [225, 350, 3.4, 0.75], [465, 315, 2.4, 0.6], [716, 340, 3.0, 0.7],
  [931, 277, 2.4, 0.6], [912, 372, 3.8, 0.85], [465, 415, 2.8, 0.65],
]

// Ghost echoes of the pulse — attenuated, offset copies of the main trace
// (the mock's liveliness: faint wisps shadowing the line, standing tall
// BESIDE the crests rather than cutting through them).
const ghost = (dx: number, k: number): [number, number][] =>
  MAIN.map(([x, y]) => [x + dx, Math.round(MID + (y - MID) * k)])

function Waveform() {
  return (
    <svg viewBox="0 0 1000 500" fill="none" aria-hidden style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <filter id="radio-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <radialGradient id="radio-bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={ORB} stopOpacity="0.26" />
          <stop offset="45%" stopColor={ORB} stopOpacity="0.09" />
          <stop offset="100%" stopColor={ORB} stopOpacity="0" />
        </radialGradient>
        {/* the line fades in from the left edge (picking up the rule's
            hand-off) and out to the right */}
        <linearGradient id="radio-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={LINE} stopOpacity="0" />
          <stop offset="0.14" stopColor={LINE} stopOpacity="1" />
          <stop offset="0.92" stopColor={LINE} stopOpacity="1" />
          <stop offset="1" stopColor={LINE} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="radio-fade-core" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={LINE_CORE} stopOpacity="0" />
          <stop offset="0.14" stopColor={LINE_CORE} stopOpacity="0.55" />
          <stop offset="0.92" stopColor={LINE_CORE} stopOpacity="0.55" />
          <stop offset="1" stopColor={LINE_CORE} stopOpacity="0" />
        </linearGradient>
        {/* the edge threads fade at their inner ends — no thin lines cross
            the loud middle */}
        <linearGradient id="thread-fade-out" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={GOLD} stopOpacity="0.3" />
          <stop offset="0.75" stopColor={GOLD} stopOpacity="0.18" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="thread-fade-in" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={GOLD} stopOpacity="0" />
          <stop offset="0.25" stopColor={GOLD} stopOpacity="0.18" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* baseline-relative art shifts +50 into the taller canvas */}
      <g transform="translate(0 50)">
        {/* warm halo around the heartbeat */}
        <ellipse cx="622" cy={MID} rx="215" ry="205" fill="url(#radio-bloom)" />

        {/* echo threads — edge segments only, fading at their inner ends */}
        <path d={smoothPath(THREAD_C_LEFT)} stroke="url(#thread-fade-out)" strokeWidth="0.9" />
        <path d={smoothPath(THREAD_B_LEFT)} stroke="url(#thread-fade-out)" strokeWidth="1" />
        <path d={smoothPath(THREAD_C_RIGHT)} stroke="url(#thread-fade-in)" strokeWidth="0.9" />
        <path d={smoothPath(THREAD_B_RIGHT)} stroke="url(#thread-fade-in)" strokeWidth="1" />

        {/* ghost echoes shadowing the pulse — the wisps that make it alive */}
        <path d={smoothPath(ghost(11, 0.92))} stroke="url(#radio-fade)" strokeWidth="1.2" opacity="0.28" />
        <path d={smoothPath(ghost(-9, 0.8))} stroke="url(#radio-fade)" strokeWidth="1" opacity="0.18" />
        <path d={smoothPath(ghost(22, 0.7))} stroke="url(#radio-fade)" strokeWidth="0.9" opacity="0.12" />

        {/* the pulse — glow underlay, amber ribbon, bright core. The mock's
            line is proportionally substantial (~2px on a 570px-wide band):
            stroke 3.6 here renders ~1.6px at the hero's width. */}
        <path d={smoothPath(MAIN)} stroke={LINE} strokeWidth="8" opacity="0.16" filter="url(#radio-blur)" />
        <path d={smoothPath(MAIN)} stroke="url(#radio-fade)" strokeWidth="3.6" strokeLinecap="round" />
        <path d={smoothPath(MAIN)} stroke="url(#radio-fade-core)" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      {/* the mote field (absolute coordinates, measured off the mockup) */}
      {DUST.map(([x, y, r, o], i) => (
        <circle key={`d${i}`} cx={x} cy={y} r={r} fill={ORB} opacity={o} />
      ))}
      {ORBS.map(([x, y, r, o], i) => (
        <g key={`o${i}`}>
          <circle cx={x} cy={y} r={r * 2.6} fill={ORB} opacity={o * 0.25} filter="url(#radio-blur)" />
          <circle cx={x} cy={y} r={r} fill={ORB} opacity={o} />
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
          left: 44%;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        @media (max-width: 700px) {
          .radio-rule { width: 62%; min-width: 0; }
          .radio-hero-wave { left: 50%; right: 0; }
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
