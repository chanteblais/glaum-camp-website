import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') return null
  return userId
}

// POST { targetUserId, grant: boolean } — admins grant/revoke poll management.
export async function POST(req: Request) {
  const callerId = await requireAdmin()
  if (!callerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { targetUserId, grant } = await req.json()
  if (!targetUserId || typeof grant !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Clerk shallow-merges publicMetadata, so setting canManagePolls leaves
  // role (and any other keys) untouched.
  const client = await clerkClient()
  await client.users.updateUserMetadata(targetUserId, {
    publicMetadata: { canManagePolls: grant ? true : null },
  })

  return NextResponse.json({ success: true })
}
