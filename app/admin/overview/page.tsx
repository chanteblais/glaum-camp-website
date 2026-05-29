import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { NotificationBell } from '@/app/admin/NotificationBell'
import { AdminTabBar } from '@/app/admin/AdminTabBar'
import { MembersDropdown } from './MembersDropdown'

const HOURS_PER_MEMBER = 3

const divider: React.CSSProperties = {
  height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)',
  margin: '2.5rem 0',
}

const card = (accent = 'gold'): React.CSSProperties => ({
  padding: '1.5rem',
  borderRadius: '1rem',
  border: accent === 'purple'
    ? '1px solid rgba(210,57,248,0.2)'
    : '1px solid rgba(200,168,72,0.15)',
  background: accent === 'purple'
    ? 'rgba(210,57,248,0.04)'
    : 'rgba(200,168,72,0.03)',
})

const statLabel: React.CSSProperties = {
  fontSize: '0.65rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: '#C8A848',
  opacity: 0.65,
  marginBottom: '0.35rem',
}

const statValue: React.CSSProperties = {
  fontFamily: 'TokyoDreams, serif',
  fontSize: '2.2rem',
  color: '#C8A848',
  lineHeight: 1,
  marginBottom: '0.25rem',
}

const statSub: React.CSSProperties = {
  fontSize: '0.78rem',
  opacity: 0.45,
}

