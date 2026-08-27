import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { hasAdminRole } from '@/lib/admin-auth'

const isProtectedRoute = createRouteMatcher(['/profile(.*)', '/admin(.*)', '/apply(.*)', '/volunteer(.*)'])

// Central admin wall (2026-08-27 security review follow-up): every /admin page
// and /api/admin route requires the admin role HERE, before any handler runs —
// a route that forgets its own requireAdmin() call is no longer exposed. The
// per-route gates stay (defense in depth; they also resolve the userId).
//
// /api/admin/polls is the one deliberate exception: poll management is open to
// members an admin granted `canManagePolls` (lib/poll-auth.ts requirePollManager
// gates it in-route), and the home-dashboard PollWidget calls it as those
// members. scripts/check-route-auth.mjs still asserts it carries its gate.
const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)'])
const isPollManagerRoute = createRouteMatcher(['/api/admin/polls(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (req.nextUrl.pathname === '/api/sign-out') {
    return
  }

  if (isAdminRoute(req) && !isPollManagerRoute(req)) {
    const { userId, sessionClaims } = await auth()
    const isApi = req.nextUrl.pathname.startsWith('/api/')
    if (!userId) {
      if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      await auth.protect() // Clerk sign-in redirect for pages
      return
    }
    if (!(await hasAdminRole(userId, sessionClaims))) {
      return isApi
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/', req.url))
    }
    return
  }

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
}
