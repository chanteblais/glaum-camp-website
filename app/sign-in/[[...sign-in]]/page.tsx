import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@clerk/nextjs/server'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { redirect_url?: string }
}) {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  // Clerk's middleware passes redirect_url when protecting a route (e.g. /admin).
  // Forward it to accounts.dev so the user lands back where they intended.
  // Fall back to the home page if no redirect_url was supplied.
  const returnTo = searchParams.redirect_url || `${baseUrl}/`

  let safeReturn = `${baseUrl}/`
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

  redirect(
    `https://sweet-lionfish-23.accounts.dev/sign-in?redirect_url=${encodeURIComponent(safeReturn)}`
  )
}
