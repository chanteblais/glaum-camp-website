import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { SignOutBtn } from '@/components/SignOutBtn'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  // Find their approved application by email
  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('*')
    .eq('email', email)
    .eq('status', 'approved')
    .single()

  // Link clerk_user_id if not already set
  if (application && !application.clerk_user_id) {
    await supabaseAdmin
      .from('applications')
      .update({ clerk_user_id: userId })
      .eq('id', application.id)
  }

  const displayName = application?.preferred_name || application?.first_name || user?.firstName || 'Camper'

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
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
