import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/profile(.*)', '/admin(.*)', '/apply(.*)', '/volunteer(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (req.nextUrl.pathname === '/api/sign-out') {
    return
  }

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
}
