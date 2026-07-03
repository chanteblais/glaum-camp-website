import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireAdmin } from '@/lib/admin-auth'

// POST { targetUserId, grant: boolean }
export async function POST(req: Request) {
  const callerId = await requireAdmin()
  if (!callerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { targetUserId, grant } = await req.json()
  if (!targetUserId || typeof grant !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Prevent removing your own admin role
  if (!grant && targetUserId === callerId) {
    return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 })
  }

  const client = await clerkClient()
  await client.users.updateUserMetadata(targetUserId, {
    publicMetadata: { role: grant ? 'admin' : null },
  })

  return NextResponse.json({ success: true })
}
