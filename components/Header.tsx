import { auth } from '@clerk/nextjs/server'
import { resolveMember } from '@/lib/members'
import { HeaderClient, type NavAuthState } from './HeaderClient'

// Server side of the nav: resolves the signed-in member's state during the
// page render so the client header shows the right nav on first paint — no
// flash of the signed-out nav while /api/nav-auth round-trips. resolveMember
// is request-cached, so pages that already looked the member up share the query.
export async function Header() {
  let initialAuth: NavAuthState = { isSignedIn: false }
  try {
    const { userId } = await auth()
    if (userId) {
      const member = await resolveMember(userId)
      initialAuth = {
        isSignedIn: true,
        isApproved: member?.status === 'approved',
        firstName: member?.preferred_name ?? member?.first_name ?? null,
        email: member?.email ?? null,
        avatarUrl: member?.avatar_url ?? null,
      }
    }
  } catch {
    // Render the signed-out nav on any auth hiccup; the client's Clerk state
    // still corrects it after hydration.
  }
  return <HeaderClient initialAuth={initialAuth} />
}
