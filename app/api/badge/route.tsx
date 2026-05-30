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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') ?? ''
  const dept = searchParams.get('dept') ?? ''

  const [badgeBuffer, fontBuffer] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/badge_base.png')),
    readFile(path.join(process.cwd(), 'public/fonts/TokyoDreams.otf')),
  ])

  const badgeDataUrl = `data:image/png;base64,${badgeBuffer.toString('base64')}`

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
        }}>
          <span style={{
            fontFamily: 'TokyoDreams',
            color: '#F5EDD8',
            fontSize: s(24),
            textAlign: 'center',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            lineHeight: 1.5,
            textShadow: '0 0 12px rgba(255,230,160,0.7), 0 1px 3px rgba(0,0,0,0.8)',
          }}>
            {dept}
          </span>
        </div>

        {/* Role name — lower zone, below gold divider */}
        <div style={{
          position: 'absolute',
          top: s(258), left: s(42), right: s(42), height: s(112),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'TokyoDreams',
            color: '#D4B050',
            fontSize: s(26),
            textAlign: 'center',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            lineHeight: 1.3,
            textShadow: '0 0 16px rgba(220,170,60,0.75), 0 1px 3px rgba(0,0,0,0.9)',
          }}>
            {role}
          </span>
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
