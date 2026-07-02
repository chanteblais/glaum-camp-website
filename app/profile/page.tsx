import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { RememberSignedIn } from '@/components/RememberSignedIn'
import { Header } from '@/components/Header'
import { NotificationPreferences } from './NotificationPreferences'
import { ProfileSettings } from './ProfileSettings'
import { VolunteerSettings } from './VolunteerSettings'
import { AvatarUpload } from '@/components/AvatarUpload'
import { SignupSection } from './SignupSection'
import { CommitmentsSection } from './CommitmentsSection'
import { TaskStatus } from './TaskStatus'
import { PersonalSchedule } from './PersonalSchedule'
import { AttunementStatus } from './AttunementStatus'
import { ApprovedCamperPill } from '@/app/ApprovedCamperPill'
import { getMemberGroups, groupCommitmentMeta } from '@/lib/groups'
import { buildAttunementChecklist, memberGroupCounts, requiredItems, attunementHoursSummary } from '@/lib/attunement'
import { getMemberShiftState } from '@/lib/shift-attunement'
import { buildMemberFacts } from '@/lib/member-facts'
import { parseDistinctions, evaluateDistinctions } from '@/lib/distinctions'
import { resolveMember, getMemberProfileValues } from '@/lib/members'
import { getMemberAwards } from '@/lib/distinction-awards'
import { CabinetOfDistinctions } from './CabinetOfDistinctions'
import { ProfileDetails } from './ProfileDetails'
import { isImageIcon } from '@/lib/icon-src'

// ── Identity stat list (mirrors the mockup's right-column at-a-glance facts) ──
function StatIcon({ name }: { name: 'calendar' | 'star' | 'shield' | 'hand' }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: '#C8A848', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style: { opacity: 0.8, flexShrink: 0 } }
  switch (name) {
    case 'calendar': return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
    case 'star':     return <svg {...common}><path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.1L7.6 19l1.3-6-4.5-4 6-.6z" /></svg>
    case 'shield':   return <svg {...common}><path d="M12 3l7 3v5c0 4.4-3 7-7 8-4-1-7-3.6-7-8V6z" /></svg>
    case 'hand':     return <svg {...common}><path d="M8 11V6.5a1.4 1.4 0 0 1 2.8 0V10M10.8 10V4.8a1.4 1.4 0 0 1 2.8 0V10M13.6 10V5.6a1.4 1.4 0 0 1 2.8 0V12M16.4 12V8a1.4 1.4 0 0 1 2.8 0v5a6 6 0 0 1-6 6 6 6 0 0 1-5.2-3l-2-3.4a1.5 1.5 0 0 1 2.5-1.7L8 13.5" /></svg>
  }
}

