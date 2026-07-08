import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { ApplicationRow } from './ApplicationRow'
import { CollapsibleSection } from './CollapsibleSection'
import { VolunteersSection } from './VolunteersSection'
import { NotificationBell } from './NotificationBell'
import { AdminNav } from './AdminNav'
import { CategoryHeading } from './CategoryHeading'
import { COMMUNITY_CATEGORIES } from './admin-sections'
import { AnnouncementsManager } from './AnnouncementsManager'
import { RadioManager } from './RadioManager'
import { ResourcesManager } from './ResourcesManager'
import { getGroupNamesByUser } from '@/lib/groups'
import { getShiftEventByUser } from '@/lib/shift-signups'
import { getSuspendedClerkUserIds, isSuspended } from '@/lib/admin-counts'
import { getAdminRunway } from '@/lib/admin-attention'
import { parseRadioSources } from '@/lib/radio'
import { getAdminRadioEvents, getAdminResourceLists, getStewardOptions } from '@/lib/admin-program-data'
import { RoleRequestsSection } from './RoleRequestsSection'
import { RoleSuggestionsSection } from './RoleSuggestionsSection'

// A failed section fetch degrades to undefined — the manager then runs its own
// mount fetch and shows its usual retry UI instead of the whole page erroring.
const safe = <T,>(p: Promise<T>): Promise<T | undefined> => p.catch(() => undefined)

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  if (!(await requireAdmin())) redirect('/')

  const [
    { data: volunteersRaw },
    { data: applications, error: dbError },
    suspendedClerkIds,
    groupNamesByUser,
    signupEventMap,
    runway,
    { data: notifications, error: notificationsError },
    radioEvents,
    { data: radioConfigRow },
    resourceLists,
    stewardOptions,
  ] = await Promise.all([
    supabaseAdmin
      .from('volunteers')
      .select('id, first_name, last_name, preferred_name, email, phone, days_available, preferred_times, shift_interests, other_notes, signup_intent, status, created_at')
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('applications')
      .select('id, clerk_user_id, first_name, last_name, preferred_name, email, status, submitted_at, attendance, membership_type, camped_before, setup_preference')
      .order('submitted_at', { ascending: false }),
    // Suspended members (063) — marked in the roster so a member with released
    // commitments doesn't read as inexplicably empty. Shared with Overview
    // (lib/admin-counts.ts) so "who is suspended" can never drift between tabs.
    getSuspendedClerkUserIds(),
    getGroupNamesByUser(),
    getShiftEventByUser(),
    getAdminRunway(),
    supabaseAdmin
      .from('admin_notifications')
      .select('id, application_id, event_type, message, details, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(20),
    safe(getAdminRadioEvents()),
    supabaseAdmin
      .from('page_content')
      .select('value')
      .eq('key', 'config_radio')
      .maybeSingle(),
    safe(getAdminResourceLists()),
    safe(getStewardOptions()),
  ])

  const volunteers = volunteersRaw ?? []
  const pendingVolunteers = volunteers.filter(v => v.status === 'pending')
  const activeVolunteers = volunteers.filter(v => v.status === 'active')

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

        <AdminNav sections={COMMUNITY_CATEGORIES} runway={runway} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <NotificationBell initialNotifications={notifications ?? []} />
        </div>

        <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#C8A848', marginBottom: '0.5rem', textAlign: 'center' }}>
          Community
        </h1>
        <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          The people of camp, what they hear, and what they&apos;re bringing
        </p>

        {dbError && (
          <div style={{ padding: '1rem 1.5rem', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '0.75rem', background: 'rgba(255,0,0,0.05)', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#ff8080', marginBottom: '0.25rem', fontWeight: 700 }}>Database error</p>
            <p style={{ fontSize: '0.75rem', color: '#F3EDE6', opacity: 0.6, fontFamily: 'monospace' }}>{dbError.message}</p>
          </div>
        )}

        {/* ═══════════════ PEOPLE ═══════════════ */}
        <CategoryHeading id="people" />

        {/* Registered members + outside volunteers. Sections on this page
            start collapsed — the summaries carry the at-a-glance counts —
            except Applications, which opens itself while reviews are waiting. */}
        <CollapsibleSection
          title="Registered Hands"
          summary={`${approved.length} members · ${activeVolunteers.length} outside${pendingVolunteers.length > 0 ? ` · ${pendingVolunteers.length} pending` : ''}`}
          defaultOpen={false}
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
              suspended: isSuspended(a.clerk_user_id, suspendedClerkIds),
            }))}
          />
        </CollapsibleSection>

        {/* Application review queue */}
        <CollapsibleSection
          title="Applications"
          summary={`${pending.length} pending${rejected.length > 0 ? ` · ${rejected.length} not approved` : ''}${cancelled.length > 0 ? ` · ${cancelled.length} cancelled` : ''}`}
          defaultOpen={pending.length > 0}
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
          defaultOpen={false}
        >
          <RoleRequestsSection />
        </CollapsibleSection>

        <CollapsibleSection
          title="Role Suggestions"
          summary="Submitted by members"
          defaultOpen={false}
        >
          <RoleSuggestionsSection />
        </CollapsibleSection>

        {/* ═══════════════ COMMUNICATION ═══════════════ */}
        <CategoryHeading id="communication" />

        <CollapsibleSection
          title="Announcements"
          summary="Post updates visible to all members"
          defaultOpen={false}
        >
          <AnnouncementsManager />
        </CollapsibleSection>

        <CollapsibleSection
          title="Radio"
          summary={radioEvents ? `${radioEvents.length} post${radioEvents.length === 1 ? '' : 's'} in the feed` : 'Curate the community feed'}
          defaultOpen={false}
        >
          <RadioManager
            initialEvents={radioEvents}
            initialSources={parseRadioSources(radioConfigRow?.value)}
          />
        </CollapsibleSection>

        {/* ═══════════════ LOGISTICS ═══════════════ */}
        <CategoryHeading id="logistics" />

        <CollapsibleSection
          title="Shared Resources"
          summary={resourceLists
            ? `${resourceLists.length} list${resourceLists.length === 1 ? '' : 's'} · ${resourceLists.reduce((n, l) => n + l.items.length, 0)} items`
            : 'Bring Something — needs & claims'}
          defaultOpen={false}
        >
          <ResourcesManager initialLists={resourceLists} initialStewards={stewardOptions} />
        </CollapsibleSection>

      </div>
    </div>
  )
}
