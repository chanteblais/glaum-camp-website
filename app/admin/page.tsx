import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminActions } from './AdminActions'

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') redirect('/')

  const { data: applications } = await supabaseAdmin
    .from('applications')
    .select('id, first_name, last_name, email, status, submitted_at, attendance, camped_before, contributions')
    .order('submitted_at', { ascending: false })

  const pending = applications?.filter(a => a.status === 'pending') ?? []
  const approved = applications?.filter(a => a.status === 'approved') ?? []
  const rejected = applications?.filter(a => a.status === 'rejected') ?? []

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <a href="/" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.6 }}>
            ← Back to camp
          </a>
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: '#D239F8', opacity: 0.6 }}>ADMIN</span>
        </div>

        <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#C8A848', marginBottom: '0.5rem', textAlign: 'center' }}>
          ManyHands Registry
        </h1>
        <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', marginBottom: '3rem' }}>
          {pending.length} pending · {approved.length} approved · {rejected.length} rejected
        </p>

        {/* Pending */}
        {pending.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '1rem' }}>
              Pending Review
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pending.map(app => (
                <ApplicationRow key={app.id} app={app} showActions />
              ))}
            </div>
          </div>
        )}

        {/* Approved */}
        {approved.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '2rem' }} />
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', marginBottom: '1rem', opacity: 0.7 }}>
              Approved
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {approved.map(app => (
                <ApplicationRow key={app.id} app={app} showActions={false} />
              ))}
            </div>
          </div>
        )}

        {/* Rejected */}
        {rejected.length > 0 && (
          <div>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '2rem' }} />
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F3EDE6', marginBottom: '1rem', opacity: 0.3 }}>
              Not Approved
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {rejected.map(app => (
                <ApplicationRow key={app.id} app={app} showActions={false} />
              ))}
            </div>
          </div>
        )}

        {applications?.length === 0 && (
          <p style={{ textAlign: 'center', opacity: 0.4, fontStyle: 'italic' }}>No applications yet.</p>
        )}
      </div>
    </div>
  )
}

function ApplicationRow({ app, showActions }: { app: any; showActions: boolean }) {
  const submitted = new Date(app.submitted_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })

  return (
    <div style={{ padding: '1.25rem 1.5rem', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
          {app.first_name} {app.last_name}
        </p>
        <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>{app.email}</p>
      </div>
      <div style={{ fontSize: '0.8rem', opacity: 0.5, flexShrink: 0 }}>
        {submitted}
      </div>
      <div style={{ fontSize: '0.75rem', opacity: 0.6, flexShrink: 0 }}>
        {app.attendance}
      </div>
      {showActions && (
        <AdminActions id={app.id} email={app.email} />
      )}
    </div>
  )
}
