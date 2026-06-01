import { EventIcon } from '@/components/EventIcon'

type Props = {
  contributions: string[]
  role: { name: string; description: string | null; purpose: string | null } | null
  dept: { name: string; icon: string | null } | null
  shift: { title: string; day: string; time: string; icon_type: string } | null
  roleApprovalStatus: string | null
}

const CONTRIBUTION_META: Record<string, { icon: string; desc: string }> = {
  Setup:    { icon: '⚒️',  desc: 'Build & transform the space' },
  Teardown: { icon: '🔩',  desc: 'Break down & restore the site' },
  Decor:    { icon: '🕯️', desc: 'Visual atmosphere of camp' },
  Other:    { icon: '🤝',  desc: 'Contributing in another capacity' },
}

const DAY_SHORT: Record<string, string> = {
  Wednesday: 'Wednesday',
  Thursday:  'Thursday',
  Friday:    'Friday',
  Saturday:  'Saturday',
  Sunday:    'Sunday',
  Monday:    'Monday',
}

function CommitmentCard({
  icon,
  title,
  subtitle,
  detail,
  tag,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string | null
  detail?: string | null
  tag: 'contribution' | 'designation' | 'shift'
}) {
  const TAG_COLORS = {
    contribution: { color: '#c8a848', border: 'rgba(200,168,72,0.35)', bg: 'rgba(200,168,72,0.07)' },
    designation:  { color: '#D239F8', border: 'rgba(210,57,248,0.3)', bg: 'rgba(210,57,248,0.06)' },
    shift:        { color: '#7dcf8e', border: 'rgba(100,200,120,0.3)', bg: 'rgba(100,200,120,0.06)' },
  }
  const t = TAG_COLORS[tag]
  return (
    <div style={{
      padding: '1.5rem 0.5rem',
      border: '1px solid rgba(200,168,72,0.15)',
      borderRadius: '0.875rem',
      background: 'rgba(255,255,255,0.02)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
      textAlign: 'center',
    }}>
      {/* Circle icon */}
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
        border: '1.5px solid #C07C26',
        background: 'radial-gradient(circle at 42% 38%, rgba(200,168,72,0.14), rgba(8,0,18,0.85))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>

      {/* Tag */}
      <span style={{
        fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase',
        color: t.color, border: `1px solid ${t.border}`, background: t.bg,
        borderRadius: '9999px', padding: '0.18rem 0.6rem',
      }}>
        {tag === 'contribution' ? 'Contribution' : tag === 'designation' ? 'Designation' : 'Shift'}
      </span>

      {/* Text */}
      <div>
        <p style={{ fontSize: '0.82rem', fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#EDE0C8', margin: '0 0 0.2rem', lineHeight: 1.4 }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ fontSize: '0.75rem', color: '#B0947A', lineHeight: 1.5, margin: 0 }}>{subtitle}</p>
        )}
        {detail && (
          <p style={{ fontSize: '0.72rem', color: '#B0947A', lineHeight: 1.5, margin: '0.2rem 0 0', opacity: 0.8 }}>{detail}</p>
        )}
      </div>
    </div>
  )
}

export function DashboardCommitments({ contributions, role, dept, shift, roleApprovalStatus }: Props) {
  const hasAnything = contributions.length > 0 || role || shift
  const isPending = roleApprovalStatus === 'pending'

  return (
    <div style={{
      border: '1px solid rgba(200,168,72,0.25)',
      borderRadius: '1rem',
      background: 'rgba(10,0,20,0.5)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid rgba(200,168,72,0.15)' }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '0.7rem', letterSpacing: '0.18em', color: '#C8A848', margin: 0, textTransform: 'uppercase', opacity: 0.9 }}>
          Your Commitments
        </p>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {!hasAnything ? (
          <p style={{ fontSize: '0.85rem', opacity: 0.45, fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
            No commitments selected yet.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
            {contributions.map(c => {
              const meta = CONTRIBUTION_META[c] ?? { icon: '✦', desc: '' }
              return (
                <CommitmentCard
                  key={c}
                  icon={<span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{meta.icon}</span>}
                  title={c}
                  subtitle={meta.desc}
                  tag="contribution"
                />
              )
            })}
            {role && (
              <CommitmentCard
                icon={
                  dept?.icon
                    ? dept.icon.startsWith('/')
                      ? <img src={dept.icon} alt="" aria-hidden style={{ width: '62%', height: '62%', objectFit: 'contain', opacity: 0.85 }} />
                      : <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{dept.icon}</span>
                    : <img src="/handicon.png" alt="" aria-hidden style={{ width: '62%', height: '62%', objectFit: 'contain', opacity: 0.85 }} />
                }
                title={isPending ? `${role.name} (pending)` : role.name}
                subtitle={dept?.name ?? null}
                detail={role.description ?? role.purpose ?? null}
                tag="designation"
              />
            )}
            {shift && (
              <CommitmentCard
                icon={
                  <div style={{ color: '#C8A848', opacity: 0.75 }}>
                    <EventIcon type={shift.icon_type} size={40} />
                  </div>
                }
                title={shift.title}
                subtitle={DAY_SHORT[shift.day] ?? shift.day}
                detail={shift.time}
                tag="shift"
              />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid rgba(200,168,72,0.1)' }}>
        <a href="/apply" style={{ fontSize: '0.75rem', color: '#C8A848', opacity: 0.7, textDecoration: 'none', letterSpacing: '0.05em' }}>
          View / Manage Commitments →
        </a>
      </div>
    </div>
  )
}
