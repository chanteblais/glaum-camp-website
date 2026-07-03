import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { ScheduleSection } from '@/components/ScheduleSection'
import { LeadUpGatherings } from './LeadUpGatherings'
import { Header } from '@/components/Header'
import { getMemberLeadUpEvents } from '@/lib/lead-up'

export default async function SchedulePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Gate + gatherings in one batch; the events are discarded on redirect. A
  // failed gatherings fetch degrades to undefined — the section then runs its
  // own mount fetch instead of erroring the page.
  const [{ data: application }, leadUpEvents] = await Promise.all([
    supabaseAdmin
      .from('members')
      .select('status')
      .eq('clerk_user_id', userId)
      .maybeSingle(),
    getMemberLeadUpEvents(userId).catch(() => undefined),
  ])

  // Only approved members can view schedule
  if (application?.status !== 'approved') redirect('/profile')

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Header />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '4.5rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        <div style={{ marginBottom: '2rem' }}>
          <a href="/" style={{ fontSize: '0.78rem', letterSpacing: '0.12em', color: '#C8A848', textDecoration: 'none', opacity: 0.55 }}>
            ← Back to camp
          </a>
        </div>

        <h1 style={{
          fontFamily: 'TokyoDreams, serif',
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          color: '#C8A848',
          textAlign: 'center',
          marginBottom: '0.5rem',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}>
          Schedule
        </h1>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.4), transparent)', margin: '2rem 0 3rem' }} />

        <LeadUpGatherings initialEvents={leadUpEvents} />

        <ScheduleSection />

      </div>
    </div>
  )
}