function StatRow({ icon, label, value }: { icon: 'calendar' | 'star' | 'shield' | 'hand'; label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.4rem 0', borderTop: '1px solid rgba(200,168,72,0.12)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.8rem', color: '#D8C7A0' }}>
        <StatIcon name={icon} />{label}
      </span>
      <span style={{ fontSize: '0.8rem', color: '#C8A848', fontWeight: 500, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  // Check for camp application (cancelled treated as no application)
  const { data: applicationRaw } = await supabaseAdmin
    .from('applications')
    .select('*')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const application = applicationRaw?.status === 'cancelled' ? null : applicationRaw

  // Check for active volunteer signup (cancelled records are treated as no record)
  const { data: volunteerRaw } = await supabaseAdmin
    .from('volunteers')
    .select('*')
    .eq('clerk_user_id', userId)
    .maybeSingle()
  const volunteer = (volunteerRaw?.status === 'active' || volunteerRaw?.status === 'pending') ? volunteerRaw : null

  // Fetch signup status for approved members and active (not pending) volunteers
  const isActiveMember = application?.status === 'approved' || volunteer?.status === 'active'
  const [{ data: campSignup }, { data: heldShiftRows }] = isActiveMember
    ? await Promise.all([
        supabaseAdmin
          .from('camp_signups')
          .select('role_id, schedule_event_id, role_approval_status, roles(name, description, purpose, department_id, departments(name, icon)), schedule_events(id, title, day, time, icon_type, event_date)')
          .eq('clerk_user_id', userId)
          .maybeSingle(),
        supabaseAdmin
          .from('member_shift_signups')
          .select('schedule_events(id, title, day, time, icon_type, event_date)')
          .eq('clerk_user_id', userId),
      ])
    : [{ data: null }, { data: null }]

  // Extract role + department info
  const roleInfo = campSignup?.roles as { name?: string; description?: string | null; purpose?: string | null; departments?: { name?: string; icon?: string } | null } | null
  const roleApproved = !!campSignup?.role_id && campSignup?.role_approval_status !== 'pending'

  // Every shift the member holds: many-to-many + the legacy single, deduped.
  type HeldShiftRow = { id: string; title: string; day: string; time: string; icon_type: string; event_date: string | null }
  const heldShiftMap = new Map<string, HeldShiftRow>()
  for (const r of heldShiftRows ?? []) {
    const ev = r.schedule_events as unknown as HeldShiftRow | null
    if (ev?.id) heldShiftMap.set(ev.id, ev)
  }
  const legacyShiftEv = campSignup?.schedule_events as unknown as HeldShiftRow | null
  if (legacyShiftEv?.id) heldShiftMap.set(legacyShiftEv.id, legacyShiftEv)
  const heldShifts = Array.from(heldShiftMap.values()).map(ev => ({
    id: ev.id,
    title: ev.title ?? '',
    day: ev.day ?? '',
    time: ev.time ?? '',
    icon_type: ev.icon_type ?? 'star',
    event_date: ev.event_date ?? null,
  }))

  // Groups the member belongs to (replaces the old setup_preference "contributions").
  // `contributions` = group names; `groupMeta` carries each group's icon/description
  // for the commitments card (keyed by name, the shape CommitmentsSection expects).
  const memberGroups = await getMemberGroups(application?.clerk_user_id ?? userId)
  // Full list drives attunement + distinction facts; the profile card shows only
  // groups whose collection is marked visible (show_on_profile).
  const contributions = memberGroups.map(g => g.name)
  const { groupCountsByCollection, totalGroupCount } = memberGroupCounts(memberGroups)
  const visibleGroups = memberGroups.filter(g => g.showOnProfile)
  const groupMeta = groupCommitmentMeta(visibleGroups)

  // Attunement checklist — admin-configured tasks, each auto-completed from its
  // requirement type (Admin → Manage → Attunement Tasks).
  const { data: attuneConfigRows } = await supabaseAdmin
    .from('page_content')
    .select('key, value')
    .in('key', ['config_attunement_tasks', 'config_shift_signup_open', 'config_distinctions'])
  const attuneConfig = Object.fromEntries((attuneConfigRows ?? []).map(r => [r.key, r.value]))
  // Shift-hours state: held hours per shift type + obligations derived from the
  // member's groups/roles. Same helper as the home dashboard — keep in sync.
  const shiftState = await getMemberShiftState(application?.clerk_user_id ?? userId)
  // Shared with the home dashboard banner via buildAttunementChecklist — keep both in sync.
  const attunementState = {
    hasPhoto: !!application?.avatar_url,
    groupCountsByCollection,
    totalGroupCount,
    roleDone: !!campSignup?.role_id && campSignup?.role_approval_status !== 'pending',
    hasShift: shiftState.hasShift || !!campSignup?.schedule_event_id,
    shiftSignupOpen: attuneConfig['config_shift_signup_open'] !== 'false',
    hoursByShiftType: shiftState.hoursByShiftType,
    derivedShiftRequirements: shiftState.derivedShiftRequirements,
  }
  const attunementTasks = buildAttunementChecklist(attuneConfig['config_attunement_tasks'], attunementState)
  const attunementHours = attunementHoursSummary(attuneConfig['config_attunement_tasks'], attunementState)

  // Member facts → earned distinctions (Cabinet of Distinctions). Facts are
  // derived from existing data; medals are never persisted — they're recomputed
  // here from the admin-configured rules. See lib/member-facts.ts + lib/distinctions.ts.
  const memberFacts = buildMemberFacts({ application, roleInfo, memberGroups, roleApproved })
  // Distinctions evaluate the merged namespace: stored profile values (Phase 1
  // member_profiles) ∪ derived system facts. System facts win on any key overlap
  // (they're authoritative and non-spoofable). Guarded — empty when no member row
  // exists yet, so this falls back to system-facts-only behavior.
  const profileMember = await resolveMember(application?.clerk_user_id ?? userId, email)
  const profileValues = profileMember ? await getMemberProfileValues(profileMember.id) : {}
  const awardedIds = profileMember ? new Set(await getMemberAwards(profileMember.id)) : undefined
  const factContext = { ...profileValues, ...memberFacts }
  const earnedDistinctions = evaluateDistinctions(factContext, parseDistinctions(attuneConfig['config_distinctions']), awardedIds)

  // Link clerk_user_id for approved applications found by email — and mirror the
  // link onto the canonical member record, so future identity reads resolve by
  // clerk_user_id rather than the email fallback.
  if (application?.status === 'approved' && !application.clerk_user_id) {
    await supabaseAdmin
      .from('applications')
      .update({ clerk_user_id: userId })
      .eq('id', application.id)
    await supabaseAdmin
      .from('members')
      .update({ clerk_user_id: userId })
      .eq('application_id', application.id)
      .is('clerk_user_id', null)
  }

  const isAdmin = user?.publicMetadata?.role === 'admin'

  const displayName =
    volunteer?.preferred_name || volunteer?.first_name ||
    application?.preferred_name || application?.first_name ||
    user?.firstName || 'Welcome'

  const kicker = application ? 'Member' : volunteer ? 'Volunteer' : null

  // ── Header pieces (alignment-neutral; the layout wrapper sets alignment) ──
  const isApproved = application?.status === 'approved'
  // Member-authored quote surfaced under the name in the header. (The bio/About
  // narrative shows only on the public profile; here it's edited in Profile Details.)
  const quoteText = typeof profileValues['quote'] === 'string' ? (profileValues['quote'] as string).trim() : ''
  const commitmentCount = contributions.length + heldShifts.length
  // "Attuned" = the required tier (authored tasks) only; group/role commitments
  // are tracked as a guide below and never gate the status.
  const requiredTasks = requiredItems(attunementTasks)
  const attunementDone = requiredTasks.length > 0 && requiredTasks.every(t => t.done)
  const attunementRemaining = requiredTasks.filter(t => !t.done).length

  const avatar = (
    <AvatarUpload
      initialUrl={application?.avatar_url ?? volunteer?.avatar_url ?? null}
      displayName={displayName}
      size={isApproved ? 340 : 260}
    />
  )

  // Right column: name, status, secondary metadata.
  const identityContent = (
    <>
      {kicker && (
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '0.3rem', opacity: 0.85 }}>
          {kicker}
        </p>
      )}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.15rem' }}>
        <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.9rem, 4.5vw, 2.5rem)', color: '#C8A848', margin: 0, textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
          {displayName}
        </h1>
        {application && (application.status === 'approved' || application.status === 'pending') && (
          <ProfileSettings application={application} />
        )}
        {volunteer && volunteer.status === 'active' && !application && (
          <VolunteerSettings volunteer={volunteer} />
        )}
      </div>
      {application?.pronouns && (
        <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '0.1rem' }}>{application.pronouns}</p>
      )}
      <p style={{ fontSize: '0.8rem', opacity: 0.4, marginTop: '-0.1rem', marginBottom: '0' }}>{email}</p>
      {isApproved && (
        <div style={{ marginTop: '0.5rem' }}>
          <ApprovedCamperPill />
        </div>
      )}
      {isApproved && quoteText && (
        <p style={{ marginTop: '0.85rem', fontSize: '0.92rem', fontStyle: 'italic', color: '#C9B68F', opacity: 0.9, lineHeight: 1.5, fontFamily: 'var(--font-cormorant-garamond), serif' }}>
          “{quoteText}”
        </p>
      )}
      {isApproved && (
        <div style={{ marginTop: '1.1rem', maxWidth: '17rem', marginLeft: 'auto', marginRight: 'auto', textAlign: 'left' }}>
          {memberFacts.joined_year != null && (
            <StatRow icon="calendar" label="Member since" value={memberFacts.joined_year} />
          )}
          <StatRow icon="star" label="Active Commitments" value={commitmentCount} />
          <StatRow icon="shield" label="Distinctions Earned" value={earnedDistinctions.length} />
          {attunementTasks.length > 0 && (
            <StatRow icon="hand" label="Attunement Status" value={attunementDone ? 'Fully Attuned' : `${attunementRemaining} left`} />
          )}
        </div>
      )}
    </>
  )

  // Left column: the prestigious designation (role + department). Approved only.
  // Built to visually balance the Member Information column against the larger
  // portrait — generous vertical rhythm + engraved ornamentation.
  const designationContent = memberFacts.designation && (
    <>
      {/* Emblem — department glyph in a brass ring flanked by tiny sparkles */}
      <div style={{ position: 'relative', width: '84px', height: '84px', margin: '0 auto 0.7rem' }}>
        <span aria-hidden style={{ position: 'absolute', top: '-2px', left: '-11px', color: 'rgba(200,168,72,0.6)', fontSize: '0.65rem' }}>✦</span>
        <span aria-hidden style={{ position: 'absolute', bottom: '2px', right: '-9px', color: 'rgba(200,168,72,0.42)', fontSize: '0.5rem' }}>✦</span>
        <div style={{
          width: '84px', height: '84px', borderRadius: '50%',
          border: '1.5px solid #C8A848',
          background: 'radial-gradient(circle at 42% 38%, rgba(200,168,72,0.18), rgba(8,0,18,0.85))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 22px rgba(200,168,72,0.22), inset 0 0 0 1px rgba(255,249,232,0.1)',
        }}>
          {roleInfo?.departments?.icon && !isImageIcon(roleInfo.departments.icon)
            ? <span style={{ fontSize: '2.1rem', lineHeight: 1 }}>{roleInfo.departments.icon}</span>
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={isImageIcon(roleInfo?.departments?.icon) ? roleInfo!.departments!.icon! : '/handicon.png'} alt="" aria-hidden style={{ width: '76%', height: '76%', objectFit: 'contain', opacity: 0.92 }} />}
        </div>
      </div>
      <p style={{ fontSize: '0.64rem', letterSpacing: '0.34em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '0.35rem', opacity: 0.85 }}>
        Designation
      </p>
      <h2 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.7rem, 3vw, 2.2rem)', color: '#C8A848', margin: '0 auto', maxWidth: '13rem', lineHeight: 1.05, textShadow: '0 0 30px rgba(210,57,248,0.35)' }}>
        {memberFacts.designation}
      </h2>
      {/* Stylized divider under the designation — ── ✦ ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '68%', margin: '0.6rem auto 0.6rem' }}>
        <span aria-hidden style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.65))' }} />
        <span aria-hidden style={{ color: '#C8A848', fontSize: '0.6rem', opacity: 0.9, lineHeight: 1 }}>✦</span>
        <span aria-hidden style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.65), transparent)' }} />
      </div>
      {(roleInfo?.description || roleInfo?.purpose) && (
        <p style={{ fontSize: '0.95rem', color: '#C9B68F', opacity: 0.88, lineHeight: 1.45, margin: '0 auto 1.05rem', maxWidth: '15rem', fontFamily: 'var(--font-cormorant-garamond), serif', fontStyle: 'italic' }}>
          {roleInfo.description || roleInfo.purpose}
        </p>
      )}
      {memberFacts.department && (() => {
        // Break "Department of X" onto two lines: "Department of" / "X".
        const m = memberFacts.department.match(/^(department of)\s+(.+)$/i)
        return (
          <div>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.72, lineHeight: 1.45 }}>
              {m ? <>{m[1]}<br />{m[2]}</> : memberFacts.department}
            </p>
            {/* Decorative closing flourish — small and delicate */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', width: '12%', margin: '1.3rem auto 0' }}>
              <span aria-hidden style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.5))' }} />
              <span aria-hidden style={{ color: '#C8A848', fontSize: '0.32rem', opacity: 0.8, lineHeight: 1 }}>✦</span>
              <span aria-hidden style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.5), transparent)' }} />
            </div>
          </div>
        )
      })()}
    </>
  )

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
      <Header />
      <style>{`
        .profile-main-grid  { display: grid; grid-template-columns: 1.1fr 1fr; gap: 1.25rem; align-items: stretch; margin-bottom: 0.75rem; }
        .profile-info-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2.5rem; }
        /* Header: designation (left) · portrait (center, focal point) · identity (right). */
        .profile-header-grid    { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 2.25rem; }
        .profile-header-desig   { text-align: center; min-width: 0; }
        .profile-header-id      { text-align: center; min-width: 0; }
        /* Let the portrait feel slightly oversized — it can bleed past its grid cell. */
        .profile-header-portrait{ display: flex; justify-content: center; }
        @media (max-width: 768px) {
          .profile-main-grid   { grid-template-columns: 1fr; }
          .profile-info-grid   { grid-template-columns: 1fr; }
          /* Stack: portrait → identity → designation, all centered. */
          .profile-header-grid     { grid-template-columns: 1fr; justify-items: center; gap: 1.5rem; }
          .profile-header-desig    { order: 3; }
          .profile-header-id       { order: 2; }
          .profile-header-portrait { order: 1; }
        }
      `}</style>
      <img src="/hands-left.svg" alt="" aria-hidden style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <RememberSignedIn firstName={user?.firstName} email={email} />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '5.5rem 1.5rem 3rem', position: 'relative', zIndex: 1 }}>

        {/* Name header — shown for application and volunteer tracks. Approved members
            with a designation get the 3-column registry header; everyone else gets a
            centered portrait + identity. No medals here — honours live in the cabinet. */}
        {(application || volunteer) && (
          <div style={{ marginBottom: '1rem' }}>
            {designationContent ? (
              <div className="profile-header-grid">
                <div className="profile-header-desig">{designationContent}</div>
                <div className="profile-header-portrait">{avatar}</div>
                <div className="profile-header-id">{identityContent}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                {avatar}
                <div style={{ textAlign: 'center' }}>{identityContent}</div>
              </div>
            )}
          </div>
        )}

        {/* ── CHOOSE YOUR PATH ── */}
        {!application && !volunteer && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#C8A848', marginBottom: '0.5rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
                {user?.firstName ? `Welcome, ${user.firstName}.` : 'Welcome.'}
              </h1>
              <p style={{ fontSize: '0.85rem', opacity: 0.5 }}>{email}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {/* Camp member card */}
              <div style={{ padding: '2rem', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '1rem', background: 'rgba(200,168,72,0.03)', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.7, marginBottom: '0.75rem' }}>
                  Camp Member
                </p>
                <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.3rem', color: '#C8A848', marginBottom: '0.75rem' }}>
                  Join the Camp
                </p>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, opacity: 0.6, marginBottom: '2rem', flex: 1 }}>
                  Camp with Glåüm at What If 2026. Full participation — you'll sleep on site, help build and hold the space, and take on volunteer shifts as part of the camp.
                </p>
                <a
                  href="/apply?track=member"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(200,168,72,0.5)',
                    color: '#FFFACD',
                    textDecoration: 'none',
                    letterSpacing: '0.1em',
                    fontSize: '0.82rem',
                    fontFamily: 'TokyoDreams, serif',
                  }}
                >
                  Apply to Camp
                </a>
              </div>

              {/* Volunteer card */}
              <div style={{ padding: '2rem', border: '1px solid rgba(210,57,248,0.15)', borderRadius: '1rem', background: 'rgba(210,57,248,0.03)', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.7, marginBottom: '0.75rem' }}>
                  Volunteer
                </p>
                <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.3rem', color: '#D239F8', marginBottom: '0.75rem' }}>
                  Volunteer for a Shift
                </p>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, opacity: 0.6, marginBottom: '2rem', flex: 1 }}>
                  Not camping with Glåüm, but want to be part of it? Sign up to help out for a shift or two. We'll share more details about available roles closer to the event.
                </p>
                <a
                  href="/volunteer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(210,57,248,0.7)',
                    color: '#F3EDE6',
                    textDecoration: 'none',
                    letterSpacing: '0.1em',
                    fontSize: '0.82rem',
                    fontFamily: 'TokyoDreams, serif',
                  }}
                >
                  Sign Up to Volunteer
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── CAMP APPLICATION STATES ── */}
        {application && !volunteer && application.status === 'pending' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '2rem 2rem 1.5rem', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '1rem', background: 'rgba(210,57,248,0.04)' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ display: 'inline-block', padding: '0.35rem 1.25rem', borderRadius: '9999px', backgroundColor: 'rgba(200,168,72,0.08)', border: '1px solid rgba(200,168,72,0.25)', fontSize: '0.75rem', letterSpacing: '0.12em', color: '#C8A848', opacity: 0.7 }}>
                  ○ PENDING PARTICIPANT
                </span>
              </div>
              <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.2rem', color: '#C8A848', marginBottom: '0.75rem' }}>
                Application under review.
              </p>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.7, opacity: 0.45 }}>
                Need to update your details? Use the gear icon next to your name.
              </p>
            </div>
            <TaskStatus track="pending" />
          </div>
        )}

        {application && application.status === 'cancelled' && (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px solid rgba(255,120,120,0.2)', borderRadius: '1rem', background: 'rgba(255,0,0,0.04)' }}>
            <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.2rem', color: '#ffb4b4', marginBottom: '0.75rem' }}>
              Attendance cancelled
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.6 }}>
              Your spot has been released. If your plans change again, reach out to camp organizers.
            </p>
          </div>
        )}

        {application && application.status === 'rejected' && (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '1rem', background: 'rgba(255,255,255,0.02)' }}>
            <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.2rem', color: '#C8A848', marginBottom: '0.75rem' }}>
              Application not approved
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.6 }}>
              If you have questions, please contact camp organizers.
            </p>
          </div>
        )}

        {application && application.status === 'approved' && (
          <>

            <div className="profile-main-grid">
              <CommitmentsSection
                title="Active Commitments"
                hideRole
                contributions={visibleGroups.map(g => g.name)}
                role={roleInfo ? { name: roleInfo.name ?? '', description: roleInfo.description ?? null, purpose: roleInfo.purpose ?? null } : null}
                dept={roleInfo?.departments ? { name: roleInfo.departments.name ?? '', icon: roleInfo.departments.icon ?? null } : null}
                shifts={heldShifts}
                roleApprovalStatus={campSignup?.role_approval_status ?? null}
                contributionTypes={groupMeta}
                showManageLink
              />
              <div style={{ height: '100%' }}>
                {attunementTasks.length > 0 && <AttunementStatus tasks={attunementTasks} minimumHours={attunementHours.minimumHours} commitmentHours={attunementHours.commitmentHours} />}
              </div>
            </div>

            {earnedDistinctions.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <CabinetOfDistinctions distinctions={earnedDistinctions} title="Distinctions" />
              </div>
            )}
            <div style={{ marginBottom: '1.5rem' }}>
              <a href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.35)', background: 'rgba(200,168,72,0.06)', color: '#C8A848', textDecoration: 'none', fontSize: '0.82rem', letterSpacing: '0.06em' }}>
                ✦ Choose / change your role & shift
              </a>
            </div>

            <PersonalSchedule userId={userId} />

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)', marginBottom: '2.5rem' }} />

            <div className="profile-info-grid">
              {[
                { label: 'Arrival', value: application.arrival_date },
                { label: 'Departure', value: application.departure_date },
                { label: 'Traveling From', value: application.location },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label} style={{ padding: '1rem 1.25rem', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#C8A848', opacity: 0.6, marginBottom: '0.35rem', textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontSize: '0.9rem' }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', margin: '0 0 2.5rem' }} />


            {/* Registry-defined profile fields the member can view / edit
                (Phase 4 — reads/writes member_profiles.values). Renders nothing
                until the registry has member-visible fields. */}
            <ProfileDetails />

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', margin: '2.5rem 0' }} />

            <div style={{ padding: '2rem', border: '1px solid rgba(210,57,248,0.2)', borderRadius: '1rem', background: 'rgba(210,57,248,0.04)' }}>
              <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', marginBottom: '1rem' }}>
                Camp Information
              </p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.8, opacity: 0.65, fontStyle: 'italic' }}>
                Location details, logistics, and camp-specific information will appear here closer to the event. Keep an eye on your email.
              </p>
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', margin: '2.5rem 0' }} />

            <NotificationPreferences />

            <a href="/members" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', border: '1px solid rgba(200,168,72,0.18)', borderRadius: '1rem', background: 'rgba(200,168,72,0.03)', textDecoration: 'none' }}>
              <div>
                <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', margin: '0 0 0.2rem' }}>Many Hands</p>
                <p style={{ fontSize: '0.8rem', opacity: 0.45, margin: 0 }}>View your fellow camp members</p>
              </div>
              <span style={{ fontSize: '1rem', color: '#C8A848', opacity: 0.4 }}>→</span>
            </a>
          </>
        )}

        {/* ── VOLUNTEER PROFILE ── */}
        {volunteer && (volunteer.status === 'active' || volunteer.status === 'pending') && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              {volunteer.status === 'pending' ? (
                <span style={{ display: 'inline-block', padding: '0.35rem 1.25rem', borderRadius: '9999px', backgroundColor: 'rgba(200,168,72,0.08)', border: '1px solid rgba(200,168,72,0.25)', fontSize: '0.75rem', letterSpacing: '0.12em', color: '#C8A848', opacity: 0.8 }}>
                  ○ PENDING REVIEW
                </span>
              ) : (
                <span style={{ display: 'inline-block', padding: '0.35rem 1.25rem', borderRadius: '9999px', backgroundColor: 'rgba(210,57,248,0.1)', border: '1px solid rgba(210,57,248,0.25)', fontSize: '0.75rem', letterSpacing: '0.12em', color: '#D239F8' }}>
                  ✦ HELPING HAND
                </span>
              )}
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(210,57,248,0.2), transparent)', marginBottom: '2.5rem' }} />

            <div className="profile-info-grid">
              {volunteer.days_available?.length > 0 && (
                <div style={{ padding: '1rem 1.25rem', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)', gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#C8A848', opacity: 0.6, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Days Available</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {volunteer.days_available.map((d: string) => (
                      <span key={d} style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', fontSize: '0.8rem', opacity: 0.8 }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {volunteer.preferred_times?.length > 0 && (
                <div style={{ padding: '1rem 1.25rem', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#C8A848', opacity: 0.6, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Preferred Times</p>
                  <p style={{ fontSize: '0.9rem' }}>{volunteer.preferred_times.join(', ')}</p>
                </div>
              )}
              {volunteer.shift_interests?.length > 0 && (
                <div style={{ padding: '1rem 1.25rem', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#C8A848', opacity: 0.6, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Shift Interests</p>
                  <p style={{ fontSize: '0.9rem' }}>{volunteer.shift_interests.join(', ')}</p>
                </div>
              )}
            </div>

            <TaskStatus track="volunteer" volunteerStatus={volunteer.status} campSignup={campSignup} signupIntent={volunteer.signup_intent} />
            <NotificationPreferences />
          </>
        )}

      </div>
    </div>
  )
}
