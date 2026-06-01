import { auth, currentUser } from '@clerk/nextjs/server'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Section, Kicker, GoldDivider } from '@/components/Section'
import { ScheduleSection } from '@/components/ScheduleSection'
import { supabaseAdmin } from '@/lib/supabase'
import { AttunementStatus } from '@/app/profile/AttunementStatus'
import { DashboardCommitments } from '@/app/profile/DashboardCommitments'
import { PersonalSchedule } from '@/app/profile/PersonalSchedule'
import { HomePageEditor } from './HomePageEditor'

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
  let spotlightMember: { id: string; preferred_name: string | null; first_name: string | null; avatar_url: string | null; pronouns: string | null; clerk_user_id: string | null; find_at_camp?: string | null; role_name?: string | null; dept_name?: string | null } | null = null
  let spotlightPool: unknown[] = []
  let userFirstName: string | null = null
  type ActivityItem = { label: string; name: string; ts: string; avatar_url: string | null }
  let recentActivity: ActivityItem[] = []
  type Announcement = { id: string; title: string; body: string | null; pinned: boolean; created_at: string }
  let announcements: Announcement[] = []

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
      const [signupResult, eventsResult, spotlightResult, announcementsResult] = await Promise.all([
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
      ])

      campSignup = signupResult.data ?? null
      upcomingEvents = (eventsResult.data ?? []) as typeof upcomingEvents
      spotlightPool = spotlightResult.data ?? []
      announcements = (announcementsResult.data ?? []) as Announcement[]

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
      const pool = spotlightPool
      const picked = pool.length ? pool[Math.floor(Date.now() / 60000) % pool.length] : null
      if (picked?.clerk_user_id) {
        const { data: signupRow } = await supabaseAdmin
          .from('camp_signups')
          .select('roles(name, departments(name))')
          .eq('clerk_user_id', picked.clerk_user_id)
          .maybeSingle()
        const role = signupRow?.roles as { name: string; departments: { name: string } | null } | null
        spotlightMember = { ...picked, role_name: role?.name ?? null, dept_name: role?.departments?.name ?? null }
      } else {
        spotlightMember = picked
      }
    }
  }

  // ── Page content (editable by admin) ─────────────────────────
  const { data: contentRows } = await supabaseAdmin.from('page_content').select('key, value').then(r => r).catch(() => ({ data: null }))
  const pageContent: Record<string, string> = Object.fromEntries((contentRows ?? []).map(r => [r.key, r.value]))
  const c = (key: string, fallback: string) => pageContent[key] ?? fallback

  // ── Derived values ────────────────────────────────────────────
  const isApproved = application?.status === 'approved'

  const roleInfo = campSignup?.roles as { name?: string; description?: string | null; purpose?: string | null; departments?: { name?: string; icon?: string } | null } | null
  const shiftInfo = campSignup?.schedule_events as { title?: string; day?: string; time?: string; icon_type?: string } | null
  const badgeDeptName = roleInfo?.departments?.name ?? null
  const badgeRoleName = roleInfo?.name ?? null

  const VALID_CONTRIBUTIONS = ['Setup', 'Teardown', 'Decor', 'Other']
  const baseContributions: string[] = ((application?.setup_preference as string[] | null) ?? []).filter(v => VALID_CONTRIBUTIONS.includes(v))
  const isDecorRole = (badgeDeptName ?? '').toLowerCase().includes('decor')
  const contributions = isDecorRole && !baseContributions.includes('Decor') ? [...baseContributions, 'Decor'] : baseContributions

  const displayName = (application?.preferred_name as string | null) ?? (application?.first_name as string | null) ?? userFirstName ?? 'Welcome'

  const attunementTasks = [
    { id: 'approved',     label: 'Application Approved',  done: true },
    { id: 'photo',        label: 'Photo Uploaded',         done: !!(application?.avatar_url),  href: '/profile' },
    { id: 'contribution', label: 'Contribution Selected',  done: contributions.length > 0,      href: '/profile' },
    { id: 'role',         label: 'Role Selected',          done: !!campSignup?.role_id && campSignup?.role_approval_status !== 'pending', href: '/signup' },
    { id: 'shift',        label: 'Shift Assigned',         done: !!campSignup?.schedule_event_id, href: '/signup' },
  ]
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
          <style>{`
            .dash-grid       { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; align-items: start; margin-bottom: 1.25rem; }
            .dash-quote-card { display: block; }
            @media (max-width: 680px) {
              .dash-grid       { grid-template-columns: 1fr; }
              .dash-quote-card { display: none !important; }
            }
          `}</style>

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
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'url(/glaum-camp.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center 40%',
                filter: 'brightness(0.38) saturate(1.2)',
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, rgba(26,10,36,0.95) 0%, rgba(26,10,36,0.65) 55%, rgba(26,10,36,0.15) 100%)',
              }} />
              <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', width: '100%',
                padding: '2.25rem 2.5rem',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '2rem',
              }}>
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
                    <p style={{ fontSize: '0.85rem', fontStyle: 'italic', opacity: 0.65, marginBottom: '1.25rem', lineHeight: 1.6 }}>
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

            {/* ── ROW 1: Attunement + Commitments ── */}
            <div className="dash-grid">
              <AttunementStatus tasks={attunementTasks} />
              <DashboardCommitments
                contributions={contributions}
                role={roleInfo ? { name: roleInfo.name ?? '', description: roleInfo.description ?? null, purpose: roleInfo.purpose ?? null } : null}
                dept={roleInfo?.departments ? { name: roleInfo.departments.name ?? '', icon: roleInfo.departments.icon ?? null } : null}
                shift={shiftInfo ? { title: shiftInfo.title ?? '', day: shiftInfo.day ?? '', time: shiftInfo.time ?? '', icon_type: shiftInfo.icon_type ?? 'star' } : null}
                roleApprovalStatus={(campSignup?.role_approval_status as string | null) ?? null}
              />
            </div>

            {/* ── ANNOUNCEMENTS ── */}
            {announcements.length > 0 && (
              <div style={{ border: '1px solid rgba(200,168,72,0.25)', borderRadius: '1rem', background: 'rgba(10,0,20,0.5)', overflow: 'hidden', marginBottom: '1.25rem' }}>
                <div style={{ padding: '1rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(200,168,72,0.12)' }}>
                  <p style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, margin: 0 }}>
                    Announcements
                  </p>
                </div>
                <div>
                  {announcements.map((a, i) => (
                    <div key={a.id} style={{
                      padding: '1rem 1.5rem',
                      borderBottom: i < announcements.length - 1 ? '1px solid rgba(200,168,72,0.08)' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: a.body ? '0.35rem' : 0 }}>
                        {a.pinned && (
                          <span style={{ fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D239F8', border: '1px solid rgba(210,57,248,0.3)', borderRadius: '9999px', padding: '0.1rem 0.45rem', flexShrink: 0 }}>
                            Pinned
                          </span>
                        )}
                        <p style={{ fontSize: '0.9rem', color: '#C8A848', margin: 0, fontFamily: 'TokyoDreams, serif' }}>{a.title}</p>
                      </div>
                      {a.body && (
                        <p style={{ fontSize: '0.83rem', opacity: 0.7, margin: 0, lineHeight: 1.65 }}>{a.body}</p>
                      )}
                      <p style={{ fontSize: '0.68rem', opacity: 0.3, margin: '0.4rem 0 0' }}>{timeAgo(a.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ROW 2: Upcoming Gatherings ── */}
            <div>
              {(() => {
                const preCamp = upcomingEvents.filter(e => e.event_category === 'pre_camp')
                const atCamp = upcomingEvents.filter(e => e.event_category !== 'pre_camp')
                const EventList = ({ events, label, href }: { events: typeof upcomingEvents; label: string; href: string }) => (
                  <div style={{ border: '1px solid rgba(200,168,72,0.25)', borderRadius: '1rem', background: 'rgba(10,0,20,0.5)', overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid rgba(200,168,72,0.15)' }}>
                      <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '0.7rem', letterSpacing: '0.18em', color: '#C8A848', margin: 0, textTransform: 'uppercase', opacity: 0.9 }}>
                        {label}
                      </p>
                    </div>
                    <div style={{ padding: '0.5rem 0' }}>
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
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {preCamp.length > 0 && <EventList events={preCamp} label="Pre-Camp Gatherings" href="#schedule" />}
                    {atCamp.length > 0 && <EventList events={atCamp} label="Upcoming Gatherings" href="#schedule" />}
                    {upcomingEvents.length === 0 && <EventList events={[]} label="Upcoming Gatherings" href="#schedule" />}
                  </div>
                )
              })()}

            </div>

            {/* ── ROW 3: Meet a Member + Your Schedule ── */}
            {spotlightMember && (
              <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.25rem', alignItems: 'start', marginBottom: '1.25rem' }}>
              <div style={{
                position: 'relative',
                padding: '1.5rem',
                border: '1px solid rgba(200,168,72,0.2)',
                borderRadius: '1rem',
                background: 'rgba(10,0,20,0.6)',
                marginBottom: '1.25rem',
                overflow: 'hidden',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, margin: 0 }}>
                    Meet a Member
                  </p>
                  <span style={{ color: '#C8A848', opacity: 0.4, fontSize: '0.85rem' }}>✳︎</span>
                </div>

                {/* Body — photo left, info right */}
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                  {/* Avatar */}
                  <div style={{
                    flexShrink: 0, width: '110px', height: '110px', borderRadius: '50%',
                    overflow: 'hidden', border: '2px solid #6F491F',
                    boxShadow: '0 0 0 1px rgba(200,168,72,0.15)',
                    background: 'rgba(200,168,72,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {spotlightMember.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={spotlightMember.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '2rem', opacity: 0.2 }}>✦</span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.3rem', color: '#C8A848', margin: '0 0 0.1rem', lineHeight: 1.2 }}>
                      {spotlightMember.preferred_name || spotlightMember.first_name || 'Fellow Hand'}
                    </p>
                    {(spotlightMember.role_name || spotlightMember.dept_name) && (
                      <div style={{ margin: '0.3rem 0 0.65rem' }}>
                        {spotlightMember.role_name && (
                          <p style={{ fontSize: '0.82rem', opacity: 0.65, margin: 0, lineHeight: 1.5 }}>{spotlightMember.role_name}</p>
                        )}
                        {spotlightMember.dept_name && (
                          <p style={{ fontSize: '0.78rem', opacity: 0.4, margin: 0, lineHeight: 1.5 }}>{spotlightMember.dept_name}</p>
                        )}
                      </div>
                    )}
                    {spotlightMember.find_at_camp && (
                      <>
                        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.2), transparent)', margin: '0.6rem 0' }} />
                        <p style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.5, margin: '0 0 0.25rem', letterSpacing: '0.06em' }}>Currently exploring</p>
                        <p style={{ fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.6, margin: 0 }}>{spotlightMember.find_at_camp}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                  {/* Dot indicator — decorative, shows position in pool */}
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {Array.from({ length: Math.min(spotlightPool.length, 7) }).map((_, i) => {
                      const activeIdx = Math.floor(Date.now() / 60000) % spotlightPool.length
                      return (
                        <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', border: '1px solid rgba(200,168,72,0.4)', background: i === activeIdx % Math.min(spotlightPool.length, 7) ? '#C8A848' : 'transparent' }} />
                      )
                    })}
                  </div>
                  <a
                    href={`/members/${spotlightMember.clerk_user_id ?? spotlightMember.id}`}
                    style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.75 }}
                  >
                    VIEW PROFILE →
                  </a>
                </div>
              </div>

              {/* Your Schedule */}
              <div style={{ border: '1px solid rgba(200,168,72,0.25)', borderRadius: '1rem', background: 'rgba(10,0,20,0.5)', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid rgba(200,168,72,0.15)' }}>
                  <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '0.7rem', letterSpacing: '0.18em', color: '#C8A848', margin: 0, textTransform: 'uppercase', opacity: 0.9 }}>
                    Your Schedule
                  </p>
                </div>
                <div style={{ padding: '0.75rem 1rem' }}>
                  <PersonalSchedule userId={userId!} contributions={contributions} />
                </div>
              </div>
            </div>
            )}

            {/* ── RECENT ACTIVITY ── */}
            {recentActivity.length > 0 && (
              <div style={{ border: '1px solid rgba(200,168,72,0.2)', borderRadius: '1rem', background: 'rgba(10,0,20,0.5)', overflow: 'hidden', marginBottom: '1.25rem' }}>
                <div style={{ padding: '1rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(200,168,72,0.12)' }}>
                  <p style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, margin: 0 }}>
                    Recent Activity
                  </p>
                </div>
                <div>
                  {recentActivity.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      padding: '0.7rem 1.5rem',
                      borderBottom: i < recentActivity.length - 1 ? '1px solid rgba(200,168,72,0.07)' : 'none',
                    }}>
                      <div style={{
                        flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
                        overflow: 'hidden', border: '1px solid rgba(111,73,31,0.6)',
                        background: 'rgba(200,168,72,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.avatar_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={item.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: '0.65rem', opacity: 0.3 }}>✦</span>
                        }
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
            )}

            {/* ── MANY HANDS LINK ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
            padding: '3rem 1.5rem 4rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Ambient glow behind image */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '800px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(210,57,248,0.15) 0%, rgba(200,168,72,0.05) 50%, transparent 70%)',
              pointerEvents: 'none',
              filter: 'blur(40px)',
            }}
          />

          {/* Event label */}
          <p
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#D239F8',
              marginBottom: '2rem',
              opacity: 0.85,
            }}
          >
            What If 2026 · Theme Camp
          </p>

          {/* Hero image */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '900px',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              boxShadow: '0 0 60px rgba(210, 57, 248, 0.25), 0 0 120px rgba(200, 168, 72, 0.1), 0 32px 80px rgba(0,0,0,0.6)',
              border: '1px solid rgba(200, 168, 72, 0.2)',
            }}
          >
            <Image
              src="/glaum-camp.png"
              alt="Glåüm Camp — Gather, Connect, Attune. Sponsored by Shrimp™"
              width={1200}
              height={675}
              priority
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          {/* Tagline + CTAs */}
          <p
            style={{
              fontSize: 'clamp(1rem, 3vw, 1.2rem)',
              fontStyle: 'italic',
              maxWidth: '480px',
              lineHeight: 1.75,
              opacity: 0.8,
              marginTop: '2.5rem',
              marginBottom: '2.25rem',
            }}
          >
            {c('home_tagline', 'Built by many hands. Held by many hearts.')}
          </p>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(210,57,248,0.4), transparent)' }} />

        {/* ─── ABOUT ────────────────────────────────────────── */}
        <Section id="about">
          <Kicker>What is this, exactly</Kicker>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '1.5rem', lineHeight: 1.15, textAlign: 'center' }}>
            {c('home_about_heading', 'A camp. A collective.')}
          </h2>
          {c('home_about_body', '').split('\n\n').filter(Boolean).map((para, i) => (
            <p key={i} style={{ fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '1.25rem', fontStyle: i === 3 ? 'italic' : undefined, opacity: i === 3 ? 0.7 : undefined }}>
              {para}
            </p>
          ))}
        </Section>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)' }} />

        {/* ─── PARTICIPATE ──────────────────────────────────── */}
        <Section id="participate">
          <Kicker>How to be in it</Kicker>
          <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '1.5rem', textAlign: 'center' }}>
            {c('home_participate_heading', 'This Camp Runs on Participation')}
          </h2>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '2.5rem' }}>
            {c('home_participate_body', 'The Many Hands hold us all up. Sometimes we do the carrying. Sometimes we are carried. Everyone contributes in some way: setup, teardown, cooking, welcoming, cleaning, decorating, emotional support, infrastructure, care.')}
          </p>
          <div style={{ textAlign: 'center' }}>
          <a
            href="/apply"
            style={{
              display: 'inline-block',
              padding: '0.9rem 2.75rem',
              borderRadius: '9999px',
              border: '1px solid rgba(200,168,72,0.5)',
              color: '#FFFACD',
              textDecoration: 'none',
              letterSpacing: '0.12em',
              fontSize: '0.85rem',
              fontFamily: 'TokyoDreams, serif',
              backgroundColor: 'transparent',
              transition: 'all 0.25s',
            }}
          >
            Apply to Camp
          </a>
          </div>
        </Section>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)' }} />

        {/* ─── SCHEDULE ─────────────────────────────────────── */}
        <Section id="schedule" style={{ backgroundColor: 'rgba(210, 57, 248, 0.03)' }}>
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
