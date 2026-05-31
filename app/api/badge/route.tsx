import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

// Render at 2× for crisp text when downscaled for display
const SCALE = 2
const W = 365 * SCALE
const H = 424 * SCALE

const s = (n: number) => n * SCALE

// Simulate word-wrap and find the largest font size that fits both width and height
function fitFontSize(
  text: string,
  zoneW: number, zoneH: number,
  lineHeightRatio: number,
  basePx: number, minPx: number,
): number {
  const CHAR_RATIO = 0.88 // conservative char-width/font-size for uppercase TokyoDreams + letter-spacing

  for (let size = basePx; size >= minPx; size--) {
    const charW = size * CHAR_RATIO
    const lineH = size * lineHeightRatio

    // Simulate wrapping at spaces
    const words = text.toUpperCase().split(' ')
    let lines = 1
    let currentW = 0
    let fits = true

    for (const word of words) {
      const wordW = word.length * charW
      if (wordW > zoneW) { fits = false; break } // single word too wide
      if (currentW === 0) {
        currentW = wordW
      } else if (currentW + charW + wordW <= zoneW) {
        currentW += charW + wordW // space + word
      } else {
        lines++
        currentW = wordW
      }
    }

    if (!fits) continue
    if (lines * lineH <= zoneH) return size
  }
  return minPx
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') ?? ''
  const dept = searchParams.get('dept') ?? ''

  const [badgeBuffer, fontBuffer] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/badge_base.png')),
    readFile(path.join(process.cwd(), 'public/fonts/TokyoDreams.otf')),
  ])

  const badgeDataUrl = `data:image/png;base64,${badgeBuffer.toString('base64')}`

  // Zone dimensions at 1x — width, height, lineHeight, base, min
  const deptFontSize = fitFontSize(dept, 365 - 55 * 2, 125, 1.5, 24, 11)
  // Role renders one word per line — fit by longest word width & total stacked height
  const roleWords = role.toUpperCase().split(' ')
  const longestRoleWord = Math.max(...roleWords.map(w => w.length))
  const roleFontSize = (() => {
    const CHAR_RATIO = 0.88
    const zoneW = 365 - 42 * 2
    const zoneH = 112
    const lineH_ratio = 1.3
    for (let size = 26; size >= 11; size--) {
      if (longestRoleWord * size * CHAR_RATIO <= zoneW &&
          roleWords.length * size * lineH_ratio <= zoneH) return size
    }
    return 11
  })()

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative' }}>
        {/* Badge background */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={badgeDataUrl} width={W} height={H} style={{ position: 'absolute', top: 0, left: 0 }} alt="" />

        {/* Department name — upper zone, above gold divider */}
        <div style={{
          position: 'absolute',
          top: s(135), left: s(55), right: s(55), height: s(125),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <span style={{
            fontFamily: 'TokyoDreams',
            color: '#F5EDD8',
            fontSize: s(deptFontSize),
            textAlign: 'center',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            lineHeight: 1.5,
            textShadow: '0 0 12px rgba(255,230,160,0.7), 0 1px 3px rgba(0,0,0,0.8)',
            wordBreak: 'break-word',
            maxWidth: '100%',
          }}>
            {dept}
          </span>
        </div>

        {/* Role name — lower zone, one word per line */}
        <div style={{
          position: 'absolute',
          top: s(258), left: s(42), right: s(42), height: s(112),
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          gap: 0,
        }}>
          {roleWords.map((word, i) => (
            <span key={i} style={{
              fontFamily: 'TokyoDreams',
              color: '#D4B050',
              fontSize: s(roleFontSize),
              textAlign: 'center',
              letterSpacing: '0.1em',
              lineHeight: 1.3,
              textShadow: '0 0 16px rgba(220,170,60,0.75), 0 1px 3px rgba(0,0,0,0.9)',
              display: 'block',
            }}>
              {word}
            </span>
          ))}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [{ name: 'TokyoDreams', data: fontBuffer, style: 'normal' }],
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    },
  )
}
