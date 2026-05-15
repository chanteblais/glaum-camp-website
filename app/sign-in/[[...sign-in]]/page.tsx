import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@clerk/nextjs/server'

function getBaseUrl(headersList: Headers) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (configuredSiteUrl && !configuredSiteUrl.includes('localhost')) {
    return configuredSiteUrl.replace(/\/$/, '')
  }

  const forwardedHost = headersList.get('x-forwarded-host')
  const forwardedProto = headersList.get('x-forwarded-proto')
  const host = forwardedHost || headersList.get('host') || process.env.VERCEL_URL || 'localhost:3000'
  const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https')

  return `${protocol}://${host}`
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { redirect_url?: string }
}) {
  const headersList = await headers()
  const baseUrl = getBaseUrl(headersList)

  // Clerk's middleware passes redirect_url when protecting a route (e.g. /admin).
  // Forward it to accounts.dev so the user lands back where they intended.
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

  redirect(
    `https://sweet-lionfish-23.accounts.dev/sign-in?redirect_url=${encodeURIComponent(safeReturn)}`
  )
}
