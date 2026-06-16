import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminActions } from '../AdminActions'
import { MemberSignupCard } from '../MemberSignupCard'

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') redirect('/')

  const { data: app } = await supabaseAdmin
    .from('applications')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!app) notFound()

  // Fetch signup if member has a clerk_user_id
  let signupData: { role: any; shift: any } | null = null
  if (app.clerk_user_id) {
    const { data: signup } = await supabaseAdmin
      .from('camp_signups')
      .select('role_id, schedule_event_id, role_approval_status')
      .eq('clerk_user_id', app.clerk_user_id)
      .maybeSingle()

    if (signup) {
      const [roleRes, shiftRes] = await Promise.all([
        signup.role_id
          ? supabaseAdmin.from('roles').select('name, commitment, department_id, departments(name, icon)').eq('id', signup.role_id).single()
          : Promise.resolve({ data: null }),
        signup.schedule_event_id
          ? supabaseAdmin.from('schedule_events').select('title, time, day').eq('id', signup.schedule_event_id).single()
          : Promise.resolve({ data: null }),
      ])

      const roleRow = roleRes.data as any
      const dept = roleRow?.departments as { name: string; icon: string | null } | null

      signupData = {
        role: roleRow ? {
          name: roleRow.name,
          department: dept?.name ?? null,
          department_icon: dept?.icon ?? null,
          commitment: roleRow.commitment ?? null,
          approval_status: signup.role_approval_status ?? null,
        } : null,
        shift: shiftRes.data ? {
          title: (shiftRes.data as any).title,
          time: (shiftRes.data as any).time ?? null,
          day: (shiftRes.data as any).day,
        } : null,
      }
    }
  }

  const submitted = new Date(app.submitted_at).toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

        {/* Nav */}
        <div style={{ marginBottom: '3rem' }}>
          <a href="/admin" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.6 }}>
            ← Back to registry
          </a>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2.5rem' }}>
          {/* Avatar */}
          {app.avatar_url ? (
            <img
              src={app.avatar_url}
              alt={`${app.preferred_name || app.first_name} ${app.last_name}`}
              style={{ width: '260px', height: '260px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #6F491F', boxShadow: '0 0 0 1px rgba(200,168,72,0.2), 0 4px 24px rgba(0,0,0,0.5)', marginBottom: '1.5rem' }}
            />
          ) : (
            <div style={{ width: '260px', height: '260px', borderRadius: '50%', border: '2px solid rgba(200,168,72,0.15)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'rgba(200,168,72,0.2)', fontSize: '4rem' }}>
              ✦
            </div>
          )}

          {/* Kicker */}
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '0.3rem', opacity: 0.85 }}>
            Application
          </p>

          {/* Name */}
          <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', marginBottom: '0.15rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
            {app.preferred_name || app.first_name} {app.last_name}
          </h1>

          {app.pronouns && (
            <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '0.1rem' }}>{app.pronouns}</p>
          )}
          <p style={{ fontSize: '0.8rem', opacity: 0.4, marginBottom: '0.5rem' }}>{app.email}</p>

          {/* Status pill */}
          <span style={{
            display: 'inline-block', padding: '0.3rem 1.1rem', borderRadius: '9999px',
            fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase',
            backgroundColor: app.status === 'approved' ? 'rgba(210,57,248,0.15)' : app.status === 'rejected' ? 'rgba(255,255,255,0.06)' : app.status === 'cancelled' ? 'rgba(255,100,100,0.1)' : 'rgba(200,168,72,0.1)',
            border: `1px solid ${app.status === 'approved' ? 'rgba(210,57,248,0.3)' : app.status === 'rejected' ? 'rgba(255,255,255,0.15)' : app.status === 'cancelled' ? 'rgba(255,100,100,0.25)' : 'rgba(200,168,72,0.3)'}`,
            color: app.status === 'approved' ? '#D239F8' : app.status === 'rejected' ? 'rgba(243,237,230,0.45)' : app.status === 'cancelled' ? '#ffb4b4' : '#C8A848',
          }}>
            {app.status === 'pending' ? '○ Pending Review' : app.status === 'approved' ? '✦ Approved' : app.status === 'rejected' ? 'Rejected' : 'Cancelled'}
          </span>

          <p style={{ fontSize: '0.72rem', opacity: 0.3, marginTop: '0.75rem', fontStyle: 'italic' }}>Submitted {submitted}</p>
        </div>

        {/* Actions for pending */}
        {app.status === 'pending' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
            <AdminActions id={app.id} email={app.email} redirectAfter="/admin" />
          </div>
        )}

        {app.status === 'cancelled' && app.cancel_reason && (
          <div style={{ marginBottom: '2.5rem', padding: '1.25rem 1.5rem', border: '1px solid rgba(255,120,120,0.25)', borderRadius: '0.75rem', background: 'rgba(255,0,0,0.04)' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ffb4b4', marginBottom: '0.5rem' }}>
              Cancellation reason
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.75, fontStyle: 'italic' }}>{app.cancel_reason}</p>
            {app.cancelled_at && (
              <p style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '0.5rem' }}>
                Cancelled {new Date(app.cancelled_at).toLocaleString('en-CA')}
              </p>
            )}
          </div>
        )}

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '2.5rem' }} />

        {/* Role & Shift */}
        {app.clerk_user_id && (
          <>
            <Section title="Role & Shift">
              <MemberSignupCard
                clerkUserId={app.clerk_user_id}
                role={signupData?.role ?? null}
                shift={signupData?.shift ?? null}
              />
            </Section>
            <Divider />
          </>
        )}

        {/* Sections */}
        <Section title="Basic Info">
          <Grid>
            <Field label="First Name" value={app.first_name} />
            <Field label="Last Name" value={app.last_name} />
            {app.preferred_name && <Field label="Preferred Name" value={app.preferred_name} />}
            {app.pronouns && <Field label="Pronouns" value={app.pronouns} />}
            <Field label="Email" value={app.email} />
            {app.phone && <Field label="Phone" value={app.phone} />}
            {app.instagram && <Field label="Instagram" value={app.instagram} />}
            {app.location && <Field label="Traveling From" value={app.location} />}
            <Field label="Camped Before" value={app.camped_before} />
          </Grid>
        </Section>

        <Divider />

        <Section title="What If Plans">
          <Grid>
            <Field label="Attendance" value={app.attendance} />
            <Field label="Membership Type" value={app.membership_type} />
            {app.arrival_date && <Field label="Arrival" value={app.arrival_date} />}
            {app.departure_date && <Field label="Departure" value={app.departure_date} />}
            {app.vehicle && <Field label="Vehicle" value={app.vehicle} />}
            {app.space_requirements && <Field label="Space Requirements" value={app.space_requirements} />}
            {app.structures && <Field label="Structures" value={app.structures} />}
            {app.rideshare && <Field label="Rideshare" value={app.rideshare} />}
          </Grid>
        </Section>

        <Divider />

        <Section title="Participation">
          {app.setup_preference?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, marginBottom: '0.6rem' }}>Contributions</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {app.setup_preference.map((c: string) => (
                  <span key={c} style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', fontSize: '0.8rem', opacity: 0.8 }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {app.energizing_participation && <LongField label="What feels energizing or meaningful" value={app.energizing_participation} />}
        </Section>

        <Divider />

        <Section title="Capacity & Boundaries">
          {app.support_needs && <LongField label="What helps you feel supported" value={app.support_needs} />}
          {app.accessibility && <LongField label="Accessibility / considerations" value={app.accessibility} />}
          {app.capacity && <LongField label="Realistic capacity" value={app.capacity} />}
          {app.participation_style && <Field label="More likely to" value={app.participation_style} />}
        </Section>

        <Divider />

        <Section title="Camp Culture">
          {app.draws_to_community && <LongField label="What draws you to the community" value={app.draws_to_community} />}
          {app.healthy_community && <LongField label="Healthy community means" value={app.healthy_community} />}
        </Section>

        {app.acknowledgements?.length > 0 && (
          <>
            <Divider />
            <Section title="Acknowledgements">
              <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {app.acknowledgements.map((a: string) => (
                  <li key={a} style={{ fontSize: '0.875rem', opacity: 0.65, lineHeight: 1.5 }}>{a}</li>
                ))}
              </ul>
            </Section>
          </>
        )}

        {app.shrimp_relationship && (
          <>
            <Divider />
            <Section title="Shrimp Relationship">
              <LongField label="" value={app.shrimp_relationship} />
            </Section>
          </>
        )}

        {/* Actions at bottom too */}
        {app.status === 'pending' && (
          <>
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <AdminActions id={app.id} email={app.email} redirectAfter="/admin" />
            </div>
          </>
        )}

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '1.25rem', opacity: 0.7 }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div style={{ padding: '0.75rem 1rem', border: '1px solid rgba(200,168,72,0.1)', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.02)' }}>
      <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, marginBottom: '0.3rem' }}>{label}</p>
      <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>{value}</p>
    </div>
  )
}

function LongField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div style={{ padding: '1rem 1.25rem', border: '1px solid rgba(200,168,72,0.1)', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.02)', marginBottom: '1rem' }}>
      {label && <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, marginBottom: '0.5rem' }}>{label}</p>}
      <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{value}</p>
    </div>
  )
}

function Divider() {
  return <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.15), transparent)', margin: '2.5rem 0' }} />
}
