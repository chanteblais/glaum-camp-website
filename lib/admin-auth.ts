import { auth, clerkClient } from '@clerk/nextjs/server'

// Shared admin gate for pages and /api/admin routes. Reads the role from the
// session token when the Clerk instance is configured to include it
// (Dashboard → Sessions → Customize session token →
//   {"metadata": "{{user.public_metadata}}"}
// ) so the check costs no network call. Until that claim exists — or for
// sessions minted before it was added — falls back to the Clerk backend API
// read the routes used to do inline.
//
// Note: session claims refresh with the token (~60s), so promoting or demoting
// an admin takes effect on the member's next token refresh, not instantly.
export async function requireAdmin(): Promise<string | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return null

  // The claim is only ever a POSITIVE fast path. A metadata claim that exists
  // but lacks role === 'admin' must not settle the question — a differently
  // shaped dashboard customization or a token minted mid-config would lock
  // real admins out of every admin route (403 "Forbidden" on all saves).
  // Anything short of a confirmed admin claim falls through to the backend
  // read; actual admins with a healthy claim still skip the network call.
  const metadata = (sessionClaims as { metadata?: unknown } | null)?.metadata
  if (metadata && typeof metadata === 'object' && (metadata as { role?: unknown }).role === 'admin') {
    return userId
  }

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.publicMetadata?.role === 'admin' ? userId : null
}
