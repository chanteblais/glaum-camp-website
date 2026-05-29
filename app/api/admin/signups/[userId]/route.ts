import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.publicMetadata?.role === 'admin' ? userId : null
}

// PATCH: clear role_id, schedule_event_id, or both
export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const update: Record<string, null> = {}
  if (body.clear_role) { update.role_id = null; update.role_approval_status = null }
  if (body.clear_shift) update.schedule_event_id = null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to clear' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('camp_signups')
    .update(update)
    .eq('clerk_user_id', params.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
