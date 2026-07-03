import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendUserEmail, APP_URL } from '@/lib/send-email'
import { setMemberStatus } from '@/lib/members'
import { requireAdmin } from '@/lib/admin-auth'
import { postSourcedRadioEvent } from '@/lib/radio'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireAdmin()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await clerkClient()

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

  // Phase 1 dual-write: mirror the approval onto the canonical member record.
  await setMemberStatus(application?.clerk_user_id ?? null, id, 'approved')

  // Notify the applicant
  let emailWarning: string | undefined
  if (application?.clerk_user_id) {
    const displayName = application.preferred_name || application.first_name || 'Camper'
    const message = `Welcome to Glåüm, ${displayName}! Your application has been approved. 🎉`
    await supabaseAdmin.from('user_notifications').insert([{
      clerk_user_id: application.clerk_user_id,
      event_type: 'application_approved',
      message,
    }])

    // Radio: announce the new member — once per member (re-approvals and the
    // migration-061 backfill both mean an event may already exist).
    const { data: alreadyOnAir } = await supabaseAdmin
      .from('radio_events')
      .select('id')
      .eq('kind', 'member')
      .eq('actor_clerk_id', application.clerk_user_id)
      .limit(1)
      .maybeSingle()
    if (!alreadyOnAir) {
      await postSourcedRadioEvent('member', {
        kind: 'member',
        message: `${displayName} joined the camp.`,
        icon: '✦',
        actorClerkId: application.clerk_user_id,
        actorName: displayName,
      })
    }

    const clerkUser = await client.users.getUser(application.clerk_user_id)
    const email = clerkUser.emailAddresses[0]?.emailAddress
    if (email) {
      const result = await sendUserEmail(
        email,
        'Your Glåüm application has been approved!',
        `<p>Hi ${displayName},</p><p>Great news — your application to Glåüm has been approved! Head to your <a href="${APP_URL}/profile">profile</a> to choose your role and shift.</p><p>See you at camp ✦</p>`,
      )
      // Approval itself succeeded (status + in-app notification); only the
      // email failed. Surface it so the admin knows to follow up manually
      // instead of assuming the member was emailed.
      if (!result.ok) emailWarning = `Application approved, but the email to ${email} failed to send: ${result.error}`
    } else {
      emailWarning = 'Application approved, but no email address was found for this member.'
    }
  }

  return NextResponse.json({ success: true, emailWarning })
}
