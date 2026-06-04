'use client'

type App = {
  status: string
  membership_type: string | null
  attendance: string | null
}

function CountRow({ label, approved, pending }: { label: string; approved: number; pending: number }) {
  if (approved === 0 && pending === 0) return null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.65rem 1rem',
      borderRadius: '0.5rem',
      border: '1px solid rgba(200,168,72,0.08)',
      background: 'rgba(255,255,255,0.02)',
    }}>
      <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {approved > 0 && (
          <span style={{ fontSize: '0.85rem', color: '#C8A848', fontWeight: 600 }}>{approved}</span>
        )}
        {pending > 0 && (
          <span style={{ fontSize: '0.75rem', color: '#D239F8', opacity: 0.7 }}>
            {approved > 0 ? '+' : ''}{pending} pending
          </span>
        )}
      </div>
    </div>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F3EDE6', opacity: 0.35, marginBottom: '0.75rem' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {children}
      </div>
    </div>
  )
}

function groupBy(apps: App[], key: keyof App) {
  const map: Record<string, { approved: number; pending: number }> = {}
  for (const app of apps) {
    const val = (app[key] as string) || 'Unknown'
    if (!map[val]) map[val] = { approved: 0, pending: 0 }
    if (app.status === 'approved') map[val].approved++
    else if (app.status === 'pending') map[val].pending++
  }
  return map
}

export function OverviewSection({ applications }: { applications: App[] }) {
  const active = applications.filter(a => a.status === 'approved' || a.status === 'pending')

  const membershipType = groupBy(active, 'membership_type')
  const attendance = groupBy(active, 'attendance')

  const attendanceOrder = ['Full event', 'Partial event', 'Unsure']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
      <Subsection title="Membership Type">
        {Object.entries(membershipType).map(([label, counts]) => (
          <CountRow key={label} label={label} {...counts} />
        ))}
      </Subsection>

      <Subsection title="Attendance">
        {attendanceOrder.map(label => {
          const counts = attendance[label] ?? { approved: 0, pending: 0 }
          return <CountRow key={label} label={label} {...counts} />
        })}
      </Subsection>
    </div>
  )
}
