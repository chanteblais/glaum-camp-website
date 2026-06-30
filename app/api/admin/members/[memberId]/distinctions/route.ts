import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { grantDistinction, revokeDistinction } from '@/lib/distinction-awards'

// Admin manual grant / revoke of a distinction for a member.
//   POST   { distinctionId, note? }      → grant
//   DELETE ?distinctionId=...            → revoke

async function requireAdmin(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.publicMetadata?.role === 'admin' ? userId : null
}

export async function POST(req: NextRequest, { params }: { params: { memberId: string } }) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { distinctionId, note } = await req.json().catch(() => ({}))
  if (typeof distinctionId !== 'string' || !distinctionId) {
    return NextResponse.json({ error: 'distinctionId required' }, { status: 400 })
  }

  const ok = await grantDistinction(params.memberId, distinctionId, adminId, typeof note === 'string' ? note : undefined)
  return ok
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Failed to grant' }, { status: 500 })
}

export async function DELETE(req: NextRequest, { params }: { params: { memberId: string } }) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const distinctionId = new URL(req.url).searchParams.get('distinctionId')
  if (!distinctionId) return NextResponse.json({ error: 'distinctionId required' }, { status: 400 })

  const ok = await revokeDistinction(params.memberId, distinctionId)
  return ok
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Failed to revoke' }, { status: 500 })
}
