import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminNav } from '../AdminNav'
import { CategoryHeading } from '../CategoryHeading'
import { NotificationBell } from '../NotificationBell'
import { ScheduleManager } from '../ScheduleManager'
import { LeadUpGatheringsManager } from '../LeadUpGatheringsManager'
import { ResourcesManager } from '../ResourcesManager'
import { ShiftSignupToggle } from '../ShiftSignupToggle'
import { PROGRAM_CATEGORIES } from '../admin-sections'
import { getAdminRunway } from '@/lib/admin-attention'

// Soft shared backdrop that holds each workspace together as one section —
// a barely-lifted cream wash with a hairline gold edge.
const workspacePanel: React.CSSProperties = {
  padding: '1.4rem 1.5rem',
  marginBottom: '3rem',
  borderRadius: '0.9rem',
  border: '1px solid rgba(200,168,72,0.14)',
  background: 'rgba(243,237,230,0.03)',
}

export default async function ProgramPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  if (!(await requireAdmin())) redirect('/')

  const [{ data: configRows }, { data: notifications }, runway] = await Promise.all([
    supabaseAdmin
      .from('page_content')
      .select('key, value')
      .in('key', ['config_shift_signup_open', 'config_event_start_date', 'config_event_end_date']),
    supabaseAdmin
      .from('admin_notifications')
      .select('id, application_id, event_type, message, details, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(20),
    getAdminRunway(),
  ])
  const configMap = Object.fromEntries((configRows ?? []).map(r => [r.key, r.value]))
  const shiftSignupOpen = configMap['config_shift_signup_open'] !== 'false'
  const eventRangeStart = configMap['config_event_start_date'] ?? ''
  const eventRangeEnd = configMap['config_event_end_date'] ?? ''

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflowX: 'clip' }}>

      {/* Decorative hands */}
      <img src="/hands-left.svg" alt="" aria-hidden style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        <AdminNav sections={PROGRAM_CATEGORIES} runway={runway} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <NotificationBell initialNotifications={notifications ?? []} />
        </div>

        <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#C8A848', marginBottom: '0.5rem', textAlign: 'center' }}>
          Program
        </h1>
        <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          The schedule of camp and the gatherings on the runway to it
        </p>

        {/* ═══════════════ SCHEDULE ═══════════════ */}
        <CategoryHeading id="schedule" large />

        <div style={workspacePanel}>
          <ScheduleManager rangeStart={eventRangeStart} rangeEnd={eventRangeEnd}>
            <ShiftSignupToggle initialOpen={shiftSignupOpen} />
          </ScheduleManager>
        </div>

        {/* ═══════════════ LEAD-UP GATHERINGS ═══════════════ */}
        <CategoryHeading id="lead-up" large />

        <div style={workspacePanel}>
          <LeadUpGatheringsManager rangeStart={eventRangeStart} rangeEnd={eventRangeEnd} />
        </div>

        {/* ═══════════════ SHARED RESOURCES ═══════════════ */}
        <CategoryHeading id="resources" large />

        <div style={workspacePanel}>
          <ResourcesManager />
        </div>

      </div>
    </div>
  )
}
