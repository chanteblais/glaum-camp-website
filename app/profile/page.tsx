import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { SignOutBtn } from '@/components/SignOutBtn'
import { RememberSignedIn } from '@/components/RememberSignedIn'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  // Find any application for this user (pending or approved)
  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('*')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Link clerk_user_id if not already set (for approved applications found by email)
  if (application?.status === 'approved' && !application.clerk_user_id) {
    await supabaseAdmin
      .from('applications')
      .update({ clerk_user_id: userId })
      .eq('id', application.id)
  }

  const displayName = application?.preferred_name || application?.first_name || user?.firstName || 'Camper'

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <RememberSignedIn firstName={user?.firstName} email={email} />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <a href="/" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.6 }}>
            ← Back to camp
          </a>
          <SignOutBtn />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '0.75rem', opacity: 0.85 }}>
            Member Profile
          </p>
          <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', marginBottom: '0.25rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
            {displayName}
          </h1>
          {application?.pronouns && (
            <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '0.25rem' }}>{application.pronouns}</p>
          )}
          <p style={{ fontSize: '0.8rem', opacity: 0.4 }}>{email}</p>
        </div>

        {!application ? (
          // No application state
          <div style={{ maxWidth: '580px', margin: '0 auto' }}>
            <p style={{ fontSize: '1rem', lineHeight: 1.8, marginBottom: '1.25rem' }}>
              Glåüm is a participatory camp built collaboratively by The Many Hands. This form helps us understand who's joining camp, how people would like to contribute, and what support structures we need to build together.
            </p>
            <p style={{ fontSize: '1rem', lineHeight: 1.8, marginBottom: '1.25rem' }}>
              You do not need to be the most skilled, experienced, outgoing, or useful person in the world to join Glåüm.
            </p>
            <p style={{ fontSize: '1rem', lineHeight: 1.8, fontStyle: 'italic', opacity: 0.7, marginBottom: '2.5rem' }}>
              You simply need to be willing to participate honestly, communicate clearly, and help hold the camp with us in whatever ways are realistic for you.
            </p>
            <div style={{ textAlign: 'center' }}>
              <a
                href="/apply"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 2.5rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(200,168,72,0.5)',
                  color: '#FFFACD',
                  textDecoration: 'none',
                  letterSpacing: '0.12em',
                  fontSize: '0.85rem',
                  fontFamily: 'TokyoDreams, serif',
                }}
              >
                Submit Application
              </a>
            </div>
          </div>
        ) : application.status === 'pending' ? (
          // Pending state
          <div style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '1rem', background: 'rgba(210,57,248,0.04)' }}>
            <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.2rem', color: '#C8A848', marginBottom: '0.75rem' }}>
              Application under review.
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.6 }}>
              The Many Hands are deliberating. You'll receive an email when your application has been reviewed.
            </p>
          </div>
        ) : (
          <>
            {/* Status badge */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span style={{ display: 'inline-block', padding: '0.35rem 1.25rem', borderRadius: '9999px', backgroundColor: 'rgba(210,57,248,0.15)', border: '1px solid rgba(210,57,248,0.3)', fontSize: '0.75rem', letterSpacing: '0.12em', color: '#D239F8' }}>
                ✦ APPROVED CAMPER
              </span>
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)', marginBottom: '2.5rem' }} />

            {/* Contribution areas */}
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

            {/* Camp details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2.5rem' }}>
              {[
                { label: 'Arrival', value: application.arrival_date },
                { label: 'Departure', value: application.departure_date },
                { label: 'Attendance', value: application.attendance },
                { label: 'Camp Relationship', value: application.camp_relationship },
                { label: 'Traveling From', value: application.location },
                { label: 'Rideshare', value: application.rideshare },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label} style={{ padding: '1rem 1.25rem', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#C8A848', opacity: 0.6, marginBottom: '0.35rem', textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontSize: '0.9rem' }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '2.5rem' }} />

            {/* Private camp info */}
            <div style={{ padding: '2rem', border: '1px solid rgba(210,57,248,0.2)', borderRadius: '1rem', background: 'rgba(210,57,248,0.04)' }}>
              <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', marginBottom: '1rem' }}>
                Camp Information
              </p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.8, opacity: 0.65, fontStyle: 'italic' }}>
                Location details, logistics, and camp-specific information will appear here closer to the event.
                Keep an eye on your email.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
