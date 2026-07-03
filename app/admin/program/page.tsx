import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminNav } from '../AdminNav'
import { CategoryHeading } from '../CategoryHeading'
import { NotificationBell } from '../NotificationBell'
import { ScheduleManager } from '../ScheduleManager'
import { LeadUpGatheringsManager } from '../LeadUpGatheringsManager'
import { ResourcesManager } from '../ResourcesManager'
import { ShiftSignupToggle } from '../ShiftSignupToggle'
import { PROGRAM_CATEGORIES } from '../admin-sections'
import { getAdminRunway } from '@/lib/admin-attention'

export default async function ProgramPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') redirect('/')

  const { data: configRows } = await supabaseAdmin
    .from('page_content')
    .select('key, value')
    .in('key', ['config_shift_signup_open', 'config_event_start_date', 'config_event_end_date'])
  const configMap = Object.fromEntries((configRows ?? []).map(r => [r.key, r.value]))
  const shiftSignupOpen = configMap['config_shift_signup_open'] !== 'false'
  const eventRangeStart = configMap['config_event_start_date'] ?? ''
  const eventRangeEnd = configMap['config_event_end_date'] ?? ''

  const { data: notifications } = await supabaseAdmin
    .from('admin_notifications')
    .select('id, application_id, event_type, message, details, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(20)

  const runway = await getAdminRunway()

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
        <CategoryHeading id="schedule" />

        <div style={{ marginBottom: '3.5rem' }}>
          <ShiftSignupToggle initialOpen={shiftSignupOpen} />
          <ScheduleManager rangeStart={eventRangeStart} rangeEnd={eventRangeEnd} />
        </div>

        {/* ═══════════════ LEAD-UP GATHERINGS ═══════════════ */}
        <CategoryHeading id="lead-up" />

        <div style={{ marginBottom: '3.5rem' }}>
          <LeadUpGatheringsManager rangeStart={eventRangeStart} rangeEnd={eventRangeEnd} />
        </div>

        {/* ═══════════════ SHARED RESOURCES ═══════════════ */}
        <CategoryHeading id="resources" />

        <ResourcesManager />

      </div>
    </div>
  )
}
