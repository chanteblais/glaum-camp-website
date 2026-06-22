import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { CommitmentsSection } from '@/app/profile/CommitmentsSection'
import { Header } from '@/components/Header'
import { supabaseResizedUrl } from '@/lib/supabase-image'
import { getMemberGroups, groupCommitmentMeta } from '@/lib/groups'

export default async function MemberPage({ params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Only approved members can view other profiles
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const { data: viewer } = await supabaseAdmin
    .from('applications')
    .select('status')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .eq('status', 'approved')
    .maybeSingle()

  if (!viewer) redirect('/profile')

  // Fetch target member
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)

  const { data: member } = await supabaseAdmin
    .from('applications')
    .select('id, first_name, preferred_name, pronouns, avatar_url, clerk_user_id')
    .eq('status', 'approved')
    .eq(isUuid ? 'id' : 'clerk_user_id', params.id)
    .maybeSingle()

  if (!member) notFound()

  // Fetch their camp signup with role + dept + shift
  const { data: campSignup } = member.clerk_user_id
    ? await supabaseAdmin
        .from('camp_signups')
        .select('role_id, schedule_event_id, role_approval_status, roles(name, description, purpose, department_id, departments(name, icon)), schedule_events(title, day, time, icon_type)')
        .eq('clerk_user_id', member.clerk_user_id)
        .maybeSingle()
    : { data: null }

  const roleInfo = campSignup?.roles as { name?: string; description?: string | null; purpose?: string | null; departments?: { name?: string; icon?: string } | null } | null
  const shiftInfo = campSignup?.schedule_events as { title?: string; day?: string; time?: string; icon_type?: string } | null

  // Groups this member belongs to (replaces the old setup_preference "contributions").
  const memberGroups = await getMemberGroups(member.clerk_user_id as string | null)
  const contributions = memberGroups.map(g => g.name)
  const groupMeta = groupCommitmentMeta(memberGroups)

  const displayName = member.preferred_name || member.first_name || 'Member'
  const badgeRoleName = roleInfo?.name ?? null
  const badgeDeptName = roleInfo?.departments?.name ?? null

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
      <Header />
      <style>{`
        .member-badge-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1.5rem; margin-bottom: 1rem; }
        .member-badge-left { display: flex; justify-content: flex-end; }
        @media (max-width: 560px) {
          .member-badge-row  { grid-template-columns: 1fr; justify-items: center; }
          .member-badge-left { justify-content: center; }
          .member-badge-spacer { display: none; }
        }
      `}</style>

      <img src="/hands-left.svg"  alt="" aria-hidden role="presentation" style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden role="presentation" style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />

      <main aria-labelledby="member-heading" style={{ maxWidth: '1100px', margin: '0 auto', padding: '6rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        {/* Badge + avatar row */}
        <div style={{ marginBottom: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="member-badge-row">
            <div className="member-badge-left">
              {badgeRoleName && badgeDeptName ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/badge?role=${encodeURIComponent(badgeRoleName)}&dept=${encodeURIComponent(badgeDeptName)}`}
                  alt={`${displayName}'s ${badgeRoleName} role badge`}
                  width={175}
                  height={203}
                  style={{ display: 'block', transform: 'translate(-40px, -28px)', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6)) drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
                />
              ) : <div />}
            </div>

            {/* Avatar */}
            <div style={{
              width: '260px', height: '260px',
              borderRadius: '50%',
              border: '3px solid #6F491F',
              boxShadow: '0 0 0 1px rgba(60,35,10,0.6), 0 0 20px rgba(111,73,31,0.25), 0 8px 32px rgba(0,0,0,0.55)',
              background: 'rgba(200,168,72,0.08)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {member.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={supabaseResizedUrl(member.avatar_url, 520) ?? ''} alt={`${displayName}'s avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span aria-hidden="true" style={{ fontFamily: 'TokyoDreams, serif', fontSize: '3rem', color: '#C8A848', opacity: 0.5 }}>
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="member-badge-spacer" aria-hidden="true" />
          </div>

          {/* Name + meta */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '0.3rem', opacity: 0.85 }}>
              Approved Camper
            </p>
            <h1 id="member-heading" style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', marginBottom: '0.15rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
              {displayName}
            </h1>
            {member.pronouns && (
              <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '0.6rem' }}>{member.pronouns}</p>
            )}
            <a
              href={`/messages/${member.clerk_user_id}`}
              aria-label={`Send a message to ${displayName}`}
              style={{
                display: 'inline-block',
                marginTop: '0.75rem',
                padding: '0.45rem 1.25rem',
                borderRadius: '9999px',
                border: '1px solid rgba(210,57,248,0.35)',
                color: '#D239F8',
                fontSize: '0.78rem',
                letterSpacing: '0.1em',
                textDecoration: 'none',
                opacity: 0.85,
                transition: 'all 0.15s',
                fontFamily: 'TokyoDreams, serif',
              }}
            >
              <span aria-hidden="true">✉ </span>Message
            </a>
          </div>
        </div>

        {/* Commitments — same card as personal profile */}
        <CommitmentsSection
          contributions={contributions}
          role={roleInfo ? { name: roleInfo.name ?? '', description: roleInfo.description ?? null, purpose: roleInfo.purpose ?? null } : null}
          dept={roleInfo?.departments ? { name: roleInfo.departments.name ?? '', icon: roleInfo.departments.icon ?? null } : null}
          shift={shiftInfo ? { title: shiftInfo.title ?? '', day: shiftInfo.day ?? '', time: shiftInfo.time ?? '', icon_type: shiftInfo.icon_type ?? 'star' } : null}
          roleApprovalStatus={campSignup?.role_approval_status ?? null}
          contributionTypes={groupMeta}
          title="Commitments"
          compact
        />

      </main>
    </div>
  )
}
