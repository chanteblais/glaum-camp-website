import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { SignIn } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { resolveSiteOrigin } from '@/lib/site-origin'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { redirect_url?: string }
}) {
  const headersList = await headers()
  const baseUrl = resolveSiteOrigin(headersList)

  // Clerk's middleware passes redirect_url when protecting a route (e.g. /admin).
  // Fall back to the home page if no redirect_url was supplied.
  const returnTo = searchParams.redirect_url || `${baseUrl}/?signed_in=1`

  let safeReturn = `${baseUrl}/?signed_in=1`
  if (returnTo.startsWith('/')) {
    safeReturn = `${baseUrl}${returnTo}`
  } else {
    try {
      const parsedReturnTo = new URL(returnTo)
      if (parsedReturnTo.origin === baseUrl) {
        safeReturn = parsedReturnTo.toString()
      }
    } catch {
      // Keep the profile fallback for malformed redirect targets.
    }
  }

  const { userId } = await auth()
  if (userId) {
    redirect(safeReturn)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1rem',
      }}
    >
      <SignIn
        routing="path"
        path="/sign-in"
        forceRedirectUrl={safeReturn}
        fallbackRedirectUrl={safeReturn}
        signUpFallbackRedirectUrl={safeReturn}
      />
    </div>
  )
}
