import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getApprovedMember } from '@/lib/members'
import { getRadioFeed, getRadioNowData, getRadioStats } from '@/lib/radio'
import { Header } from '@/components/Header'
import { RadioNowStrip } from './RadioNowStrip'
import { RadioComposer, GoLiveBar } from './RadioComposer'
import { RadioFeed } from './RadioFeed'

export const dynamic = 'force-dynamic'

// Radio — the curated community feed (docs/radio.md). A stream of moments,
// not chat and not an audit log: members tune in to what's happening around
// camp. Members-only; writing is broadcasters-only.

const statIcon: Record<string, React.ReactNode> = {
  waves: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C8A848" strokeWidth="1.3" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="1.6" fill="#C8A848" stroke="none" />
      <path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M5.7 18.3a9 9 0 0 1 0-12.6M18.3 5.7a9 9 0 0 1 0 12.6" opacity="0.6" />
    </svg>
  ),
  tent: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C8A848" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4 3 19h18L12 4Z" />
      <path d="M12 12l-3.4 7h6.8L12 12Z" />
    </svg>
  ),
  medal: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C8A848" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="14" r="5" />
      <path d="M9 10 6.5 4M15 10l2.5-6M12 12.4l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 14.5l2-.3.9-1.8Z" />
    </svg>
  ),
  horn: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C8A848" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10v4h3l7 5V5l-7 5H4Z" />
      <path d="M17.5 9.5a4 4 0 0 1 0 5" />
    </svg>
  ),
}

export default async function RadioPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const member = await getApprovedMember(userId)
  if (!member) redirect('/profile')

  const [events, nowData, stats, user] = await Promise.all([
    getRadioFeed(60),
    getRadioNowData(),
    getRadioStats(),
    currentUser(),
  ])
  const isBroadcaster = user?.publicMetadata?.role === 'admin'

  const statCells: { icon: keyof typeof statIcon; value: number; label: string }[] = [
    { icon: 'waves', value: stats.postsThisWeek, label: 'on the air this week' },
    { icon: 'tent', value: stats.contributions, label: 'resources claimed' },
    { icon: 'medal', value: stats.achievements, label: 'distinctions awarded' },
    { icon: 'horn', value: stats.broadcasts, label: 'announcements shared' },
  ]

  return (
    <>
      <Header />
      {/* Child combinators in inline <style> need dangerouslySetInnerHTML —
          the server escapes `>` to `&gt;` and hydration trips (house gotcha). */}
      <style dangerouslySetInnerHTML={{ __html: `
        .radio-stats { display: grid; grid-template-columns: repeat(4, 1fr); }
        .radio-stats > div + div { border-left: 1px solid rgba(200,168,72,0.14); }
        @media (max-width: 640px) {
          .radio-stats { grid-template-columns: repeat(2, 1fr); row-gap: 1rem; }
          .radio-stats > div:nth-child(3) { border-left: none; }
        }
      ` }} />
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '5.5rem 1.5rem 6rem' }}>

        {/* ── Hero ── */}
        <div style={{ position: 'relative', padding: '1.5rem 0 2rem', overflow: 'hidden' }}>
          {/* Art slot: warm glow where the radio illustration will live
              (a future strike-batch piece in the medallion style). */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              right: '-4rem',
              top: '-5rem',
              width: '20rem',
              height: '16rem',
              background: 'radial-gradient(closest-side, rgba(200,168,72,0.14), rgba(210,57,248,0.05), transparent)',
              pointerEvents: 'none',
            }}
          />
          <span aria-hidden style={{ position: 'absolute', right: '3.5rem', top: '2rem', color: '#C8A848', opacity: 0.6, fontSize: '0.8rem' }}>✦</span>
          <span aria-hidden style={{ position: 'absolute', right: '7rem', top: '4.5rem', color: '#D239F8', opacity: 0.4, fontSize: '0.6rem' }}>✦</span>
          <span aria-hidden style={{ position: 'absolute', right: '2rem', top: '5.5rem', color: '#C8A848', opacity: 0.35, fontSize: '0.55rem' }}>✦</span>

          <h1
            style={{
              fontFamily: 'TokyoDreams, serif',
              fontSize: 'clamp(2.4rem, 7vw, 3.6rem)',
              color: '#C8A848',
              margin: 0,
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.9rem',
            }}
          >
            <span aria-hidden style={{ fontSize: '0.9rem', opacity: 0.55 }}>–✦</span>
            Radio
            <span aria-hidden style={{ fontSize: '0.9rem', opacity: 0.55 }}>✦–</span>
          </h1>
          <p
            style={{
              margin: '0.5rem 0 0 0.2rem',
              fontStyle: 'italic',
              fontSize: '1.02rem',
              lineHeight: 1.55,
              color: 'rgba(216,180,232,0.85)',
              maxWidth: '24rem',
            }}
          >
            the pulse of camp — tune in to what's happening around you.
          </p>
        </div>

        {/* ── Stats band ── */}
        <div
          className="radio-stats"
          style={{
            border: '1px solid rgba(200,168,72,0.16)',
            borderRadius: '0.9rem',
            background: 'rgba(243,237,230,0.03)',
            padding: '1.1rem 0.5rem',
            marginBottom: '1.75rem',
          }}
        >
          {statCells.map(cell => (
            <div key={cell.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', padding: '0 0.75rem' }}>
              <span aria-hidden style={{ opacity: 0.8, flexShrink: 0, display: 'flex' }}>{statIcon[cell.icon]}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '1.25rem', color: '#C8A848', lineHeight: 1.1 }}>{cell.value}</span>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#F3EDE6', opacity: 0.5, lineHeight: 1.35 }}>{cell.label}</span>
              </span>
            </div>
          ))}
        </div>

        <RadioComposer isBroadcaster={isBroadcaster} />

        <RadioNowStrip welcome={nowData.welcome} todayEvents={nowData.todayEvents} />

        <RadioFeed events={events} />

        {isBroadcaster && <GoLiveBar />}

      </main>
    </>
  )
}
