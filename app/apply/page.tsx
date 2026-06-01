import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { ApplyWizard } from './ApplyWizard'
import { TrackPicker } from './TrackPicker'

export default async function ApplyPage({ searchParams }: { searchParams: { track?: string } }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? ''

  const [{ data: existing }, { data: volunteer }] = await Promise.all([
    supabaseAdmin.from('applications').select('id, status').eq('clerk_user_id', userId).maybeSingle(),
    supabaseAdmin.from('volunteers').select('id, status').eq('clerk_user_id', userId).maybeSingle(),
  ])

  // Send existing members/volunteers to their profile
  if (existing && existing.status === 'pending') redirect('/profile')
  if (existing && existing.status === 'rejected') redirect('/profile')
  if (existing && existing.status === 'approved') redirect('/profile#role-signup')
  if (volunteer?.status === 'active') redirect('/profile#role-signup')

  // No application yet → pick a track, or go straight to the form if track=member
  if (searchParams.track === 'member') return <ApplyWizard userEmail={email} />
  return <TrackPicker />
}
