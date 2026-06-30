import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { mergeMemberConfig, mergeVolunteerConfig } from '@/lib/form-config'
import { DEFAULT_AGREEMENT_ITEMS, DEFAULT_ATTENDANCE_OPTIONS, parseTrackCopy } from '@/lib/site-config'
import { parseContributionTypes } from '@/lib/application-options'
import { ApplyWizard } from './ApplyWizard'
import { TrackPicker } from './TrackPicker'

export default async function ApplyPage({ searchParams }: { searchParams: { track?: string; admin_preview?: string } }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? ''

  const isAdminPreview = searchParams.admin_preview === '1'

  // Check if requester is admin (for preview bypass)
  let isAdmin = false
  if (isAdminPreview) {
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    isAdmin = clerkUser.publicMetadata?.role === 'admin'
  }

  const [{ data: existing }, { data: volunteer }, { data: configRows }] = await Promise.all([
    supabaseAdmin.from('members').select('id, status').eq('clerk_user_id', userId).maybeSingle(),
    supabaseAdmin.from('volunteers').select('id, status').eq('clerk_user_id', userId).maybeSingle(),
    supabaseAdmin.from('page_content').select('key, value').in('key', [
      'config_member_form',
      'config_volunteer_form',
      'member_acknowledgements',
      'member_attendance_options',
      'community_contribution_types',
      'config_track_picker',
    ]),
  ])

  const configMap = Object.fromEntries((configRows ?? []).map(r => [r.key, r.value]))

  let memberRaw: object = {}
  let volunteerRaw: object = {}
  try { if (configMap['config_member_form']) memberRaw = JSON.parse(configMap['config_member_form']) } catch { /* use defaults */ }
  try { if (configMap['config_volunteer_form']) volunteerRaw = JSON.parse(configMap['config_volunteer_form']) } catch { /* use defaults */ }

  let agreementItems: string[] = DEFAULT_AGREEMENT_ITEMS
  let attendanceOptions: string[] = DEFAULT_ATTENDANCE_OPTIONS
  try { if (configMap['member_acknowledgements']) agreementItems = JSON.parse(configMap['member_acknowledgements']) } catch { /* use defaults */ }
  try { if (configMap['member_attendance_options']) attendanceOptions = JSON.parse(configMap['member_attendance_options']) } catch { /* use defaults */ }
  const contributionTypes = parseContributionTypes(configMap['community_contribution_types'])

  const memberConfig = mergeMemberConfig(memberRaw)
  const volunteerConfig = mergeVolunteerConfig(volunteerRaw)
  const trackCopy = parseTrackCopy(configMap['config_track_picker'])

  const memberOpen = memberConfig.open
  const volunteerOpen = volunteerConfig.open

  // Skip redirect checks for admin previews
  if (!isAdmin) {
    if (existing && existing.status === 'pending') redirect('/profile')
    if (existing && existing.status === 'rejected') redirect('/profile')
    if (existing && existing.status === 'approved') redirect('/profile#role-signup')
    if (volunteer?.status === 'active') redirect('/profile#role-signup')
  }

  // Member track
  if (searchParams.track === 'member') {
    if (!memberOpen && !isAdmin) {
      return <ClosedPage message="Camp member applications are not currently open." />
    }
    // All groups — a "Group selection" field (if the admin added one) picks which
    // of these it offers via the field's own config (field.options).
    const { data: selectableGroups } = await supabaseAdmin
      .from('groups')
      .select('id, name, description')
      .order('sort_order', { ascending: true })
    return <ApplyWizard userEmail={email} formConfig={memberConfig} agreementItems={agreementItems} attendanceOptions={attendanceOptions} contributionTypes={contributionTypes} selectableGroups={selectableGroups ?? []} />
  }

  // Both closed → generic closed state
  if (!memberOpen && !volunteerOpen && !isAdmin) {
    return <ClosedPage message="Applications to Glåüm are not currently open. Check back soon." />
  }

  return <TrackPicker hideMember={!memberOpen && !isAdmin} hideVolunteer={!volunteerOpen && !isAdmin} copy={trackCopy} />
}

function ClosedPage({ message }: { message: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '2.5rem', color: '#C8A848', marginBottom: '0.5rem', textShadow: '0 0 40px rgba(200,168,72,0.4)' }}>✦</p>
        <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#C8A848', marginBottom: '1rem' }}>Applications Closed</h1>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.8, opacity: 0.55, marginBottom: '2rem' }}>{message}</p>
        <a href="/" style={{ padding: '0.75rem 2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.5)', color: '#C8A848', textDecoration: 'none', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
          ← Return home
        </a>
      </div>
    </div>
  )
}
