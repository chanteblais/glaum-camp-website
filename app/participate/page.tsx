import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getApprovedMember } from '@/lib/members'
import { getRoleSignupData, getShiftSignupData, getSelfJoinGroups } from '@/lib/participate-data'
import { getMemberResourceView } from '@/lib/resources'
import { SignupSection, type SignupInitialData } from '@/app/profile/SignupSection'
import { GroupCommitments } from '@/app/profile/GroupCommitments'
import { ResourceCommitments } from '@/app/profile/ResourceCommitments'
import { Header } from '@/components/Header'

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Everything the page's sections need, in one parallel round-trip — the
  // same assembly the /api/signup, /api/shift-signups, /api/groups/membership
  // and /api/resources routes serve, so the sections render with their data
  // in place instead of fetching it after hydration.
  const [member, roleData, shiftData, selfJoinGroups, resourceLists] = await Promise.all([
    getApprovedMember(userId),
    getRoleSignupData(userId),
    getShiftSignupData(userId),
    getSelfJoinGroups(userId),
    getMemberResourceView(userId),
  ])
  if (!member) redirect('/profile')

  // The lib types the payloads loosely (they're built for JSON serialization);
  // the shapes are exactly what the client components' own types describe.
  const signupInitialData = { role: roleData, shifts: shiftData } as unknown as SignupInitialData

  return (
    <>
      <Header />
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>

        {/* Back link */}
        <a
          href="/profile"
          style={{ fontSize: '0.75rem', color: '#C8A848', opacity: 0.6, textDecoration: 'none', letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '2rem' }}
        >
          ← Back to profile
        </a>

        {/* Heading */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#C8A848', margin: '0 0 0.5rem', letterSpacing: '0.06em' }}>
            Your Role & Shift
          </h1>
          <p style={{ fontSize: '0.9rem', opacity: 0.55, margin: 0, lineHeight: 1.6 }}>
            Choose how you'll contribute to Glåüm. Pick a role that resonates and a shift that works for you.
          </p>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.25), transparent)', marginBottom: '2rem' }} />

        <SignupSection initialData={signupInitialData} />

        {/* Shared resources — claim the gear you'll bring. Above groups: needs
            are live and time-sensitive; group membership is a set-once choice. */}
        <div id="bring" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.25), transparent)', margin: '3rem 0 2rem' }} />

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#C8A848', margin: '0 0 0.5rem', letterSpacing: '0.06em' }}>
            Bring Something
          </h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.55, margin: 0, lineHeight: 1.6 }}>
            The camp runs on what we carry in together. Claim the gear you can bring — you can change your mind anytime.
          </p>
        </div>

        <ResourceCommitments initialLists={resourceLists} />

        {/* Self-join groups, grouped by collection (Contributions, Skills, …) */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.25), transparent)', margin: '3rem 0 2rem' }} />

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#C8A848', margin: '0 0 0.5rem', letterSpacing: '0.06em' }}>
            Your Groups
          </h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.55, margin: 0, lineHeight: 1.6 }}>
            Opt into the groups you'd like to be part of. You can update your choices anytime.
          </p>
        </div>

        <GroupCommitments initialGroups={selfJoinGroups} />

      </main>
    </>
  )
}
