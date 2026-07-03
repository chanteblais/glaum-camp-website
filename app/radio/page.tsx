import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getApprovedMember } from '@/lib/members'
import { getRadioFeed, getRadioNowData } from '@/lib/radio'
import { Header } from '@/components/Header'
import { RadioNowStrip } from './RadioNowStrip'
import { RadioFeed } from './RadioFeed'

export const dynamic = 'force-dynamic'

// Radio — the public pulse of the community (docs/radio.md). Broadcast, not
// chat: members tune in to what's happening around camp. Members-only.
export default async function RadioPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const member = await getApprovedMember(userId)
  if (!member) redirect('/profile')

  const [events, nowData] = await Promise.all([getRadioFeed(60), getRadioNowData()])

  return (
    <>
      <Header />
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>

        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#C8A848', margin: '0 0 0.5rem', letterSpacing: '0.06em' }}>
            Radio
          </h1>
          <p style={{ fontSize: '0.9rem', opacity: 0.55, margin: 0, lineHeight: 1.6 }}>
            The pulse of camp — tune in to what's happening around you.
          </p>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.25), transparent)', marginBottom: '2rem' }} />

        <RadioNowStrip welcome={nowData.welcome} todayEvents={nowData.todayEvents} />

        <RadioFeed events={events} />

      </main>
    </>
  )
}
