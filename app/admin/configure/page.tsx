import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminNav } from '../AdminNav'
import { CategoryHeading } from '../CategoryHeading'
import { CollapsibleSection } from '../CollapsibleSection'
import { NotificationBell } from '../NotificationBell'
import { ProfileFieldsManager } from '../ProfileFieldsManager'
import { DistinctionsManager } from '../DistinctionsManager'
import { AttunementTasksManager } from '../AttunementTasksManager'
import { DepartmentsManager } from '../DepartmentsManager'
import { GroupsManager } from '../GroupsManager'
import { ShiftTypesManager } from '../ShiftTypesManager'
import { EventDatesManager } from '../EventDatesManager'
import { AdminsManager } from '../AdminsManager'
import { PollManagersManager } from '../PollManagersManager'
import { DebugSection } from '../DebugSection'
import { CONFIGURE_CATEGORIES } from '../admin-sections'
import { parseAttunementTasks, parseAttunementNudgeDays } from '@/lib/site-config'
import { getGroupCollections } from '@/lib/group-collections'
import { parseDistinctions } from '@/lib/distinctions'
import { parseProfileFields, distinctionCatalog } from '@/lib/profile-fields'
import { getAdminRunway } from '@/lib/admin-attention'

export default async function ConfigurePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') redirect('/')

  const { data: configRows } = await supabaseAdmin
    .from('page_content')
    .select('key, value')
    .in('key', ['config_attunement_tasks', 'config_distinctions', 'config_profile_fields', 'config_event_start_date', 'config_event_end_date', 'config_attunement_nudge_days'])
  const configMap = Object.fromEntries((configRows ?? []).map(r => [r.key, r.value]))
  const attunementTasks = parseAttunementTasks(configMap['config_attunement_tasks'])
  const distinctions = parseDistinctions(configMap['config_distinctions'])
  const profileFields = parseProfileFields(configMap['config_profile_fields'])
  // Facts a distinction rule may reference — derived from the registry.
  const distinctionFactCatalog = distinctionCatalog(profileFields)

  // Group icon images — offered as medal art in the distinctions builder.
  const { data: groupIconRows } = await supabaseAdmin
    .from('groups')
    .select('name, icon_image')
    .not('icon_image', 'is', null)
    .order('sort_order')
  const groupIconOptions = (groupIconRows ?? [])
    .filter(g => g.icon_image)
    .map(g => ({ name: g.name as string, image: g.icon_image as string }))

  // Collections + their group counts — power the Attunement "collection membership"
  // requirement (which collection, and the cap on how many groups can be required).
  const { collections: groupCollections, uncollected } = await getGroupCollections()
  const attunementCollections = groupCollections.map(c => ({ id: c.id, name: c.name, groupCount: c.groups.length }))
  const totalGroupCount = groupCollections.reduce((n, c) => n + c.groups.length, 0) + uncollected.length

  // Shift types — offered as targets for a shift-hours attunement task.
  const { data: shiftTypeRows } = await supabaseAdmin
    .from('shift_types').select('id, name').order('sort_order')
  const shiftTypeOptions = (shiftTypeRows ?? []).map(s => ({ id: s.id as string, name: s.name as string }))

  const { data: notifications } = await supabaseAdmin
    .from('admin_notifications')
    .select('id, application_id, event_type, message, details, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(20)

  // Approved members + which of them are admins in Clerk (for the Admins manager).
  const { data: applications } = await supabaseAdmin
    .from('applications')
    .select('clerk_user_id, first_name, last_name, preferred_name, email, status')
    .eq('status', 'approved')
  const approvedWithClerk = (applications ?? []).filter(a => a.clerk_user_id)
  const clerkUsers = await Promise.all(
    approvedWithClerk.map(a => client.users.getUser(a.clerk_user_id!).catch(() => null))
  )
  const adminMembers = approvedWithClerk.map((a, i) => ({
    clerk_user_id: a.clerk_user_id!,
    first_name: a.first_name,
    last_name: a.last_name,
    preferred_name: a.preferred_name ?? null,
    email: a.email,
    isAdmin: clerkUsers[i]?.publicMetadata?.role === 'admin',
    canManagePolls: clerkUsers[i]?.publicMetadata?.canManagePolls === true,
  }))

  // Approved members shaped for the Groups roster (assign members to groups).
  const groupMembers = approvedWithClerk.map(a => ({
    clerk_user_id: a.clerk_user_id!,
    displayName: [a.preferred_name || a.first_name, a.last_name].filter(Boolean).join(' '),
    email: a.email,
  }))

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflowX: 'clip' }}>

      {/* Decorative hands */}
      <img src="/hands-left.svg" alt="" aria-hidden style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        <AdminNav sections={CONFIGURE_CATEGORIES} runway={await getAdminRunway()} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <NotificationBell initialNotifications={notifications ?? []} />
        </div>

        <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#C8A848', marginBottom: '0.5rem', textAlign: 'center' }}>
          Configure
        </h1>
        <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          Define the forms, fields, recognition, and structure the camp runs on
        </p>

        {/* ═══════════════ FORMS & FIELDS ═══════════════ */}
        <CategoryHeading id="forms" />

        {/* The application form builder lives on its own full-screen page */}
        <div style={{ marginBottom: '1.5rem' }}>
          <a
            href="/admin/configure/application-form"
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', boxSizing: 'border-box',
              padding: '1rem 1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(200,168,72,0.2)',
              background: 'rgba(200,168,72,0.03)',
              color: '#C8A848',
              textDecoration: 'none',
              fontSize: '0.88rem',
              letterSpacing: '0.06em',
            }}
          >
            <span>Application form builder</span>
            <span style={{ opacity: 0.5 }}>→</span>
          </a>
        </div>

        <CollapsibleSection
          title="Profile Fields"
          summary="The canonical schema for member profile data"
        >
          <ProfileFieldsManager initialFields={profileFields} />
        </CollapsibleSection>

        {/* ═══════════════ RECOGNITION & TASKS ═══════════════ */}
        <CategoryHeading id="recognition" />

        <CollapsibleSection
          title="Distinctions"
          summary="Earned medals in each member's Cabinet of Distinctions"
        >
          <DistinctionsManager initialDistinctions={distinctions} groupIconOptions={groupIconOptions} factCatalog={distinctionFactCatalog} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Attunement Tasks"
          summary="Profile checklist items members complete"
        >
          <AttunementTasksManager initialTasks={attunementTasks} collections={attunementCollections} totalGroupCount={totalGroupCount} shiftTypes={shiftTypeOptions} initialNudgeDays={parseAttunementNudgeDays(configMap['config_attunement_nudge_days'])} />
        </CollapsibleSection>

        {/* ═══════════════ STRUCTURE ═══════════════ */}
        <CategoryHeading id="structure" />

        <CollapsibleSection
          title="Event Dates"
          summary="When the event runs — drives the schedule calendars' day columns"
        >
          <EventDatesManager
            initialStart={configMap['config_event_start_date'] ?? ''}
            initialEnd={configMap['config_event_end_date'] ?? ''}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Departments"
          summary="Roles grouped by department"
        >
          <DepartmentsManager groupIconOptions={groupIconOptions} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Groups"
          summary="Group collections and the groups within them — plus who's assigned to each"
        >
          <GroupsManager members={groupMembers} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Shift Types"
          summary="The kinds of shift members sign up for (Setup, Service, …)"
        >
          <ShiftTypesManager />
        </CollapsibleSection>

        {/* ═══════════════ ACCESS & SYSTEM ═══════════════ */}
        <CategoryHeading id="system" />

        <CollapsibleSection title="Admins" summary="Grant or remove admin access">
          <AdminsManager members={adminMembers} />
        </CollapsibleSection>

        <CollapsibleSection title="Poll Managers" summary="Let members manage polls from their dashboard">
          <PollManagersManager members={adminMembers} />
        </CollapsibleSection>

        <CollapsibleSection title="Debug Tools" summary="Testing utilities">
          <DebugSection />
        </CollapsibleSection>

      </div>
    </div>
  )
}