export default async function OverviewPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') redirect('/')

  // Fetch data
  const [
    { data: applications },
    { data: signups },
    { data: volunteers },
    { data: notifications },
  ] = await Promise.all([
    supabaseAdmin
      .from('applications')
      .select('id, first_name, last_name, preferred_name, email, status, setup_preference, setup_limitations, setup_available, clerk_user_id, rideshare')
      .order('submitted_at', { ascending: false }),
    supabaseAdmin
      .from('camp_signups')
      .select('clerk_user_id, role_id, schedule_event_id, role_approval_status'),
    supabaseAdmin
      .from('volunteers')
      .select('id, first_name, last_name, preferred_name, email, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('admin_notifications')
      .select('id, application_id, event_type, message, details, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const all = applications ?? []
  const approved = all.filter(a => a.status === 'approved')
  const pending = all.filter(a => a.status === 'pending')
  const activeVolunteers = volunteers ?? []

  // Build signup lookup
  const signupMap = new Map((signups ?? []).map(s => [s.clerk_user_id, s]))

  // Members with signup status
  const members = approved.map(a => {
    const signup = a.clerk_user_id ? signupMap.get(a.clerk_user_id) : undefined
    const hasRole = !!signup?.role_id
    const hasShift = !!signup?.schedule_event_id
    const rolePending = signup?.role_approval_status === 'pending'
    return {
      id: a.id as string,
      displayName: (a.preferred_name || a.first_name || '?') as string,
      email: a.email as string,
      hasRole,
      hasShift,
      rolePending,
    }
  })

  const complete = members.filter(m => m.hasRole && m.hasShift && !m.rolePending).length
  const incomplete = members.length - complete

  // Hours
  const totalHours = approved.length * HOURS_PER_MEMBER
  const completedHours = complete * HOURS_PER_MEMBER
  const pendingHours = incomplete * HOURS_PER_MEMBER
  const volunteerHours = activeVolunteers.length * HOURS_PER_MEMBER

  // Contributions — derived from setup_preference
  const setupTeam = approved.filter(a => ((a.setup_preference as string[]) ?? []).includes('Setup'))
  const teardownTeam = approved.filter(a => ((a.setup_preference as string[]) ?? []).includes('Teardown'))
  const decorTeam = approved.filter(a => ((a.setup_preference as string[]) ?? []).includes('Decor'))
  const limitations = approved.filter(a => ((a.setup_limitations as string[]) ?? []).length > 0)
  const unassigned = approved.filter(a => ((a.setup_preference as string[]) ?? []).length === 0)

  // Rideshare
  const RIDESHARE_OPTIONS = ['I need a ride', 'I can offer a ride', "I'm sorted", 'Not sure yet']
  const rideshareGroups = RIDESHARE_OPTIONS.map(option => ({
    label: option,
    members: approved.filter(a => a.rideshare === option),
  })).filter(g => g.members.length > 0)

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
      <img src="/hands-left.svg" alt="" aria-hidden style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <a href="/" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.6 }}>
            ← Back to camp
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <NotificationBell initialNotifications={notifications ?? []} />
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: '#D239F8', opacity: 0.6 }}>ADMIN</span>
          </div>
        </div>

        <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#C8A848', marginBottom: '0.5rem', textAlign: 'center' }}>
          ManyHands Registry
        </h1>
        <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          {pending.length} pending · {approved.length} approved
        </p>

        <AdminTabBar />

        {/* ── PARTICIPATION OVERVIEW ── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, marginBottom: '1.25rem' }}>
            Participation
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={card()}>
              <p style={statLabel}>Approved Campers</p>
              <p style={statValue}>{approved.length}</p>
              <p style={statSub}>{pending.length} pending review</p>
            </div>
            <div style={card()}>
              <p style={statLabel}>Signup Complete</p>
              <p style={{ ...statValue, color: complete > 0 ? '#7dcf8e' : '#C8A848' }}>{complete}</p>
              <p style={statSub}>{incomplete} still to complete</p>
            </div>
            <div style={card('purple')}>
              <p style={{ ...statLabel, color: '#D239F8' }}>Active Volunteers</p>
              <p style={{ ...statValue, color: '#D239F8' }}>{activeVolunteers.length}</p>
              <p style={statSub}>outside volunteers</p>
            </div>
          </div>

          {/* Member list */}
          <div style={{ padding: '1.25rem 1.5rem', borderRadius: '0.85rem', border: '1px solid rgba(200,168,72,0.12)', background: 'rgba(255,255,255,0.02)' }}>
            <MembersDropdown members={members} />
          </div>
        </section>

        <div style={divider} />

        {/* ── HOURS ── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, marginBottom: '1.25rem' }}>
            Shift Hours ({HOURS_PER_MEMBER} per member)
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div style={card()}>
              <p style={statLabel}>Total Committed</p>
              <p style={statValue}>{totalHours}</p>
              <p style={statSub}>from {approved.length} approved campers</p>
            </div>
            <div style={card()}>
              <p style={statLabel}>Confirmed</p>
              <p style={{ ...statValue, color: '#7dcf8e' }}>{completedHours}</p>
              <p style={statSub}>{complete} members signed up</p>
            </div>
            <div style={card()}>
              <p style={statLabel}>Still Pending</p>
              <p style={{ ...statValue, color: incomplete > 0 ? '#ffb432' : '#7dcf8e' }}>{pendingHours}</p>
              <p style={statSub}>{incomplete} members not yet signed up</p>
            </div>
            <div style={card('purple')}>
              <p style={{ ...statLabel, color: '#D239F8' }}>Volunteer Hours</p>
              <p style={{ ...statValue, color: '#D239F8' }}>{volunteerHours}</p>
              <p style={statSub}>from {activeVolunteers.length} volunteers</p>
            </div>
          </div>
        </section>

        <div style={divider} />

        {/* ── SETUP & TEARDOWN ── */}
        <section>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, marginBottom: '1.25rem' }}>
            Setup & Teardown
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div style={card()}>
              <p style={statLabel}>Setup</p>
              <p style={statValue}>{setupTeam.length}</p>
              <MemberPills members={setupTeam} />
            </div>
            <div style={card()}>
              <p style={statLabel}>Teardown</p>
              <p style={statValue}>{teardownTeam.length}</p>
              <MemberPills members={teardownTeam} />
            </div>
            <div style={card()}>
              <p style={statLabel}>Decor</p>
              <p style={statValue}>{decorTeam.length}</p>
              <MemberPills members={decorTeam} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {limitations.length > 0 && (
              <div style={{ ...card(), borderColor: 'rgba(255,180,50,0.2)', background: 'rgba(255,180,50,0.03)' }}>
                <p style={{ ...statLabel, color: '#ffb432' }}>Noted limitations</p>
                <p style={{ ...statValue, fontSize: '1.5rem', color: '#ffb432' }}>{limitations.length}</p>
                <MemberPills members={limitations} />
              </div>
            )}
            {unassigned.length > 0 && (
              <div style={{ ...card(), opacity: 0.7 }}>
                <p style={statLabel}>Not yet answered</p>
                <p style={{ ...statValue, fontSize: '1.5rem' }}>{unassigned.length}</p>
                <MemberPills members={unassigned} />
              </div>
            )}
          </div>
        </section>

        <div style={divider} />

        {/* ── RIDESHARE ── */}
        <section>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, marginBottom: '1.25rem' }}>
            Rideshare
          </p>

          {rideshareGroups.length === 0 ? (
            <p style={{ fontSize: '0.85rem', opacity: 0.35, fontStyle: 'italic' }}>No rideshare responses yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {rideshareGroups.map(({ label, members }) => {
                const accent = label === 'I need a ride' ? 'rgba(210,57,248,0.2)'
                  : label === 'I can offer a ride' ? 'rgba(80,200,160,0.2)'
                  : 'rgba(200,168,72,0.15)'
                const color = label === 'I need a ride' ? '#D239F8'
                  : label === 'I can offer a ride' ? '#50c8a0'
                  : '#C8A848'
                return (
                  <div key={label} style={{ ...card(), borderColor: accent }}>
                    <p style={{ ...statLabel, color }}>{label}</p>
                    <p style={{ ...statValue, fontSize: '1.5rem', color }}>{members.length}</p>
                    <MemberPills members={members} />
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

function MemberPills({ members }: { members: Array<{ preferred_name?: unknown; first_name?: unknown; last_name?: unknown }> }) {
  if (members.length === 0) return <p style={{ fontSize: '0.78rem', opacity: 0.35, fontStyle: 'italic', marginTop: '0.5rem' }}>None yet</p>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.6rem' }}>
      {members.map((m, i) => {
        const name = (m.preferred_name || m.first_name || '?') as string
        return (
          <span key={i} style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'rgba(200,168,72,0.08)', border: '1px solid rgba(200,168,72,0.15)', fontSize: '0.72rem', opacity: 0.8 }}>
            {name}
          </span>
        )
      })}
    </div>
  )
}
