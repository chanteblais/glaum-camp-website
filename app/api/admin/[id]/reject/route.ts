import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendUserEmail } from '@/lib/send-email'
import { setMemberStatus } from '@/lib/members'

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

  // Dual-write: mirror the rejection onto the canonical member record.
  await setMemberStatus(application?.clerk_user_id ?? null, params.id, 'rejected')

  // Notify the applicant
  if (application?.clerk_user_id) {
    const message = 'The Many Hands have reviewed your application. Unfortunately it wasn\'t a fit for this gathering.'
    await supabaseAdmin.from('user_notifications').insert([{
      clerk_user_id: application.clerk_user_id,
      event_type: 'application_rejected',
      message,
    }])

    const clerkUser = await client.users.getUser(application.clerk_user_id)
    const email = clerkUser.emailAddresses[0]?.emailAddress
    if (email) {
      await sendUserEmail(
        email,
        'An update on your Glåüm application',
        `<p>Hi ${application.preferred_name || application.first_name || 'there'},</p><p>${message}</p><p>Thank you for your interest in Glåüm.</p>`,
      )
    }
  }

  return NextResponse.json({ success: true })
}
