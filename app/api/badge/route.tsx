import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { BADGE_BASE_PATH, getBadgeBaseMtime } from '@/lib/badge-version'

export const runtime = 'nodejs'

// Module-level cache: file buffers are read once per server instance. The badge
// buffer is re-read when badge_base.png changes (mtime check) so a swapped base
// image picks up without a server restart.
let _badgeBuffer: Buffer | null = null
let _badgeMtime = -1
let _fontBuffer: Buffer | null = null

async function getAssets(): Promise<{ badgeBuffer: Buffer; fontBuffer: Buffer }> {
  const mtime = await getBadgeBaseMtime()
  if (!_badgeBuffer || mtime !== _badgeMtime) {
    _badgeBuffer = await readFile(BADGE_BASE_PATH)
    _badgeMtime = mtime
    renderCache.clear() // base art changed — drop stale rendered badges
  }
  if (!_fontBuffer) {
    _fontBuffer = await readFile(path.join(process.cwd(), 'public/fonts/TokyoDreams.otf'))
  }
  return { badgeBuffer: _badgeBuffer, fontBuffer: _fontBuffer }
}

// Per-role+dept rendered image cache (avoids re-running Satori for the same combo)
const renderCache = new Map<string, Buffer>()

// Render at 2× for crisp text when downscaled for display.
// W/H must match the badge_base.png art aspect ratio (currently 365x424) — the
// art is drawn with fixed dimensions and no aspect preservation, so a frame
// that doesn't match the art's ratio stretches/warps it.
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

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
  'Content-Type': 'image/png',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') ?? ''
  const dept = searchParams.get('dept') ?? ''

  // getAssets() first: re-reads the base and clears the render cache if the art
  // changed, so the lookup below never returns a badge built on stale art.
  const { badgeBuffer, fontBuffer } = await getAssets()

  const cacheKey = `${role}__${dept}`
  const cached = renderCache.get(cacheKey)
  if (cached) {
    return new Response(cached.buffer as ArrayBuffer, { headers: CACHE_HEADERS })
  }
  const badgeDataUrl = `data:image/png;base64,${badgeBuffer.toString('base64')}`

  // Dept zone: 1x width=255, height=125 rendered but use 105 for fitting to guarantee breathing room
  const deptFontSize = fitFontSize(dept, 365 - 55 * 2, 105, 1.5, 24, 11)

  // Role zone: 1x height=122, effective fitting height=100 (22px breathing room top+bottom)
  // 4+ word roles use natural word-wrap (same as dept); shorter roles stack one word per line
  const roleWords = role.toUpperCase().split(' ')
  const isLongRole = roleWords.length >= 4
  const roleFontSize = (() => {
    const CHAR_RATIO = 0.88
    const zoneW = 365 - 42 * 2  // 281px
    const effectiveH = 100       // 122px zone minus 22px breathing room

    if (isLongRole) {
      // Natural wrapping — reuse fitFontSize word-wrap simulation
      return fitFontSize(role, zoneW, effectiveH, 1.3, 20, 11)
    }

    // One word per line — fit by longest word width & total stacked height
    const longestWord = Math.max(...roleWords.map(w => w.length))
    for (let size = 26; size >= 11; size--) {
      if (longestWord * size * CHAR_RATIO <= zoneW &&
          roleWords.length * size * 1.3 <= effectiveH) return size
    }
    return 11
  })()

  const imageResponse = new ImageResponse(
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

        {/* Role name — lower zone */}
        <div style={{
          position: 'absolute',
          top: s(258), left: s(42), right: s(42), height: s(122),
          // flex row (no flexDirection) mirrors the dept zone — required for Satori text wrapping
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {isLongRole ? (
            // 4+ words: natural centered wrapping, same layout as dept zone
            <span style={{
              fontFamily: 'TokyoDreams',
              color: '#D4B050',
              fontSize: s(roleFontSize),
              textAlign: 'center',
              letterSpacing: '0.1em',
              lineHeight: 1.3,
              textShadow: '0 0 16px rgba(220,170,60,0.75), 0 1px 3px rgba(0,0,0,0.9)',
              wordBreak: 'break-word',
              maxWidth: '100%',
            }}>
              {role.toUpperCase()}
            </span>
          ) : (
            // 1–3 words: one word per line stacking
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
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
          )}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [{ name: 'TokyoDreams', data: fontBuffer, style: 'normal' }],
    },
  )

  // Store in render cache for subsequent requests in this server instance
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
  renderCache.set(cacheKey, imageBuffer)

  return new Response(imageBuffer.buffer as ArrayBuffer, { headers: CACHE_HEADERS })
}
