import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ isSignedIn: false })
  }

  const user = await currentUser()

  return NextResponse.json({
    isSignedIn: true,
    firstName: user?.firstName ?? null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
  })
}
