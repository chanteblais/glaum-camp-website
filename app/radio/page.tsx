import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getApprovedMember } from '@/lib/members'
import { getRadioFeed, getRadioNowData, getRadioStats } from '@/lib/radio'
import { Header } from '@/components/Header'
import { RadioHero } from './RadioHero'
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
    { icon: 'waves', value: stats.postsThisWeek, label: 'broadcasts this week' },
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
        .radio-stat { display: flex; align-items: center; gap: 0.75rem; justify-content: center; padding: 0 0.75rem; min-width: 0; }
        .radio-stat + .radio-stat { border-left: 1px solid rgba(200,168,72,0.14); }
        .radio-stat-icon { opacity: 0.8; flex-shrink: 0; display: flex; }
        .radio-stat-num { display: block; font-size: 1.25rem; color: #C8A848; line-height: 1.1; }
        .radio-stat-label { display: block; font-size: 0.68rem; color: #F3EDE6; opacity: 0.5; line-height: 1.35; }
        /* one row on mobile too — everything just gets smaller */
        @media (max-width: 640px) {
          .radio-stat { gap: 0.35rem; padding: 0 0.25rem; }
          .radio-stat-icon svg { width: 15px; height: 15px; }
          .radio-stat-num { font-size: 0.9rem; }
          .radio-stat-label { font-size: 0.5rem; }
        }
      ` }} />
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '5.5rem 1.5rem 6rem' }}>

        {/* ── Hero (RadioHero: waves mark, diamond rule, script subtitle,
               frequency waveform — her banner mockup) ── */}
        <RadioHero />

        {/* ── Stats band ── */}
        <div
          className="radio-stats"
          style={{
            border: '1px solid rgba(200,168,72,0.16)',
            borderRadius: '0.9rem',
            background: 'rgba(243,237,230,0.03)',
            padding: '0.65rem 0.4rem',
            marginBottom: '1.75rem',
          }}
        >
          {statCells.map(cell => (
            <div key={cell.label} className="radio-stat">
              <span aria-hidden className="radio-stat-icon">{statIcon[cell.icon]}</span>
              <span style={{ minWidth: 0 }}>
                <span className="radio-stat-num">{cell.value}</span>
                <span className="radio-stat-label">{cell.label}</span>
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
