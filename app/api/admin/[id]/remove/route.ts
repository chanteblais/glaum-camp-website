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

  // Optional admin-supplied reason
  let reason = ''
  try {
    const body = await req.json()
    reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  } catch {
    // no body — fine
  }

  // Fetch application so we can clear their signups and notify them
  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('clerk_user_id, first_name, preferred_name')
    .eq('id', id)
    .single()

  // Soft-remove: mark cancelled, preserving the row (reversible by re-approving)
  const { error: updateError } = await supabaseAdmin
    .from('applications')
    .update({
      status: 'cancelled',
      cancel_reason: reason || 'Removed by a camp organizer.',
      cancelled_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Free up their role + shift slot
  if (application?.clerk_user_id) {
    await supabaseAdmin
      .from('camp_signups')
      .delete()
      .eq('clerk_user_id', application.clerk_user_id)

    // Notify the removed member
    const displayName = application.preferred_name || application.first_name || 'there'
    const message = 'Your membership for this gathering has been removed by the Many Hands.'
    await supabaseAdmin.from('user_notifications').insert([{
      clerk_user_id: application.clerk_user_id,
      event_type: 'membership_removed',
      message,
    }])

    const clerkUser = await client.users.getUser(application.clerk_user_id)
    const email = clerkUser.emailAddresses[0]?.emailAddress
    if (email) {
      await sendUserEmail(
        email,
        'An update on your Glåüm membership',
        `<p>Hi ${displayName},</p><p>${message}</p>${reason ? `<p>${reason}</p>` : ''}<p>If you believe this was a mistake, please reach out to the camp organizers.</p>`,
      )
    }
  }

  return NextResponse.json({ success: true })
}
