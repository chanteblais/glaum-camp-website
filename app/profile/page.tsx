import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { SignOutBtn } from '@/components/SignOutBtn'
import { RememberSignedIn } from '@/components/RememberSignedIn'
import { ProfileSettings } from './ProfileSettings'
import { VolunteerSettings } from './VolunteerSettings'
import { UserNotificationBell } from '@/components/UserNotificationBell'
import { NotificationBell } from '@/app/admin/NotificationBell'
import { AvatarUpload } from '@/components/AvatarUpload'
import { SignupSection } from './SignupSection'
import { CommitmentsSection } from './CommitmentsSection'
import { TaskStatus } from './TaskStatus'
import { PersonalSchedule } from './PersonalSchedule'
import { RoleBadge } from './RoleBadge'

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
  const { data: campSignup } = (application?.status === 'approved' || volunteer?.status === 'active')
    ? await supabaseAdmin
        .from('camp_signups')
        .select('role_id, schedule_event_id, role_approval_status, roles(name, description, purpose, department_id, departments(name, icon)), schedule_events(title, day, time, icon_type)')
        .eq('clerk_user_id', userId)
        .maybeSingle()
    : { data: null }

  // Extract role + department + shift info
  const roleInfo = campSignup?.roles as { name?: string; description?: string | null; purpose?: string | null; departments?: { name?: string; icon?: string } | null } | null
  const shiftInfo = campSignup?.schedule_events as { title?: string; day?: string; time?: string; icon_type?: string } | null
  const badgeRoleName = roleInfo?.name ?? null
  const badgeDeptName = roleInfo?.departments?.name ?? null
  const badgeDeptIcon = roleInfo?.departments?.icon ?? null

  // Derive contributions: setup_preference from application + auto-Decor if role is in Decor dept
  const deptName = badgeDeptName ?? ''
  const isDecorRole = deptName.toLowerCase().includes('decor')
  const VALID_CONTRIBUTIONS = ['Setup', 'Teardown', 'Decor', 'Other']
  const baseContributions: string[] = ((application?.setup_preference as string[] | null) ?? []).filter(v => VALID_CONTRIBUTIONS.includes(v))
  const contributions = isDecorRole && !baseContributions.includes('Decor')
    ? [...baseContributions, 'Decor']
    : baseContributions

  // Link clerk_user_id for approved applications found by email
  if (application?.status === 'approved' && !application.clerk_user_id) {
    await supabaseAdmin
      .from('applications')
      .update({ clerk_user_id: userId })
      .eq('id', application.id)
  }

  const isAdmin = user?.publicMetadata?.role === 'admin'

  const displayName =
    volunteer?.preferred_name || volunteer?.first_name ||
    application?.preferred_name || application?.first_name ||
    user?.firstName || 'Welcome'

  const kicker = application ? 'Member Profile' : volunteer ? 'Volunteer Profile' : null

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
      <img src="/hands-left.svg" alt="" aria-hidden style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <RememberSignedIn firstName={user?.firstName} email={email} />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <a href="/" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.6 }}>
            ← Back to camp
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isAdmin && (
              <a href="/admin" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', color: '#D239F8', textDecoration: 'none', opacity: 0.7 }}>
                Admin
              </a>
            )}
            {isAdmin ? <NotificationBell /> : <UserNotificationBell />}
            {application && (application.status === 'approved' || application.status === 'pending') && (
              <ProfileSettings application={application} />
            )}
            {volunteer && volunteer.status === 'active' && !application && (
              <VolunteerSettings volunteer={volunteer} />
            )}
            <SignOutBtn />
          </div>
        </div>

        {/* Name header — shown for application and volunteer tracks */}
        {(application || volunteer) && (
          <div style={{
            marginBottom: '3rem',
            display: 'grid',
            gridTemplateColumns: application?.status === 'approved' && badgeRoleName ? '160px 1fr 160px' : '1fr',
            alignItems: 'center',
            gap: '1rem',
          }}>

            {/* Left column — badge (approved campers with a role only) */}
            {application?.status === 'approved' && badgeRoleName && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <RoleBadge roleName={badgeRoleName} deptName={badgeDeptName} deptIcon={badgeDeptIcon} />
              </div>
            )}

            {/* Centre column — avatar + name */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <AvatarUpload
                  initialUrl={application?.avatar_url ?? volunteer?.avatar_url ?? null}
                  displayName={displayName}
                />
              </div>
              {kicker && (
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '0.75rem', opacity: 0.85 }}>
                  {kicker}
                </p>
              )}
              <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', marginBottom: '0.25rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
                {displayName}
              </h1>
              {application?.pronouns && (
                <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '0.25rem' }}>{application.pronouns}</p>
              )}
              <p style={{ fontSize: '0.8rem', opacity: 0.4 }}>{email}</p>
            </div>

            {/* Right column — empty counterbalance so centre stays centred */}
            {application?.status === 'approved' && badgeRoleName && <div />}
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
                  href="/apply?join=1"
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
                Need to update your details? Use the gear icon above.
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
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ display: 'inline-block', padding: '0.35rem 1.25rem', borderRadius: '9999px', backgroundColor: 'rgba(210,57,248,0.15)', border: '1px solid rgba(210,57,248,0.3)', fontSize: '0.75rem', letterSpacing: '0.12em', color: '#D239F8' }}>
                ✦ APPROVED CAMPER
              </span>
            </div>

            <TaskStatus track="approved" campSignup={campSignup} contributions={contributions} />

            <CommitmentsSection
              contributions={contributions}
              role={roleInfo ? { name: roleInfo.name ?? '', description: roleInfo.description ?? null, purpose: roleInfo.purpose ?? null } : null}
              dept={roleInfo?.departments ? { name: roleInfo.departments.name ?? '', icon: roleInfo.departments.icon ?? null } : null}
              shift={shiftInfo ? { title: shiftInfo.title ?? '', day: shiftInfo.day ?? '', time: shiftInfo.time ?? '', icon_type: shiftInfo.icon_type ?? 'star' } : null}
              roleApprovalStatus={campSignup?.role_approval_status ?? null}
            />
            <PersonalSchedule userId={userId} contributions={contributions} />

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)', marginBottom: '2.5rem' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2.5rem' }}>
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


            <div style={{ padding: '2rem', border: '1px solid rgba(210,57,248,0.2)', borderRadius: '1rem', background: 'rgba(210,57,248,0.04)' }}>
              <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', marginBottom: '1rem' }}>
                Camp Information
              </p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.8, opacity: 0.65, fontStyle: 'italic' }}>
                Location details, logistics, and camp-specific information will appear here closer to the event. Keep an eye on your email.
              </p>
            </div>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2.5rem' }}>
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
          </>
        )}

      </div>
    </div>
  )
}
