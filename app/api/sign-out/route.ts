import { auth, clerkClient, verifyToken } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || ''

  try {
    // Prefer the Clerk-verified session. Fall back to the raw __session cookie
    // only via verifyToken (networkless signature check against Clerk's JWKS
    // using CLERK_SECRET_KEY) so a forged cookie can never drive revocation —
    // sign-out still works mid-broken-session because the token stays valid
    // even when auth() can't resolve it.
    let userId: string | null = null
    const authed = await auth()
    if (authed.userId) {
      userId = authed.userId
    } else {
      const sessionCookie = cookieHeader
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('__session='))
        ?.split('=')
        .slice(1)
        .join('=')
      if (sessionCookie) {
        const payload = await verifyToken(sessionCookie, {
          secretKey: process.env.CLERK_SECRET_KEY,
        })
        userId = typeof payload.sub === 'string' ? payload.sub : null
      }
    }

    // Revoke all active sessions for this user
    if (userId) {
      const client = await clerkClient()
      const sessions = await client.sessions.getSessionList({ userId })
      await Promise.all(
        sessions.data.map(s => client.sessions.revokeSession(s.id))
      )
    }
  } catch (e: any) {
    // Session revocation failed silently — cookies still cleared below
  }

  // Delete session cookies only — NOT __clerk_db_jwt* (the dev browser token).
  // Clearing the dev browser cookie causes Clerk to bounce through accounts.dev
  // on the next page load to re-initialize it, which looks like a login page.
  const clerkCookies = cookieHeader
    .split(';')
    .map(c => c.trim().split('=')[0])
    .filter(name =>
      name.startsWith('__session') ||
      name.startsWith('__client_uat') ||
      name.startsWith('__refresh')
    )

  const origin = new URL(req.url).origin
  const response = NextResponse.redirect(`${origin}/`)
  clerkCookies.forEach(name => {
    response.cookies.set(name, '', { maxAge: 0, path: '/' })
  })
  return response
}
