import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

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
  // Fall back to /profile if no redirect_url was supplied.
  const returnTo = searchParams.redirect_url || `${baseUrl}/profile`

  // Safety: only allow redirects back to our own origin
  const safeReturn =
    returnTo.startsWith('/') ? `${baseUrl}${returnTo}` : returnTo

  redirect(
    `https://sweet-lionfish-23.accounts.dev/sign-in?redirect_url=${encodeURIComponent(safeReturn)}`
  )
}
