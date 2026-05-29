import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { VolunteerForm } from './VolunteerForm'

export default async function VolunteerPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? ''
  const firstName = user?.firstName ?? ''
  const lastName = user?.lastName ?? ''

  // Redirect if already actively signed up (cancelled records can re-signup)
  const { data: existing } = await supabaseAdmin
    .from('volunteers')
    .select('id, status')
    .eq('clerk_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.status === 'active') redirect('/profile')

  // Redirect if already has an active camp application (cancelled can still volunteer)
  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('id, status')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (application && application.status !== 'cancelled') redirect('/profile')

  return (
    <VolunteerForm
      userEmail={email}
      userFirstName={firstName}
      userLastName={lastName}
    />
  )
}
