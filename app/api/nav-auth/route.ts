import { auth, clerkClient, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function getUserIdFromSessionCookie(cookieHeader: string) {
  const sessionCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('__session='))
    ?.split('=')
    .slice(1)
    .join('=')

  if (!sessionCookie) return null

  try {
    const payload = JSON.parse(
      Buffer.from(sessionCookie.split('.')[1], 'base64url').toString()
    )
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const { userId: authUserId } = await auth()
  const userId = authUserId ?? getUserIdFromSessionCookie(req.headers.get('cookie') || '')

  if (!userId) {
    return NextResponse.json(
      { isSignedIn: false },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const authUser = authUserId ? await currentUser() : null
  const client = authUser ? null : await clerkClient()
  const fallbackUser = client ? await client.users.getUser(userId) : null
  const user = authUser ?? fallbackUser

  if (!user) {
    return NextResponse.json(
      { isSignedIn: false },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const email = user.emailAddresses[0]?.emailAddress ?? null

  // Fetch avatar from whichever table has a record for this user
  let avatarUrl: string | null = null
  const { data: appRow } = await supabaseAdmin
    .from('applications')
    .select('avatar_url')
    .or(`clerk_user_id.eq.${userId}${email ? `,email.eq.${email}` : ''}`)
    .not('avatar_url', 'is', null)
    .limit(1)
    .maybeSingle()

  if (appRow?.avatar_url) {
    avatarUrl = appRow.avatar_url
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
      firstName: user.firstName ?? null,
      email,
      avatarUrl,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
