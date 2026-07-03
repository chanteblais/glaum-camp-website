import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Only trust Clerk-verified sessions. If auth() hasn't caught up right
  // after sign-in, HeaderClient retries this endpoint — never fall back to
  // reading the session cookie without signature verification.
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { isSignedIn: false },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const user = await currentUser()

  if (!user) {
    return NextResponse.json(
      { isSignedIn: false },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const email = user.emailAddresses[0]?.emailAddress ?? null

  // Fetch application status + avatar
  let avatarUrl: string | null = null
  let isApproved = false

  const { data: appRow } = await supabaseAdmin
    .from('members')
    .select('avatar_url, status')
    .or(`clerk_user_id.eq.${userId}${email ? `,email.eq.${email}` : ''}`)
    .limit(1)
    .maybeSingle()

  if (appRow) {
    avatarUrl = appRow.avatar_url ?? null
    isApproved = appRow.status === 'approved'
  } else {
    const { data: volRow } = await supabaseAdmin
      .from('volunteers')
      .select('avatar_url')
      .eq('clerk_user_id', userId)
      .not('avatar_url', 'is', null)
      .limit(1)
      .maybeSingle()
    avatarUrl = volRow?.avatar_url ?? null
  }

  return NextResponse.json(
    {
      isSignedIn: true,
      isApproved,
      firstName: user.firstName ?? null,
      email,
      avatarUrl,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
