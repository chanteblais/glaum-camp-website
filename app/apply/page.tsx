import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { ApplyForm } from './ApplyForm'
import { SignupSection } from '@/app/profile/SignupSection'
import Link from 'next/link'

export default async function ApplyPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? ''

  const { data: existing } = await supabaseAdmin
    .from('applications')
    .select('id, status')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  // Pending / rejected / cancelled → send to profile
  if (existing && existing.status !== 'approved') redirect('/profile')

  // Approved → show role & shift selection
  if (existing?.status === 'approved') {
    return (
      <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        <img src="/hands-left.svg" alt="" aria-hidden style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
        <img src="/hands-right.svg" alt="" aria-hidden style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />

        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <Link href="/profile" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.6 }}>
              ← Back to profile
            </Link>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '1rem', opacity: 0.85 }}>
              What If 2026
            </p>
            <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', lineHeight: 1.1, marginBottom: '0.75rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
              Choose Your Role & Shift
            </h1>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.8, opacity: 0.55, maxWidth: '480px', margin: '0 auto' }}>
              Select a camp role and sign up for a shift. You can update these at any time from this page.
            </p>
          </div>

          <SignupSection />
        </div>
      </div>
    )
  }

  // No application yet → show the application form
  return <ApplyForm userEmail={email} />
}
