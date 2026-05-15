import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { ApplyForm } from './ApplyForm'

export default async function ApplyPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? ''

  // If they already submitted an application, send them to their profile
  const { data: existing } = await supabaseAdmin
    .from('applications')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (existing) redirect('/profile')

  return <ApplyForm userEmail={email} />
}
