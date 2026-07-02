import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { ApplicationRow } from './ApplicationRow'
import { CollapsibleSection } from './CollapsibleSection'
import { VolunteersSection } from './VolunteersSection'
import { NotificationBell } from './NotificationBell'
import { AdminNav } from './AdminNav'
import { CategoryHeading } from './CategoryHeading'
import { MANAGE_CATEGORIES } from './admin-sections'
import { ScheduleManager } from './ScheduleManager'
import { LeadUpGatheringsManager } from './LeadUpGatheringsManager'
import { AnnouncementsManager } from './AnnouncementsManager'
import { getGroupNamesByUser } from '@/lib/groups'
import { getShiftEventByUser } from '@/lib/shift-signups'
import { getAdminRunway } from '@/lib/admin-attention'
import { RoleRequestsSection } from './RoleRequestsSection'
import { RoleSuggestionsSection } from './RoleSuggestionsSection'
import { ShiftSignupToggle } from './ShiftSignupToggle'

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') redirect('/')

  const { data: volunteersRaw } = await supabaseAdmin
    .from('volunteers')
    .select('id, first_name, last_name, preferred_name, email, phone, days_available, preferred_times, shift_interests, other_notes, signup_intent, status, created_at')
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false })
  const volunteers = volunteersRaw ?? []
  const pendingVolunteers = volunteers.filter(v => v.status === 'pending')
  const activeVolunteers = volunteers.filter(v => v.status === 'active')

  const { data: applications, error: dbError } = await supabaseAdmin
    .from('applications')
    .select('id, clerk_user_id, first_name, last_name, preferred_name, email, status, submitted_at, attendance, membership_type, camped_before, setup_preference')
    .order('submitted_at', { ascending: false })

  const groupNamesByUser = await getGroupNamesByUser()

  const signupEventMap = await getShiftEventByUser()
  const runway = await getAdminRunway()

  const { data: configRows } = await supabaseAdmin
    .from('page_content')
    .select('key, value')
    .in('key', ['config_shift_signup_open'])
  const configMap = Object.fromEntries((configRows ?? []).map(r => [r.key, r.value]))
  const shiftSignupOpen = configMap['config_shift_signup_open'] !== 'false'

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
  // Exclude cancelled applications where the person has since rejoined as an active volunteer
  const activeVolunteerEmails = new Set(volunteers.filter(v => v.status === 'active').map(v => v.email.toLowerCase()))
  const cancelled = all.filter(a => a.status === 'cancelled' && !activeVolunteerEmails.has(a.email.toLowerCase()))

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflowX: 'clip' }}>

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

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        <AdminNav sections={MANAGE_CATEGORIES} runway={runway} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <NotificationBell initialNotifications={notifications ?? []} />
        </div>

        <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#C8A848', marginBottom: '0.5rem', textAlign: 'center' }}>
          ManyHands Registry
        </h1>
        <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          {pending.length} pending · {approved.length} approved · {rejected.length} rejected · {cancelled.length} cancelled
        </p>

        {dbError && (
          <div style={{ padding: '1rem 1.5rem', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '0.75rem', background: 'rgba(255,0,0,0.05)', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#ff8080', marginBottom: '0.25rem', fontWeight: 700 }}>Database error</p>
            <p style={{ fontSize: '0.75rem', color: '#F3EDE6', opacity: 0.6, fontFamily: 'monospace' }}>{dbError.message}</p>
          </div>
        )}

        {/* ═══════════════ PEOPLE ═══════════════ */}
        <CategoryHeading id="people" />

        {/* Registered members + outside volunteers */}
        <CollapsibleSection
          title="Registered Hands"
          summary={`${approved.length} members · ${activeVolunteers.length} outside${pendingVolunteers.length > 0 ? ` · ${pendingVolunteers.length} pending` : ''}`}
        >
          <VolunteersSection
            volunteers={activeVolunteers}
            pendingVolunteers={pendingVolunteers}
            campMembers={approved.map(a => ({
              id: a.id,
              first_name: a.first_name,
              last_name: a.last_name,
              preferred_name: a.preferred_name ?? null,
              email: a.email,
              contributions: a.clerk_user_id ? groupNamesByUser[a.clerk_user_id] ?? null : null,
              attendance: a.attendance ?? null,
              schedule_event_id: signupEventMap[a.clerk_user_id] ?? null,
            }))}
          />
        </CollapsibleSection>

        {/* Application review queue */}
        <CollapsibleSection
          title="Applications"
          summary={`${pending.length} pending${rejected.length > 0 ? ` · ${rejected.length} not approved` : ''}${cancelled.length > 0 ? ` · ${cancelled.length} cancelled` : ''}`}
        >
          {pending.length === 0 && rejected.length === 0 && cancelled.length === 0 ? (
            <p style={{ textAlign: 'center', opacity: 0.4, fontStyle: 'italic' }}>No applications to review.</p>
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

              {rejected.length > 0 && (
                <div>
                  {pending.length > 0 && <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.2), transparent)', marginBottom: '2rem' }} />}
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

        <CollapsibleSection
          title="Role Requests"
          summary="Pending approval"
        >
          <RoleRequestsSection />
        </CollapsibleSection>

        <CollapsibleSection
          title="Role Suggestions"
          summary="Submitted by members"
        >
          <RoleSuggestionsSection />
        </CollapsibleSection>

        {/* ═══════════════ PROGRAM ═══════════════ */}
        <CategoryHeading id="program" />

        <CollapsibleSection
          title="Schedule"
          summary="Edit public schedule"
        >
          <ShiftSignupToggle initialOpen={shiftSignupOpen} />
          <ScheduleManager />
        </CollapsibleSection>

        <CollapsibleSection
          title="Lead-Up Gatherings"
          summary="Planning sessions on the runway to the event (members RSVP)"
        >
          <LeadUpGatheringsManager />
        </CollapsibleSection>

        {/* ═══════════════ COMMUNICATION ═══════════════ */}
        <CategoryHeading id="communication" />

        <CollapsibleSection
          title="Announcements"
          summary="Post updates visible to all members"
        >
          <AnnouncementsManager />
        </CollapsibleSection>

      </div>
    </div>
  )
}
