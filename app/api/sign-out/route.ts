import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  // Parse session + user ID directly from the __session JWT (no auth() needed)
  const cookieHeader = req.headers.get('cookie') || ''

  const sessionCookie = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('__session='))
    ?.split('=')
    .slice(1)
    .join('=')

  if (sessionCookie) {
    try {
      const payload = JSON.parse(
        Buffer.from(sessionCookie.split('.')[1], 'base64url').toString()
      )
      const sessionId = payload.sid
      const userId = payload.sub
      const client = await clerkClient()

      // Revoke all active sessions for this user
      if (userId) {
        const sessions = await client.sessions.getSessionList({ userId })
        await Promise.all(
          sessions.data.map(s => client.sessions.revokeSession(s.id))
        )
      }
    } catch (e: any) {
      // Session revocation failed silently — cookies still cleared below
    }
  }

  // Delete every Clerk cookie
  const clerkCookies = cookieHeader
    .split(';')
    .map(c => c.trim().split('=')[0])
    .filter(name =>
      name.startsWith('__session') ||
      name.startsWith('__client_uat') ||
      name.startsWith('__clerk') ||
      name.startsWith('__refresh')
    )

  const origin = new URL(req.url).origin
  const response = NextResponse.redirect(`${origin}/`)
  clerkCookies.forEach(name => {
    response.cookies.set(name, '', { maxAge: 0, path: '/' })
  })
  return response
}
