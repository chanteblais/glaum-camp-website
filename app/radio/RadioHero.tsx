// The Radio hero — built to Chante's 2026-07-03 banner mockup: the ((✦))
// waves mark beside the title, an ornamental rule with a four-point diamond,
// a warm-gold script subtitle, and the frequency waveform shimmering on the
// right. All the art is inline SVG in the engraved-gold language, so it ships
// weightless and stays crisp at any size.

import { Caveat } from 'next/font/google'

const caveat = Caveat({ subsets: ['latin'], weight: ['500'] })

const GOLD = '#C8A848'
const WARM = '#E0B472' // the subtitle's lighter, warmer gold

// ((✦)) — broadcast waves around a four-point star.
function WavesMark() {
  return (
    <svg width="64" height="46" viewBox="0 0 76 52" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M18 8 a26 26 0 0 0 0 36" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M27 15 a16 16 0 0 0 0 22" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M58 8 a26 26 0 0 1 0 36" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M49 15 a16 16 0 0 1 0 22" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M38 17 l2.2 6.8 6.8 2.2 -6.8 2.2 -2.2 6.8 -2.2 -6.8 -6.8 -2.2 6.8 -2.2 Z" fill={GOLD} />
    </svg>
  )
}

// The ornamental rule — hairline with a four-point diamond at its heart.
function DiamondRule() {
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0.9rem 0 1.1rem', maxWidth: '26rem' }}>
      <span style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, rgba(200,168,72,0.55), rgba(200,168,72,0.25))` }} />
      <svg width="12" height="12" viewBox="0 0 12 12" fill={GOLD} opacity="0.85">
        <path d="M6 0 l1.6 4.4 4.4 1.6 -4.4 1.6 L6 12 4.4 7.6 0 6 l4.4 -1.6 Z" />
      </svg>
      <span style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, rgba(200,168,72,0.25), rgba(200,168,72,0.05))` }} />
    </div>
  )
}

// The frequency graphic — a gold waveform crescendoing to its spike, with an
// echo trace and glowing motes around it.
function Waveform() {
  // Alternating quadratic humps; amplitude rises to the spike, then decays.
  const mid = 130
  const amps = [5, 9, 14, 10, 22, 16, 34, 26, 62, 108, 78, 42, 58, 30, 17, 9, 5]
  const widths = [42, 38, 35, 33, 31, 29, 27, 26, 24, 22, 24, 28, 32, 36, 40, 44, 48]
  let x = 0
  let d = `M0 ${mid}`
  amps.forEach((a, i) => {
    const w = widths[i]
    const dir = i % 2 === 0 ? -1 : 1
    d += ` Q ${x + w / 2} ${mid + dir * a} ${x + w} ${mid}`
    x += w
  })

  const motes: [number, number, number, number][] = [
    // [x, y, r, opacity]
    [150, 96, 1.6, 0.5], [205, 148, 1.2, 0.4], [255, 84, 2.2, 0.7],
    [300, 160, 1.4, 0.45], [330, 60, 1.8, 0.6], [352, 175, 1.3, 0.4],
    [368, 38, 2.6, 0.9], [385, 100, 1.5, 0.5], [402, 190, 1.8, 0.55],
    [430, 70, 2.2, 0.75], [468, 132, 1.4, 0.5], [502, 92, 1.9, 0.6],
    [540, 150, 1.3, 0.4], [90, 120, 1.2, 0.35],
  ]

  return (
    <svg
      viewBox={`0 0 ${x} 260`}
      fill="none"
      aria-hidden
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <filter id="radio-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {/* echo trace, drifting slightly above */}
      <path d={d} stroke={GOLD} strokeWidth="1" opacity="0.22" transform="translate(6 -7)" />
      {/* glow underlay + the line itself */}
      <path d={d} stroke={GOLD} strokeWidth="4.5" opacity="0.3" filter="url(#radio-glow)" />
      <path d={d} stroke={WARM} strokeWidth="1.7" strokeLinecap="round" />
      {motes.map(([mx, my, r, o], i) => (
        <circle key={i} cx={mx} cy={my} r={r} fill={WARM} opacity={o} />
      ))}
      {motes.filter((_, i) => i % 3 === 0).map(([mx, my, r], i) => (
        <circle key={`g${i}`} cx={mx} cy={my} r={r * 2.6} fill={WARM} opacity={0.16} filter="url(#radio-glow)" />
      ))}
    </svg>
  )
}

export function RadioHero() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap',
        padding: '1.5rem 0 2rem',
      }}
    >
      <div style={{ flex: '1 1 20rem', minWidth: '17rem' }}>
        <h1
          style={{
            fontFamily: 'TokyoDreams, serif',
            fontSize: 'clamp(2.4rem, 7vw, 3.4rem)',
            color: GOLD,
            margin: 0,
            letterSpacing: '0.08em',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem',
          }}
        >
          <WavesMark />
          Radio
        </h1>
        <DiamondRule />
        <p
          className={caveat.className}
          style={{
            margin: 0,
            fontSize: '1.45rem',
            lineHeight: 1.4,
            color: WARM,
            opacity: 0.95,
            maxWidth: '24rem',
          }}
        >
          the pulse of camp —<br />
          tune in to what's happening around you.
        </p>
      </div>

      <div style={{ flex: '1 1 18rem', minWidth: '15rem', maxWidth: '34rem', opacity: 0.95 }}>
        <Waveform />
      </div>
    </div>
  )
}
