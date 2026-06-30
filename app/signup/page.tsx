import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { SignupSection } from '@/app/profile/SignupSection'
import { GroupCommitments } from '@/app/profile/GroupCommitments'
import { Header } from '@/components/Header'

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? ''

  const { data: application } = await supabaseAdmin
    .from('members')
    .select('id, status')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!application || application.status !== 'approved') redirect('/profile')

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

        <SignupSection />

        {/* Contribution groups — opt into Setup / Teardown / Decor crews */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.25), transparent)', margin: '3rem 0 2rem' }} />

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#C8A848', margin: '0 0 0.5rem', letterSpacing: '0.06em' }}>
            Your Contributions
          </h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.55, margin: 0, lineHeight: 1.6 }}>
            Opt into the crews you'd like to help with — like setup, teardown, and decor. Join as many as you like; you can change these anytime.
          </p>
        </div>

        <GroupCommitments />

      </main>
    </>
  )
}
