import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendUserEmail } from '@/lib/send-email'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  // Fetch application so we can notify the user
  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('clerk_user_id, first_name, preferred_name')
    .eq('id', id)
    .single()

  // Mark application as approved
  const { error: updateError } = await supabaseAdmin
    .from('applications')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Notify the applicant
  if (application?.clerk_user_id) {
    const displayName = application.preferred_name || application.first_name || 'Camper'
    const message = `Welcome to Glåüm, ${displayName}! Your application has been approved. 🎉`
    await supabaseAdmin.from('user_notifications').insert([{
      clerk_user_id: application.clerk_user_id,
      event_type: 'application_approved',
      message,
    }])

    const clerkUser = await client.users.getUser(application.clerk_user_id)
    const email = clerkUser.emailAddresses[0]?.emailAddress
    if (email) {
      await sendUserEmail(
        email,
        'Your Glåüm application has been approved!',
        `<p>Hi ${displayName},</p><p>Great news — your application to Glåüm has been approved! Head to your <a href="https://glaum.camp/profile">profile</a> to choose your role and shift.</p><p>See you at camp ✦</p>`,
      )
    }
  }

  return NextResponse.json({ success: true })
}
