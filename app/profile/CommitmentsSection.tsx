import { EventIcon } from '@/components/EventIcon'

type Props = {
  contributions: string[]
  role: { name: string; description: string | null; purpose: string | null } | null
  dept: { name: string; icon: string | null } | null
  shift: { title: string; day: string; time: string; icon_type: string } | null
  roleApprovalStatus: string | null
}

const CONTRIBUTION_META: Record<string, { icon: string; desc: string }> = {
  Setup:    { icon: '⚒️',  desc: 'Help build and transform the space before camp begins.' },
  Teardown: { icon: '🔩',  desc: 'Help break down and restore the site after camp ends.' },
  Decor:    { icon: '🕯️', desc: 'Create and maintain the visual atmosphere of camp.' },
  Other:    { icon: '🤝',  desc: 'Contributing in another capacity.' },
}

const DAY_LABELS: Record<string, string> = {
  Wednesday: 'Wednesday, July 23',
  Thursday:  'Thursday, July 24',
  Friday:    'Friday, July 25',
  Saturday:  'Saturday, July 26',
  Sunday:    'Sunday, July 27',
  Monday:    'Monday, July 28',
}

const TAG_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  CONTRIBUTION: { color: '#c8a848', border: 'rgba(200,168,72,0.4)', bg: 'rgba(200,168,72,0.08)' },
  DESIGNATION:  { color: '#D239F8', border: 'rgba(210,57,248,0.35)', bg: 'rgba(210,57,248,0.07)' },
  SHIFT:        { color: '#7dcf8e', border: 'rgba(100,200,120,0.35)', bg: 'rgba(100,200,120,0.07)' },
}

function CircleIcon({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '74px', height: '74px', borderRadius: '50%', flexShrink: 0,
      border: '1.5px solid #C07C26',
      background: 'radial-gradient(circle at 42% 38%, rgba(200,168,72,0.14), rgba(8,0,18,0.85))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </div>
  )
}

function Tag({ label }: { label: string }) {
  const s = TAG_STYLES[label] ?? TAG_STYLES.CONTRIBUTION
  return (
    <span style={{
      fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase',
      color: s.color, border: `1px solid ${s.border}`, background: s.bg,
      borderRadius: '9999px', padding: '0.2rem 0.65rem', flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function Row({ circleContent, title, description, tag }: {
  circleContent: React.ReactNode
  title: string
  description: string | null
  tag: string
}) {
  return (
    <div className="commitments-row">
      <CircleIcon>{circleContent}</CircleIcon>
      <div className="commitments-row-text">
        <p style={{ fontSize: '0.95rem', fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#EDE0C8', margin: '0 0 0.2rem', lineHeight: 1.9 }}>
          {title}
        </p>
        {description && (
          <p style={{ fontSize: '0.78rem', color: '#B0947A', lineHeight: 2.1, margin: 0, whiteSpace: 'pre-line' }}>{description}</p>
        )}
      </div>
      <Tag label={tag} />
    </div>
  )
}

export function CommitmentsSection({ contributions, role, dept, shift, roleApprovalStatus }: Props) {
  const hasAnything = contributions.length > 0 || role || shift
  if (!hasAnything) return null

  const isPending = roleApprovalStatus === 'pending'

  return (
    <div style={{ border: '1.5px solid rgba(200,168,72,0.7)', borderRadius: '1rem', background: 'rgba(10,0,20,0.6)', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(200,168,72,0.12), 0 0 24px rgba(200,168,72,0.08)' }}>
      <style>{`
        .commitments-rows { padding: 0 2rem; }
        .commitments-row  { display: flex; align-items: center; gap: 1.5rem; padding: 1.1rem 0; }
        .commitments-row-text { flex: 1; min-width: 0; padding-right: 0.5rem; }
        @media (max-width: 480px) {
          .commitments-rows { padding: 0 1rem; }
          .commitments-row  { gap: 0.85rem; }
          .commitments-row-text { padding-right: 0; }
        }
      `}</style>
      {/* Header */}
      <div style={{ padding: '1.1rem 1.5rem 1rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.6rem', color: '#C8A848', margin: '0 0 1rem', letterSpacing: '0.1em', textShadow: '0 0 20px rgba(200,168,72,0.4)' }}>
          Your Commitments
        </p>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(200,168,72,0.5) 20%, rgba(200,168,72,0.5) 80%, transparent 95%)' }} />
      </div>

      {/* Rows */}
      <div className="commitments-rows">
        {/* Contributions */}
        {contributions.map((c, i) => {
          const meta = CONTRIBUTION_META[c] ?? { icon: '✦', desc: null }
          return (
            <div key={c}>
              <Row
                circleContent={<span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{meta.icon}</span>}
                title={c}
                description={meta.desc}
                tag="CONTRIBUTION"
              />
              {(i < contributions.length - 1 || role || shift) && (
                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)' }} />
              )}
            </div>
          )
        })}

        {/* Role */}
        {role && (
          <div>
            <Row
              circleContent={
                dept?.icon
                  ? dept.icon.startsWith('/')
                    ? <img src={dept.icon} alt="" aria-hidden style={{ width: '68%', height: '68%', objectFit: 'contain', opacity: 0.85 }} />
                    : <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{dept.icon}</span>
                  : <img src="/handicon.png" alt="" aria-hidden style={{ width: '68%', height: '68%', objectFit: 'contain', opacity: 0.85 }} />
              }
              title={isPending ? `${role.name} (pending)` : role.name}
              description={role.description || role.purpose}
              tag="DESIGNATION"
            />
            {shift && <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)' }} />}
          </div>
        )}

        {/* Shift */}
        {shift && (
          <Row
            circleContent={
              <div style={{ color: '#C8A848', opacity: 0.75 }}>
                <EventIcon type={shift.icon_type} size={48} />
              </div>
            }
            title={shift.title}
            description={`${DAY_LABELS[shift.day] ?? shift.day}\n${shift.time}`}
            tag="SHIFT"
          />
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '1rem 2rem' }}>
        <a href="/apply" style={{ fontSize: '0.78rem', color: '#C8A848', opacity: 0.85, textDecoration: 'none', letterSpacing: '0.04em' }}>
          Manage commitments →
        </a>
      </div>
    </div>
  )
}
