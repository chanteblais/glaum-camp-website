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

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Find application by email
  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('id, clerk_user_id, first_name, last_name, email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  const clerkUserId = application?.clerk_user_id ?? null

  const deleted: string[] = []

  if (clerkUserId) {
    await supabaseAdmin.from('camp_signups').delete().eq('clerk_user_id', clerkUserId)
    deleted.push('camp_signups')

    await supabaseAdmin.from('user_notifications').delete().eq('clerk_user_id', clerkUserId)
    deleted.push('user_notifications')

    await supabaseAdmin.from('role_suggestions').delete().eq('clerk_user_id', clerkUserId)
    deleted.push('role_suggestions')
  }

  if (application) {
    await supabaseAdmin.from('applications').delete().eq('id', application.id)
    deleted.push('application')
  }

  if (deleted.length === 0) {
    return NextResponse.json({ error: `No application found for ${email}` }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    name: application ? `${application.first_name} ${application.last_name}` : email,
    deleted,
  })
}
