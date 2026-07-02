import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { NotificationBell } from '@/app/admin/NotificationBell'
import { AdminNav } from '@/app/admin/AdminNav'
import { MembersDropdown } from './MembersDropdown'
import { getGroupNamesByUser } from '@/lib/groups'
import { getShiftEventByUser } from '@/lib/shift-signups'
import { getAttentionItems, getAdminRunway } from '@/lib/admin-attention'

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

  // "Needs attention" digest + runway strip (docs/admin-ux-handoff.md A1/A2).
  const [attention, runway] = await Promise.all([getAttentionItems(), getAdminRunway()])

  // Fetch data
  const [
    { data: applications },
    { data: signups },
    { data: volunteers },
    { data: notifications },
    { data: polls },
    { data: pollVotes },
  ] = await Promise.all([
    supabaseAdmin
      .from('applications')
      .select('id, first_name, last_name, preferred_name, email, status, clerk_user_id, rideshare')
      .order('submitted_at', { ascending: false }),
    supabaseAdmin
      .from('camp_signups')
      .select('clerk_user_id, role_id, role_approval_status'),
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
    supabaseAdmin
      .from('polls')
      .select('id, question, options, visible, allow_multiple, expires_at, created_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('poll_votes')
      .select('poll_id, option_index, clerk_user_id'),
  ])

  const all = applications ?? []
  const approved = all.filter(a => a.status === 'approved')
  const pending = all.filter(a => a.status === 'pending')
  const activeVolunteers = volunteers ?? []

  // Build poll results
  type PollResult = {
    id: string
    question: string
    options: string[]
    visible: boolean
    allow_multiple: boolean
    expires_at: string | null
    created_at: string
    counts: number[]
    totalVoters: number
  }
  const pollResults: PollResult[] = (polls ?? []).map(p => {
    const options = p.options as string[]
    const counts = Array(options.length).fill(0)
    const voters = new Set<string>()
    for (const v of pollVotes ?? []) {
      if (v.poll_id === p.id && v.option_index < counts.length) {
        counts[v.option_index]++
        voters.add(v.clerk_user_id)
      }
    }
    return { ...p, options, counts, totalVoters: voters.size }
  })

  // Build signup lookup. Roles come from camp_signups; "has a shift" uses the
  // shared union with member_shift_signups so Overview agrees with Manage.
  const signupMap = new Map((signups ?? []).map(s => [s.clerk_user_id, s]))
  const shiftEventByUser = await getShiftEventByUser()

  // Members with signup status
  const members = approved.map(a => {
    const signup = a.clerk_user_id ? signupMap.get(a.clerk_user_id) : undefined
    const hasRole = !!signup?.role_id
    const hasShift = !!(a.clerk_user_id && shiftEventByUser[a.clerk_user_id])
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

  // Groups — one card per admin-configured group, so renames/additions in
  // Admin → Groups show up here without code changes.
  const [groupNamesByUser, { data: groupRows }] = await Promise.all([
    getGroupNamesByUser(),
    supabaseAdmin.from('groups').select('id, name').order('sort_order'),
  ])
  const memberGroupNames = (a: { clerk_user_id?: string | null }) => (a.clerk_user_id ? groupNamesByUser[a.clerk_user_id] ?? [] : [])
  const groupCards = (groupRows ?? []).map(g => ({
    id: g.id as string,
    name: g.name as string,
    members: approved.filter(a => memberGroupNames(a).includes(g.name)),
  }))
  const unassigned = approved.filter(a => memberGroupNames(a).length === 0)

  // Rideshare
  const RIDESHARE_OPTIONS = ['I need a ride', 'I can offer a ride', "I'm sorted", 'Not sure yet']
  const rideshareGroups = RIDESHARE_OPTIONS.map(option => ({
    label: option,
    members: approved.filter(a => a.rideshare === option),
  })).filter(g => g.members.length > 0)

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflowX: 'clip' }}>
      <img src="/hands-left.svg" alt="" aria-hidden style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        <AdminNav runway={runway} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <NotificationBell initialNotifications={notifications ?? []} />
        </div>

        <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#C8A848', marginBottom: '0.5rem', textAlign: 'center' }}>
          Overview
        </h1>
        <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          {pending.length} pending · {approved.length} approved
        </p>

        {/* ── NEEDS ATTENTION (A1) — the console's to-do surface ── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '0.85rem',
            border: attention.length > 0 ? '1px solid rgba(210,57,248,0.3)' : '1px solid rgba(200,168,72,0.15)',
            background: attention.length > 0 ? 'rgba(210,57,248,0.05)' : 'rgba(200,168,72,0.03)',
          }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: attention.length > 0 ? '#D239F8' : '#C8A848', opacity: 0.8, margin: '0 0 0.9rem' }}>
              Needs attention
            </p>
            {attention.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.55, fontStyle: 'italic' }}>
                All quiet{runway.daysToCamp !== null ? ` — ${runway.daysToCamp} day${runway.daysToCamp === 1 ? '' : 's'} to camp` : ''}.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {attention.map(item => (
                  <a
                    key={item.id}
                    href={item.href}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                      textDecoration: 'none', padding: '0.35rem 0', borderBottom: '1px solid rgba(200,168,72,0.07)',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', color: '#F3EDE6', opacity: 0.85 }}>{item.text}</span>
                    <span style={{ fontSize: '0.78rem', color: '#D239F8', letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {item.verb} →
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── PARTICIPATION OVERVIEW ── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, marginBottom: '1.25rem' }}>
            Participation
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={card()}>
              <p style={statLabel}>Approved Campers</p>
              <p style={statValue}>{approved.length}</p>
              {pending.length > 0 ? (
                <a href="/admin#people" style={{ ...statSub, display: 'inline-block', color: '#D239F8', opacity: 0.8, textDecoration: 'none' }}>
                  Review {pending.length} pending →
                </a>
              ) : (
                <p style={statSub}>none pending review</p>
              )}
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

        {/* ── GROUPS ── */}
        <section>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, marginBottom: '1.25rem' }}>
            Groups
          </p>

          {groupCards.length === 0 ? (
            <p style={{ fontSize: '0.85rem', opacity: 0.35, fontStyle: 'italic' }}>No groups configured yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {groupCards.map(g => (
                <div key={g.id} style={card()}>
                  <p style={statLabel}>{g.name}</p>
                  <p style={statValue}>{g.members.length}</p>
                  <MemberPills members={g.members} />
                </div>
              ))}
            </div>
          )}

          {unassigned.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ ...card(), opacity: 0.7 }}>
                <p style={statLabel}>In no group</p>
                <p style={{ ...statValue, fontSize: '1.5rem' }}>{unassigned.length}</p>
                <MemberPills members={unassigned} />
                <a href="/admin/configure#structure" style={{ display: 'inline-block', marginTop: '0.6rem', fontSize: '0.75rem', color: '#C8A848', opacity: 0.75, textDecoration: 'none' }}>
                  Assign in Groups →
                </a>
              </div>
            </div>
          )}
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

        {/* ── POLL RESULTS ── */}
        {pollResults.length > 0 && (
          <>
            <div style={divider} />
            <section>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, marginBottom: '1.25rem' }}>
                Poll Results
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {pollResults.map(poll => {
                  const total = poll.counts.reduce((a, b) => a + b, 0)
                  const expired = poll.expires_at ? new Date(poll.expires_at) < new Date() : false
                  return (
                    <div key={poll.id} style={{ ...card(), padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#EDE0C8', lineHeight: 1.45, flex: 1 }}>
                          {poll.question}
                        </p>
                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {!poll.visible && (
                            <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', color: '#888', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9999px', padding: '0.1rem 0.5rem' }}>
                              Hidden
                            </span>
                          )}
                          {expired && (
                            <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', color: '#ffb432', border: '1px solid rgba(255,180,50,0.25)', borderRadius: '9999px', padding: '0.1rem 0.5rem' }}>
                              Closed
                            </span>
                          )}
                          <span style={{ fontSize: '0.68rem', color: '#C8A848', opacity: 0.5, alignSelf: 'center' }}>
                            {poll.totalVoters} {poll.totalVoters === 1 ? 'voter' : 'voters'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        {poll.options.map((opt, i) => {
                          const count = poll.counts[i]
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0
                          const isTop = count > 0 && count === Math.max(...poll.counts)
                          return (
                            <div key={i}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                <span style={{ fontSize: '0.8rem', color: isTop ? '#C8A848' : '#F3EDE6', opacity: isTop ? 1 : 0.7 }}>
                                  {isTop && '✦ '}{opt}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#C8A848', opacity: 0.6, flexShrink: 0, marginLeft: '1rem' }}>
                                  {count} · {pct}%
                                </span>
                              </div>
                              <div style={{ height: '6px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  borderRadius: '9999px',
                                  background: isTop
                                    ? 'linear-gradient(90deg, #C8A848, #e8c868)'
                                    : 'rgba(200,168,72,0.35)',
                                  transition: 'width 0.4s ease',
                                }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {poll.allow_multiple && (
                        <p style={{ fontSize: '0.65rem', opacity: 0.3, margin: '0.75rem 0 0' }}>Multiple choice — total votes may exceed voters</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}

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
