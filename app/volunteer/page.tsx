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

  // Redirect if already signed up
  const { data: existing } = await supabaseAdmin
    .from('volunteers')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (existing) redirect('/profile')

  // Redirect if already has a camp application
  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('id')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .maybeSingle()

  if (application) redirect('/profile')

  return (
    <VolunteerForm
      userEmail={email}
      userFirstName={firstName}
      userLastName={lastName}
    />
  )
}
