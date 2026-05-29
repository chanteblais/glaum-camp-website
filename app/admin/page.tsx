import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { ApplicationRow } from './ApplicationRow'
import { CollapsibleSection } from './CollapsibleSection'
import { OverviewSection } from './OverviewSection'
import { VolunteersSection } from './VolunteersSection'
import { NotificationsSection } from './NotificationsSection'
import { NotificationBell } from './NotificationBell'
import { AdminTabBar } from './AdminTabBar'
import { ScheduleManager } from './ScheduleManager'
import { DepartmentsManager } from './DepartmentsManager'
import { RoleRequestsSection } from './RoleRequestsSection'

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') redirect('/')

  const { data: volunteers } = await supabaseAdmin
    .from('volunteers')
    .select('id, first_name, last_name, email, phone, days_available, preferred_times, shift_interests, other_notes, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: applications, error: dbError } = await supabaseAdmin
    .from('applications')
    .select('id, first_name, last_name, preferred_name, email, status, submitted_at, attendance, camp_relationship, camped_before, contributions')
    .order('submitted_at', { ascending: false })

  const { data: notifications, error: notificationsError } = await supabaseAdmin
    .from('admin_notifications')
    .select('id, application_id, event_type, message, details, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (dbError) console.error('[Admin] Supabase query error:', dbError)
  if (notificationsError) console.error('[Admin] Notifications query error:', notificationsError)

  const all = applications ?? []
  const pending = all.filter(a => a.status === 'pending')
  const approved = all.filter(a => a.status === 'approved')
  const rejected = all.filter(a => a.status === 'rejected')
  const cancelled = all.filter(a => a.status === 'cancelled')

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflow: 'hidden' }}>

      {/* Decorative hands */}
      <img
        src="/hands-left.svg"
        alt=""
        aria-hidden
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          width: 'auto',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.85,
          zIndex: 0,
        }}
      />
      <img
        src="/hands-right.svg"
        alt=""
        aria-hidden
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100%',
          width: 'auto',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.85,
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

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
        <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          {pending.length} pending · {approved.length} approved · {rejected.length} rejected · {cancelled.length} cancelled
        </p>

        <AdminTabBar />

        <NotificationsSection initialNotifications={notifications ?? []} />

        {dbError && (
          <div style={{ padding: '1rem 1.5rem', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '0.75rem', background: 'rgba(255,0,0,0.05)', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#ff8080', marginBottom: '0.25rem', fontWeight: 700 }}>Database error</p>
            <p style={{ fontSize: '0.75rem', color: '#F3EDE6', opacity: 0.6, fontFamily: 'monospace' }}>{dbError.message}</p>
          </div>
        )}

        {/* ── VOLUNTEERS ── */}
        <CollapsibleSection
          title="Registered Hands"
          summary={`${approved.length} members · ${volunteers?.length ?? 0} outside`}
        >
          <VolunteersSection
            volunteers={volunteers ?? []}
            campMembers={approved.map(a => ({
              id: a.id,
              first_name: a.first_name,
              last_name: a.last_name,
              preferred_name: a.preferred_name ?? null,
              email: a.email,
              contributions: a.contributions ?? null,
              attendance: a.attendance ?? null,
            }))}
          />
        </CollapsibleSection>

        {/* ── OVERVIEW ── */}
        <CollapsibleSection
          title="Overview"
          summary={`${approved.length + pending.length} active`}
        >
          <OverviewSection applications={all} />
        </CollapsibleSection>

{/* ── ROLE REQUESTS ── */}
        <CollapsibleSection
          title="Role Requests"
          summary="Pending approval"
        >
          <RoleRequestsSection />
        </CollapsibleSection>

        {/* ── DEPARTMENTS & ROLES ── */}
        <CollapsibleSection
          title="Departments"
          summary="Roles grouped by department"
        >
          <DepartmentsManager />
        </CollapsibleSection>

        {/* ── SCHEDULE ── */}
        <CollapsibleSection
          title="Schedule"
          summary="Edit public schedule"
        >
          <ScheduleManager />
        </CollapsibleSection>

        {/* ── REGISTRY ── */}
        <CollapsibleSection
          title="Registry"
          summary={`${pending.length} pending · ${approved.length} approved`}
        >
          {all.length === 0 ? (
            <p style={{ textAlign: 'center', opacity: 0.4, fontStyle: 'italic' }}>No applications yet.</p>
          ) : (
            <>
              {pending.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', marginBottom: '1rem' }}>
                    Pending Review
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {pending.map(app => <ApplicationRow key={app.id} app={app} showActions />)}
                  </div>
                </div>
              )}

              {approved.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  {pending.length > 0 && <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '2rem' }} />}
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A848', marginBottom: '1rem', opacity: 0.7 }}>
                    Approved
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {approved.map(app => <ApplicationRow key={app.id} app={app} showActions={false} />)}
                  </div>
                </div>
              )}

              {rejected.length > 0 && (
                <div>
                  <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '2rem' }} />
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F3EDE6', marginBottom: '1rem', opacity: 0.3 }}>
                    Not Approved
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {rejected.map(app => <ApplicationRow key={app.id} app={app} showActions={false} />)}
                  </div>
                </div>
              )}

              {cancelled.length > 0 && (
                <div>
                  <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '2rem' }} />
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ffb4b4', marginBottom: '1rem', opacity: 0.6 }}>
                    Cancelled
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {cancelled.map(app => <ApplicationRow key={app.id} app={app} showActions={false} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </CollapsibleSection>

      </div>
    </div>
  )
}
