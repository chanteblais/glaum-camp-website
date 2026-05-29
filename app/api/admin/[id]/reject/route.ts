import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch application so we can notify the user
  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('clerk_user_id, first_name, preferred_name')
    .eq('id', params.id)
    .single()

  const { error } = await supabaseAdmin
    .from('applications')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the applicant
  if (application?.clerk_user_id) {
    await supabaseAdmin.from('user_notifications').insert([{
      clerk_user_id: application.clerk_user_id,
      event_type: 'application_rejected',
      message: 'The Many Hands have reviewed your application. Unfortunately it wasn\'t a fit for this gathering.',
    }])
  }

  return NextResponse.json({ success: true })
}
