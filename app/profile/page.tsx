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

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  // Check for camp application
  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('*')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Check for active volunteer signup (cancelled records are treated as no record)
  const { data: volunteerRaw } = await supabaseAdmin
    .from('volunteers')
    .select('*')
    .eq('clerk_user_id', userId)
    .maybeSingle()
  const volunteer = volunteerRaw?.status === 'active' ? volunteerRaw : null

  // Fetch signup status for approved members
  const { data: campSignup } = application?.status === 'approved'
    ? await supabaseAdmin
        .from('camp_signups')
        .select('role_id, schedule_event_id, role_approval_status')
        .eq('clerk_user_id', userId)
        .maybeSingle()
    : { data: null }

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
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
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
                  href="/apply"
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
          <div style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '1rem', background: 'rgba(210,57,248,0.04)' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ display: 'inline-block', padding: '0.35rem 1.25rem', borderRadius: '9999px', backgroundColor: 'rgba(200,168,72,0.08)', border: '1px solid rgba(200,168,72,0.25)', fontSize: '0.75rem', letterSpacing: '0.12em', color: '#C8A848', opacity: 0.7 }}>
                ○ PENDING PARTICIPANT
              </span>
            </div>
            <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.2rem', color: '#C8A848', marginBottom: '0.75rem' }}>
              Application under review.
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.6, marginBottom: '0.75rem' }}>
              The Many Hands are deliberating. You'll receive an email when your application has been reviewed.
            </p>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.7, opacity: 0.45 }}>
              Need to update your details? Use the gear icon above.
            </p>
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

            {/* Signup status banner — shown prominently before any other content */}
            {(() => {
              const hasRole = !!campSignup?.role_id
              const hasShift = !!campSignup?.schedule_event_id
              const isPending = campSignup?.role_approval_status === 'pending'
              const allDone = hasRole && !isPending && hasShift

              if (allDone) return (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 1.25rem', borderRadius: '9999px', border: '1px solid rgba(100,200,120,0.3)', background: 'rgba(100,200,120,0.06)' }}>
                    <span style={{ color: '#7dcf8e', fontSize: '0.75rem' }}>✓</span>
                    <span style={{ fontSize: '0.78rem', color: '#7dcf8e', letterSpacing: '0.04em' }}>Role &amp; shift confirmed</span>
                  </div>
                </div>
              )

              if (isPending) return (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 1.25rem', borderRadius: '9999px', border: '1px solid rgba(210,57,248,0.3)', background: 'rgba(210,57,248,0.06)' }}>
                    <span style={{ color: '#D239F8', fontSize: '0.75rem' }}>○</span>
                    <span style={{ fontSize: '0.78rem', color: '#D239F8', letterSpacing: '0.04em' }}>Role request pending approval</span>
                  </div>
                </div>
              )

              const missing = []
              if (!hasRole) missing.push('a role')
              if (!hasShift) missing.push('a shift')
              if (!missing.length) return null

              return (
                <div style={{ marginBottom: '2rem', padding: '0.9rem 1.25rem', borderRadius: '0.85rem', border: '1px solid rgba(210,168,50,0.4)', background: 'rgba(210,168,50,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1rem' }}>⚠</span>
                    <span style={{ fontSize: '0.88rem', color: '#C8A848' }}>
                      You still need to choose {missing.join(' and ')}.
                    </span>
                  </div>
                  <a href="/apply" style={{ fontSize: '0.8rem', color: '#C8A848', opacity: 0.7, textDecoration: 'underline', textUnderlineOffset: '2px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Complete registration →
                  </a>
                </div>
              )
            })()}

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)', marginBottom: '2.5rem' }} />

            {application.contributions?.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', marginBottom: '1rem', opacity: 0.7 }}>
                  Your Contributions
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {application.contributions.map((c: string) => (
                    <span key={c} style={{ padding: '0.3rem 0.85rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', fontSize: '0.8rem', opacity: 0.8 }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2.5rem' }}>
              {[
                { label: 'Arrival', value: application.arrival_date },
                { label: 'Departure', value: application.departure_date },
                { label: 'Attendance', value: application.attendance },
                { label: 'Traveling From', value: application.location },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label} style={{ padding: '1rem 1.25rem', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#C8A848', opacity: 0.6, marginBottom: '0.35rem', textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontSize: '0.9rem' }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '2.5rem' }} />

            <SignupSection showPickers={false} />

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', margin: '2.5rem 0' }} />

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
        {volunteer && volunteer.status === 'active' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span style={{ display: 'inline-block', padding: '0.35rem 1.25rem', borderRadius: '9999px', backgroundColor: 'rgba(210,57,248,0.1)', border: '1px solid rgba(210,57,248,0.25)', fontSize: '0.75rem', letterSpacing: '0.12em', color: '#D239F8' }}>
                ✦ HELPING HAND
              </span>
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

            <div style={{ padding: '2rem', border: '1px solid rgba(210,57,248,0.15)', borderRadius: '1rem', background: 'rgba(210,57,248,0.03)' }}>
              <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#D239F8', marginBottom: '0.75rem' }}>
                You're on the list.
              </p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.8, opacity: 0.65, fontStyle: 'italic' }}>
                We'll share more details about specific shifts and roles closer to the event. Keep an eye on your email.
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
