import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId, sessionId, sessionClaims } = await auth()
  
  let publicMetadata = null
  if (userId) {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    publicMetadata = user.publicMetadata
  }

  return NextResponse.json({
    userId,
    sessionId,
    sessionClaims,
    publicMetadata,
  })
}
