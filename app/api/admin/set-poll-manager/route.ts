import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireAdmin } from '@/lib/admin-auth'

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
