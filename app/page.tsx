import { auth, currentUser } from '@clerk/nextjs/server'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Section, Kicker, GoldDivider } from '@/components/Section'
import { ScheduleSection } from '@/components/ScheduleSection'
import { supabaseAdmin } from '@/lib/supabase'
import { getMemberGroups } from '@/lib/groups'
import { buildAttunementChecklist } from '@/lib/attunement'

import { HomePageEditor } from './HomePageEditor'
import { supabaseResizedUrl } from '@/lib/supabase-image'
import { PollWidget } from './PollWidget'
import { SpotlightWidget, type SpotlightMember } from './SpotlightWidget'
import { ShoutoutWidget, type Shoutout } from './ShoutoutWidget'

export const dynamic = 'force-dynamic'

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default async function Home() {
  const { userId } = await auth()

  // ── Fetch member data when signed in ─────────────────────────
  let application: Record<string, unknown> | null = null
  let campSignup: Record<string, unknown> | null = null
  let upcomingEvents: { id: string; day: string; time: string; title: string; subtitle: string | null; icon_type: string; event_date: string | null; event_category: string }[] = []
  let spotlightPool: unknown[] = []
  let userFirstName: string | null = null
  type ActivityItem = { label: string; name: string; ts: string; avatar_url: string | null }
  let recentActivity: ActivityItem[] = []
  type Announcement = { id: string; title: string; body: string | null; pinned: boolean; created_at: string }
  let announcements: Announcement[] = []
  type PollRow = { id: string; question: string; options: string[]; allow_multiple: boolean; expires_at: string | null; initialCounts: number[]; initialUserVotes: number[] }
  let polls: PollRow[] = []
  let shoutouts: Shoutout[] = []
let isAdmin = false

  if (userId) {
    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress
    userFirstName = user?.firstName ?? null
    isAdmin = user?.publicMetadata?.role === 'admin'

    const { data: appRaw } = await supabaseAdmin
      .from('applications')
      .select('*')
      .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    application = appRaw?.status === 'cancelled' ? null : appRaw ?? null

    if (application?.status === 'approved') {
      const [signupResult, eventsResult, spotlightResult, announcementsResult, pollsResult, pollVotesResult, shoutoutsResult] = await Promise.all([
        supabaseAdmin
          .from('camp_signups')
          .select('role_id, schedule_event_id, role_approval_status, roles(name, description, purpose, department_id, departments(name, icon)), schedule_events(title, day, time, icon_type)')
          .eq('clerk_user_id', userId)
          .maybeSingle(),
        supabaseAdmin
          .from('schedule_events')
          .select('id, day, time, title, subtitle, icon_type, event_date, event_category')
          .eq('visible', true)
          .not('event_type', 'eq', 'camp_tending')
          .or(`event_date.is.null,event_date.lte.${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`)
          .or(`event_date.is.null,event_date.gte.${new Date().toISOString().slice(0, 10)}`)
          .order('event_date', { ascending: true, nullsFirst: false })
          .order('sort_order', { ascending: true })
          .limit(4),
        supabaseAdmin
          .from('applications')
          .select('id, preferred_name, first_name, avatar_url, pronouns, clerk_user_id, find_at_camp')
          .eq('status', 'approved')
          .neq('clerk_user_id', userId)
          .limit(12),
        supabaseAdmin
          .from('announcements')
          .select('id, title, body, pinned, created_at')
          .eq('visible', true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5),
        supabaseAdmin
          .from('polls')
          .select('id, question, options, allow_multiple, expires_at')
          .eq('visible', true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('poll_votes')
          .select('poll_id, option_index')
          .eq('clerk_user_id', userId),
        supabaseAdmin
          .from('shoutouts')
          .select('id, clerk_user_id, author_name, body, created_at')
          .eq('visible', true)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      campSignup = signupResult.data ?? null
      upcomingEvents = (eventsResult.data ?? []) as typeof upcomingEvents
      spotlightPool = spotlightResult.data ?? []
      announcements = (announcementsResult.data ?? []) as Announcement[]

      // Enrich shoutouts with each author's current avatar (no FK — join in JS).
      const shoutoutRows = (shoutoutsResult.data ?? []) as Omit<Shoutout, 'avatar_url'>[]
      if (shoutoutRows.length > 0) {
        const authorIds = Array.from(new Set(shoutoutRows.map(s => s.clerk_user_id)))
        const { data: authorRows } = await supabaseAdmin
          .from('applications')
          .select('clerk_user_id, avatar_url')
          .in('clerk_user_id', authorIds)
        const avatarMap = Object.fromEntries((authorRows ?? []).map(a => [a.clerk_user_id, a.avatar_url]))
        shoutouts = shoutoutRows.map(s => ({ ...s, avatar_url: avatarMap[s.clerk_user_id] ?? null }))
      }

      const rawPolls = (pollsResult.data ?? []) as { id: string; question: string; options: string[]; allow_multiple: boolean; expires_at: string | null }[]
      const userVoteRows = (pollVotesResult.data ?? []) as { poll_id: string; option_index: number }[]
      if (rawPolls.length > 0) {
        const pollIds = rawPolls.map(p => p.id)
        const { data: allVotes } = await supabaseAdmin.from('poll_votes').select('poll_id, option_index').in('poll_id', pollIds)
        polls = rawPolls.map(p => {
          const counts = Array(p.options.length).fill(0)
          for (const v of allVotes ?? []) {
            if (v.poll_id === p.id && v.option_index < counts.length) counts[v.option_index]++
          }
          const initialUserVotes = userVoteRows.filter(v => v.poll_id === p.id).map(v => v.option_index)
          return { ...p, initialCounts: counts, initialUserVotes }
        })
      }

      // Recent activity feed
      const { data: recentApproved } = await supabaseAdmin
        .from('applications')
        .select('preferred_name, first_name, reviewed_at, profile_updated_at, avatar_url')
        .eq('status', 'approved')
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending: false })
        .limit(10)

      const activityFeed: ActivityItem[] = []
      for (const row of recentApproved ?? []) {
        const name = row.preferred_name || row.first_name || 'A member'
        activityFeed.push({ label: 'joined the camp', name, ts: row.reviewed_at, avatar_url: row.avatar_url ?? null })
        if (row.profile_updated_at && row.profile_updated_at > row.reviewed_at) {
          activityFeed.push({ label: 'updated their profile', name, ts: row.profile_updated_at, avatar_url: row.avatar_url ?? null })
        }
      }
      activityFeed.sort((a, b) => b.ts.localeCompare(a.ts))
      recentActivity = activityFeed.slice(0, 6)

      // Batch-fetch role info for all spotlight pool members
      const pool = spotlightPool as SpotlightMember[]
      if (pool.length > 0) {
        const clerkIds = pool.map(m => m.clerk_user_id).filter(Boolean) as string[]
        const { data: signupRows } = await supabaseAdmin
          .from('camp_signups')
          .select('clerk_user_id, roles(name, departments(name))')
          .in('clerk_user_id', clerkIds)
        const roleMap = Object.fromEntries(
          (signupRows ?? []).map(r => {
            const rolesRaw = r.roles as { name: string; departments: { name: string }[] | null } | { name: string; departments: { name: string }[] | null }[] | null
            const role = (Array.isArray(rolesRaw) ? rolesRaw[0] : rolesRaw) as { name: string; departments: { name: string }[] | null } | null
            return [r.clerk_user_id, { role_name: role?.name ?? null, dept_name: role?.departments?.[0]?.name ?? null }]
          })
        )
        spotlightPool = pool.map(m => ({ ...m, ...( m.clerk_user_id ? roleMap[m.clerk_user_id] ?? {} : {}) }))
      }
    }
  }

  // ── Page content (editable by admin) ─────────────────────────
  const pageContentResult = await supabaseAdmin.from('page_content').select('key, value')
  const contentRows = pageContentResult.data
  const pageContent: Record<string, string> = Object.fromEntries((contentRows ?? []).map(r => [r.key, r.value]))
  const c = (key: string, fallback: string) => pageContent[key] ?? fallback

  // ── Dashboard layout (admin-configurable widget order) ────────
  const DEFAULT_WIDGET_ORDER = ['announcements', 'shoutouts', 'polls', 'events', 'spotlight', 'activity']
  let dashLayout: { order: string[]; hidden: string[]; widths?: Record<string, string> } = { order: DEFAULT_WIDGET_ORDER, hidden: [] }
  try {
    if (pageContent['dashboard_layout']) dashLayout = JSON.parse(pageContent['dashboard_layout'])
  } catch {}
  // Ensure any new widget IDs are appended if missing from saved order
  for (const id of DEFAULT_WIDGET_ORDER) {
    if (!dashLayout.order.includes(id)) dashLayout.order.push(id)
  }
  const visibleWidgets = dashLayout.order.filter(id => !dashLayout.hidden.includes(id))

  // ── Derived values ────────────────────────────────────────────
  const isApproved = application?.status === 'approved'

  const roleInfo = campSignup?.roles as { name?: string; description?: string | null; purpose?: string | null; departments?: { name?: string; icon?: string } | null } | null
  const shiftInfo = campSignup?.schedule_events as { title?: string; day?: string; time?: string; icon_type?: string } | null
  const badgeDeptName = roleInfo?.departments?.name ?? null
  const badgeRoleName = roleInfo?.name ?? null

  // Groups the member belongs to (replaces the old setup_preference "contributions").
  const contributions = (await getMemberGroups(application?.clerk_user_id as string | null)).map(g => g.name)

  const displayName = (application?.preferred_name as string | null) ?? (application?.first_name as string | null) ?? userFirstName ?? 'Welcome'

  // Attunement checklist — shared with the profile page via buildAttunementChecklist
  // so the home banner's outstanding count always matches the profile checklist.
  const attunementTasks = buildAttunementChecklist(pageContent['config_attunement_tasks'], {
    hasPhoto: !!application?.avatar_url,
    hasContribution: contributions.length > 0,
    roleDone: !!campSignup?.role_id && campSignup?.role_approval_status !== 'pending',
    hasShift: !!campSignup?.schedule_event_id,
    shiftSignupOpen: pageContent['config_shift_signup_open'] !== 'false',
  })
  const allAttuned = attunementTasks.every(t => t.done)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const WHAT_IF_DATE = new Date('2026-07-23T12:00:00')
  const daysUntil = Math.max(0, Math.ceil((WHAT_IF_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  // ── APPROVED MEMBER DASHBOARD ─────────────────────────────────
  if (isApproved) {
    return (
      <>
        <Header />
        <main style={{ paddingTop: '64px' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            .dash-quote-card { display: block; }
            [data-widget-id] { display: flex; flex-direction: column; }
            [data-widget-id] > * { flex: 1; }
            .dash-hero-inner { display: flex; width: 100%; padding: 2.25rem 2.5rem; align-items: center; justify-content: space-between; gap: 2rem; }
            .dash-spotlight  { display: grid; grid-template-columns: 5fr 7fr; gap: 1.25rem; align-items: start; }
            .dash-quicklinks { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
            @media (max-width: 680px) {
              .dash-quote-card { display: none !important; }
              [data-width="half"], [data-width="third"] { flex: 0 0 100% !important; }
              .dash-hero-inner { flex-direction: column; align-items: flex-start; padding: 1.5rem 1.25rem; gap: 1rem; }
              .dash-spotlight  { grid-template-columns: 1fr; }
              .dash-quicklinks { grid-template-columns: 1fr; }
            }
          ` }} />

          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem 6rem' }}>

            {/* ── HERO BANNER ── */}
            <div style={{
              position: 'relative',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              minHeight: '220px',
              display: 'flex',
              alignItems: 'stretch',
            }}>
              <Image
                src="/glaum-camp.jpg"
                alt=""
                fill
                priority
                sizes="(max-width: 1100px) 100vw, 1100px"
                style={{ objectFit: 'cover', objectPosition: 'center 40%', filter: 'brightness(0.38) saturate(1.2)' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, rgba(26,10,36,0.95) 0%, rgba(26,10,36,0.65) 55%, rgba(26,10,36,0.15) 100%)',
              }} />
              <div className="dash-hero-inner" style={{ position: 'relative', zIndex: 1 }}>
                {/* Left: greeting + countdown */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.68rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.65, marginBottom: '0.5rem' }}>
                    Good {greeting}
                  </p>
                  <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', color: '#C8A848', margin: '0 0 0.35rem', textShadow: '0 2px 20px rgba(0,0,0,0.9)', lineHeight: 1.15 }}>
                    Welcome back, {displayName}.
                  </h1>
                  <p style={{ fontSize: '0.88rem', opacity: 0.5, marginBottom: '0.5rem' }}>
                    {allAttuned ? 'Fully attuned.' : 'Attunement continues.'}
                  </p>
                  {c('home_tagline', '') && (
                    <p data-editable-key="home_tagline" style={{ fontSize: '0.85rem', fontStyle: 'italic', opacity: 0.65, marginBottom: '1.25rem', lineHeight: 1.6 }}>
                      {c('home_tagline', '')}
                    </p>
                  )}
                  {daysUntil > 0 && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.4rem 1rem',
                      border: '1px solid rgba(200,168,72,0.35)',
                      borderRadius: '9999px',
                      background: 'rgba(200,168,72,0.07)',
                      fontSize: '0.72rem', letterSpacing: '0.18em', color: '#C8A848',
                    }}>
                      ✦ {daysUntil} DAYS UNTIL WHAT IF
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* ── ATTUNEMENT BANNER (only when incomplete) ── */}
            {!allAttuned && (() => {
              const outstanding = attunementTasks.filter(t => !t.done).length
              return (
                <a
                  href="/profile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.75rem 1.25rem',
                    marginBottom: '1.25rem',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(200,168,72,0.25)',
                    background: 'rgba(200,168,72,0.06)',
                    textDecoration: 'none',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#C8A848', opacity: 0.85 }}>
                    <span style={{ fontFamily: 'TokyoDreams, serif', letterSpacing: '0.04em' }}>Attunement</span>
                    <span style={{ opacity: 0.5, margin: '0 0.5rem' }}>·</span>
                    <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                      {outstanding} outstanding {outstanding === 1 ? 'task' : 'tasks'}
                    </span>
                  </p>
                  <span style={{ fontSize: '0.75rem', color: '#C8A848', opacity: 0.45, flexShrink: 0 }}>View checklist →</span>
                </a>
              )
            })()}

            {/* ── WIDGETS (order + visibility controlled by admin) ── */}
            {(() => {
              const preCamp = upcomingEvents.filter(e => e.event_category === 'pre_camp')
              const atCamp = upcomingEvents.filter(e => e.event_category !== 'pre_camp')
              const EventList = ({ events, label, href }: { events: typeof upcomingEvents; label: string; href: string }) => (
                <div style={{ border: '1px solid rgba(200,168,72,0.25)', borderRadius: '1rem', background: 'rgba(10,0,20,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                  <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid rgba(200,168,72,0.15)' }}>
                    <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '0.7rem', letterSpacing: '0.18em', color: '#C8A848', margin: 0, textTransform: 'uppercase', opacity: 0.9 }}>
                      {label}
                    </p>
                  </div>
                  <div style={{ padding: '0.5rem 0', flex: 1 }}>
                    {events.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', opacity: 0.4, fontStyle: 'italic', textAlign: 'center', padding: '1.5rem' }}>
                        Nothing scheduled yet.
                      </p>
                    ) : events.map((ev, i) => (
                      <div key={ev.id} style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.9rem 1.5rem',
                        borderBottom: i < events.length - 1 ? '1px solid rgba(200,168,72,0.08)' : 'none',
                      }}>
                        <div style={{
                          flexShrink: 0, width: '64px', textAlign: 'center',
                          padding: '0.4rem 0.5rem',
                          border: '1px solid rgba(200,168,72,0.2)',
                          borderRadius: '0.5rem',
                          background: 'rgba(200,168,72,0.06)',
                        }}>
                          <p style={{ fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.65, margin: '0 0 0.1rem' }}>
                            {ev.day?.slice(0, 3)?.toUpperCase()}
                          </p>
                          <p style={{ fontSize: '0.65rem', color: '#C8A848', margin: 0, letterSpacing: '0.04em' }}>
                            {ev.time?.split(':').slice(0, 2).join(':') ?? ''}
                          </p>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.85rem', color: '#EDE0C8', margin: '0 0 0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.title}
                          </p>
                          {ev.subtitle && (
                            <p style={{ fontSize: '0.72rem', color: '#B0947A', margin: 0, opacity: 0.75 }}>{ev.subtitle}</p>
                          )}
                        </div>
                        <span style={{ color: '#C8A848', opacity: 0.25, fontSize: '0.8rem', flexShrink: 0 }}>›</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid rgba(200,168,72,0.1)' }}>
                    <a href={href} style={{ fontSize: '0.75rem', color: '#C8A848', opacity: 0.7, textDecoration: 'none' }}>
                      View full schedule →
                    </a>
                  </div>
                </div>
              )

              const widgetMap: Record<string, React.ReactNode> = {
                announcements: announcements.length > 0 ? (
                  <div style={{ border: '1px solid rgba(200,168,72,0.25)', borderRadius: '1rem', background: 'rgba(10,0,20,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                    <div style={{ padding: '1rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(200,168,72,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, margin: 0 }}>Announcements</p>
                    </div>
                    <div>
                      {announcements.map((a, i) => (
                        <div key={a.id} style={{ padding: '1rem 1.5rem', borderBottom: i < announcements.length - 1 ? '1px solid rgba(200,168,72,0.08)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: a.body ? '0.35rem' : 0 }}>
                            {a.pinned && <span style={{ fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D239F8', border: '1px solid rgba(210,57,248,0.3)', borderRadius: '9999px', padding: '0.1rem 0.45rem', flexShrink: 0 }}>Pinned</span>}
                            <p style={{ fontSize: '0.9rem', color: '#C8A848', margin: 0, fontFamily: 'TokyoDreams, serif' }}>{a.title}</p>
                          </div>
                          {a.body && <p style={{ fontSize: '0.83rem', opacity: 0.7, margin: 0, lineHeight: 1.65 }}>{a.body}</p>}
                          <p style={{ fontSize: '0.68rem', opacity: 0.3, margin: '0.4rem 0 0' }}>{timeAgo(a.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null,

                shoutouts: (
                  <ShoutoutWidget
                    initialShoutouts={shoutouts}
                    currentUserId={userId}
                    currentUserAvatar={(application?.avatar_url as string | null) ?? null}
                    isApproved={isApproved}
                    isAdmin={isAdmin}
                  />
                ),

                polls: <PollWidget polls={polls} />,

                events: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
                    {preCamp.length > 0 && <EventList events={preCamp} label="Pre-Camp Gatherings" href="/schedule" />}
                    {atCamp.length > 0 && <EventList events={atCamp} label="Upcoming Gatherings" href="/schedule" />}
                    {upcomingEvents.length === 0 && <EventList events={[]} label="Upcoming Gatherings" href="/schedule" />}
                  </div>
                ),

                spotlight: spotlightPool.length > 0 ? (
                  <SpotlightWidget
                    pool={spotlightPool as SpotlightMember[]}
                    initialIndex={Math.floor(Date.now() / 60000) % spotlightPool.length}
                  />
                ) : null,

                activity: recentActivity.length > 0 ? (
                  <div style={{ border: '1px solid rgba(200,168,72,0.2)', borderRadius: '1rem', background: 'rgba(10,0,20,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                    <div style={{ padding: '1rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(200,168,72,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, margin: 0 }}>Recent Activity</p>
                    </div>
                    <div>
                      {recentActivity.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.7rem 1.5rem', borderBottom: i < recentActivity.length - 1 ? '1px solid rgba(200,168,72,0.07)' : 'none' }}>
                          <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(111,73,31,0.6)', background: 'rgba(200,168,72,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {item.avatar_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={supabaseResizedUrl(item.avatar_url, 56) ?? ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: '0.65rem', opacity: 0.3 }}>✦</span>}
                          </div>
                          <p style={{ flex: 1, margin: 0, fontSize: '0.82rem', lineHeight: 1.4 }}>
                            <span style={{ color: '#C8A848', opacity: 0.9 }}>{item.name}</span>
                            <span style={{ opacity: 0.5 }}> {item.label}</span>
                          </p>
                          <span style={{ fontSize: '0.7rem', opacity: 0.3, flexShrink: 0 }}>{timeAgo(item.ts)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null,
              }

              const widths: Record<string, string> = { spotlight: 'third', ...(dashLayout.widths ?? {}) }
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'stretch' }}>
                  {visibleWidgets.map(id => {
                    const widget = widgetMap[id]
                    if (!widget) return null
                    const w = widths[id]
                    const isHalf = w === 'half'
                    const isThird = w === 'third'
                    return (
                      <div
                        key={id}
                        data-widget-id={id}
                        data-width={isHalf ? 'half' : isThird ? 'third' : 'full'}
                        style={{ flex: isThird ? '0 0 calc(33.333% - 0.833rem)' : isHalf ? '0 0 calc(50% - 0.625rem)' : '0 0 100%', minWidth: 0 }}
                      >
                        {widget}
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* ── MANY HANDS LINK ── */}
            <div className="dash-quicklinks" style={{ marginTop: '1.25rem' }}>
              <a href="/signup" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', border: '1px solid rgba(200,168,72,0.18)', borderRadius: '1rem', background: 'rgba(200,168,72,0.03)', textDecoration: 'none' }}>
                <div>
                  <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', margin: '0 0 0.2rem' }}>Role & Shift</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.45, margin: 0 }}>Choose your role and shift</p>
                </div>
                <span style={{ fontSize: '1rem', color: '#C8A848', opacity: 0.4 }}>→</span>
              </a>
              <a href="/members" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', border: '1px solid rgba(200,168,72,0.18)', borderRadius: '1rem', background: 'rgba(200,168,72,0.03)', textDecoration: 'none' }}>
                <div>
                  <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', margin: '0 0 0.2rem' }}>Many Hands</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.45, margin: 0 }}>View your fellow camp members</p>
                </div>
                <span style={{ fontSize: '1rem', color: '#C8A848', opacity: 0.4 }}>→</span>
              </a>
            </div>

          </div>
        </main>

        {isAdmin && <HomePageEditor initialContent={pageContent} />}
      </>
    )
  }

  // ── PUBLIC MARKETING PAGE ─────────────────────────────────────
  return (
    <>
      <Header />

      <main style={{ paddingTop: '64px' }}>

        {/* ─── HERO ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '3.5rem 1.5rem 5rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Ambient glow */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '35%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '900px',
              height: '600px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(210,57,248,0.12) 0%, rgba(200,168,72,0.04) 50%, transparent 70%)',
              pointerEvents: 'none',
              filter: 'blur(50px)',
            }}
          />

          {/* Event kicker */}
          <p
            style={{
              fontSize: '0.68rem',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: '#D239F8',
              marginBottom: '1.25rem',
              opacity: 0.85,
            }}
          >
            What If 2026 · Theme Camp
          </p>

          {/* Wordmark */}
          <h1
            style={{
              fontFamily: 'TokyoDreams, serif',
              fontSize: 'clamp(3.5rem, 12vw, 7rem)',
              color: '#C8A848',
              margin: '0 0 0.25rem',
              lineHeight: 1,
              textShadow: '0 0 40px rgba(210,57,248,0.5), 0 0 80px rgba(210,57,248,0.2), 0 4px 20px rgba(0,0,0,0.8)',
              letterSpacing: '-0.01em',
            }}
          >
            Glåüm
          </h1>

          {/* Sponsored by */}
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.3, marginBottom: '2.5rem' }}>
            Sponsored by Shrimp™
          </p>

          {/* Hero image */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '900px',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              boxShadow: '0 0 60px rgba(210,57,248,0.2), 0 0 120px rgba(200,168,72,0.08), 0 32px 80px rgba(0,0,0,0.7)',
              border: '1px solid rgba(200,168,72,0.18)',
            }}
          >
            <Image
              src="/glaum-camp.jpg"
              alt="Glåüm Camp — Gather, Connect, Attune."
              width={1200}
              height={675}
              priority
              style={{ width: '100%', height: 'auto', display: 'block', filter: 'brightness(0.9) saturate(1.1)' }}
            />
            {/* Bottom fade into ink */}
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              height: '40%',
              background: 'linear-gradient(to top, rgba(26,10,36,0.7), transparent)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Tagline */}
          <p
            style={{
              fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
              fontStyle: 'italic',
              maxWidth: '460px',
              lineHeight: 1.8,
              opacity: 0.7,
              marginTop: '2.5rem',
              marginBottom: '2rem',
              fontFamily: 'var(--font-libre-baskerville)',
            }}
          >
            {c('home_tagline', 'Built by many hands. Held by many hearts.')}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="/apply"
              style={{
                display: 'inline-block',
                padding: '0.85rem 2.5rem',
                borderRadius: '9999px',
                border: '1px solid rgba(200,168,72,0.6)',
                background: 'rgba(200,168,72,0.1)',
                color: '#FFFACD',
                textDecoration: 'none',
                letterSpacing: '0.14em',
                fontSize: '0.8rem',
                fontFamily: 'TokyoDreams, serif',
              }}
            >
              Apply to Camp
            </a>
            <a
              href="/sign-in"
              style={{
                display: 'inline-block',
                padding: '0.85rem 2.5rem',
                borderRadius: '9999px',
                border: '1px solid rgba(243,237,230,0.15)',
                background: 'transparent',
                color: '#F3EDE6',
                textDecoration: 'none',
                letterSpacing: '0.14em',
                fontSize: '0.8rem',
                fontFamily: 'TokyoDreams, serif',
                opacity: 0.65,
              }}
            >
              Sign In
            </a>
          </div>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(210,57,248,0.35), transparent)' }} />

        {/* ─── ABOUT ────────────────────────────────────────── */}
        <Section id="about">
          <Kicker>What is this, exactly</Kicker>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '2rem', lineHeight: 1.15, textAlign: 'center' }}>
            {c('home_about_heading', 'A camp. A collective.')}
          </h2>
          <div style={{
            border: '1px solid rgba(200,168,72,0.15)',
            borderRadius: '1.25rem',
            background: 'rgba(10,0,20,0.45)',
            padding: '2rem 2.5rem',
          }}>
            {c('home_about_body', '').split('\n\n').filter(Boolean).map((para, i) => (
              <p key={i} style={{ fontSize: '1.05rem', lineHeight: 1.85, marginBottom: '1.25rem', fontStyle: i === 3 ? 'italic' : undefined, opacity: i === 3 ? 0.65 : 0.85, fontFamily: 'var(--font-libre-baskerville)' }}>
                {para}
              </p>
            ))}
          </div>
        </Section>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.15), transparent)' }} />

        {/* ─── PRINCIPLES ───────────────────────────────────── */}
        <Section id="principles">
          <Kicker>How we show up</Kicker>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '2.5rem', lineHeight: 1.15, textAlign: 'center' }}>
            Our Principles
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {[
              { title: 'Dignity', body: 'Every person deserves to be treated with dignity and respect.' },
              { title: 'Participation', body: 'Communities thrive when people contribute within their capacity.' },
              { title: 'Stewardship', body: 'No one person should be responsible for carrying the whole community.' },
              { title: 'Communication', body: 'We strive to communicate honestly, directly, and in good faith.' },
            ].map(({ title, body }) => (
              <div key={title} style={{
                border: '1px solid rgba(200,168,72,0.18)',
                borderRadius: '1.25rem',
                background: 'rgba(10,0,20,0.45)',
                padding: '1.75rem 2rem',
              }}>
                <p style={{
                  fontFamily: 'TokyoDreams, serif',
                  fontSize: '1.1rem',
                  color: '#C8A848',
                  margin: '0 0 0.75rem',
                  letterSpacing: '0.04em',
                }}>
                  {title}
                </p>
                <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.3), transparent)', marginBottom: '0.9rem' }} />
                <p style={{
                  fontSize: '0.97rem',
                  lineHeight: 1.8,
                  opacity: 0.75,
                  margin: 0,
                  fontFamily: 'var(--font-libre-baskerville)',
                }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.15), transparent)' }} />

        {/* ─── PARTICIPATE ──────────────────────────────────── */}
        <Section id="participate">
          <Kicker>How to be in it</Kicker>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '2rem', textAlign: 'center' }}>
            {c('home_participate_heading', 'This Camp Runs on Participation')}
          </h2>
          <div style={{
            border: '1px solid rgba(200,168,72,0.15)',
            borderRadius: '1.25rem',
            background: 'rgba(10,0,20,0.45)',
            padding: '2rem 2.5rem',
            marginBottom: '2.5rem',
          }}>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.85, margin: 0, opacity: 0.85, fontFamily: 'var(--font-libre-baskerville)' }}>
              {c('home_participate_body', 'The Many Hands hold us all up. Sometimes we do the carrying. Sometimes we are carried. Everyone contributes in some way: setup, teardown, cooking, welcoming, cleaning, decorating, emotional support, infrastructure, care.')}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <a
              href="/apply"
              style={{
                display: 'inline-block',
                padding: '0.9rem 2.75rem',
                borderRadius: '9999px',
                border: '1px solid rgba(200,168,72,0.55)',
                background: 'rgba(200,168,72,0.1)',
                color: '#FFFACD',
                textDecoration: 'none',
                letterSpacing: '0.14em',
                fontSize: '0.82rem',
                fontFamily: 'TokyoDreams, serif',
              }}
            >
              Apply to Camp
            </a>
          </div>
        </Section>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.15), transparent)' }} />

        {/* ─── SCHEDULE ─────────────────────────────────────── */}
        <Section id="schedule">
          <Kicker>When things happen</Kicker>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '3rem', textAlign: 'center' }}>
            Schedule
          </h2>
          <ScheduleSection />
        </Section>


      </main>

      <Footer />

      {isAdmin && <HomePageEditor initialContent={pageContent} />}
    </>
  )
}
