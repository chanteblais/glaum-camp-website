import { EventIcon } from '@/components/EventIcon'
import type { ContributionType } from '@/lib/application-options'
import { DEFAULT_CONTRIBUTION_TYPES } from '@/lib/application-options'

type Props = {
  contributions: string[]
  role: { name: string; description: string | null; purpose: string | null } | null
  dept: { name: string; icon: string | null } | null
  shift: { title: string; day: string; time: string; icon_type: string } | null
  roleApprovalStatus: string | null
  contributionTypes?: ContributionType[]
  showManageLink?: boolean
  title?: string
  compact?: boolean
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
  GROUP:        { color: '#c8a848', border: 'rgba(200,168,72,0.4)', bg: 'rgba(200,168,72,0.08)' },
  DESIGNATION:  { color: '#D239F8', border: 'rgba(210,57,248,0.35)', bg: 'rgba(210,57,248,0.07)' },
  SHIFT:        { color: '#7dcf8e', border: 'rgba(100,200,120,0.35)', bg: 'rgba(100,200,120,0.07)' },
}

function CircleIcon({ children, size = '56px' }: { children: React.ReactNode; size?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: '1.5px solid #C07C26',
      background: 'radial-gradient(circle at 42% 38%, rgba(200,168,72,0.14), rgba(8,0,18,0.85))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </div>
  )
}

function Tag({ label }: { label: string }) {
  const s = TAG_STYLES[label] ?? TAG_STYLES.GROUP
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

function Row({ circleContent, title, description, tag, iconSize, compact }: {
  circleContent: React.ReactNode
  title: string
  description: string | null
  tag: string
  iconSize?: string
  compact?: boolean
}) {
  return (
    <div className="commitments-row">
      <CircleIcon size={iconSize}>{circleContent}</CircleIcon>
      <div className="commitments-row-text">
        <p style={{ fontSize: '0.88rem', fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#EDE0C8', margin: '0 0 0.15rem', lineHeight: 1.5 }}>
          {title}
        </p>
        {description && !compact && (
          <p style={{ fontSize: '0.75rem', color: '#B0947A', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-line' }}>{description}</p>
        )}
        {description && compact && (
          <p style={{ fontSize: '0.72rem', color: '#B0947A', lineHeight: 1.4, margin: 0, whiteSpace: 'pre-line', opacity: 0.85 }}>{description}</p>
        )}
      </div>
      <Tag label={tag} />
    </div>
  )
}

export function CommitmentsSection({ contributions, role, dept, shift, roleApprovalStatus, contributionTypes = DEFAULT_CONTRIBUTION_TYPES, showManageLink = false, title = 'Your Commitments', compact = false }: Props) {
  const metaByValue = Object.fromEntries(contributionTypes.map(t => [t.value, { icon: t.icon, desc: t.description }]))
  const hasAnything = contributions.length > 0 || role || shift
  if (!hasAnything) return null

  const isPending = roleApprovalStatus === 'pending'
  const iconSize = compact ? '44px' : '56px'
  const rowPad = compact ? '0.55rem 0' : '0.75rem 0'
  const rowGap = compact ? '0.75rem' : '1rem'
  const sidepad = compact ? '0 1.25rem' : '0 1.5rem'

  return (
    <div style={{ border: '1.5px solid rgba(200,168,72,0.7)', borderRadius: '1rem', background: 'rgba(10,0,20,0.6)', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(200,168,72,0.12), 0 0 24px rgba(200,168,72,0.08)' }}>
      <style>{`
        .commitments-rows { padding: ${sidepad}; }
        .commitments-row  { display: flex; align-items: center; gap: ${rowGap}; padding: ${rowPad}; }
        .commitments-row-text { flex: 1; min-width: 0; padding-right: 0.5rem; }
        @media (max-width: 480px) {
          .commitments-rows { padding: 0 1rem; }
          .commitments-row  { gap: 0.6rem; }
          .commitments-row-text { padding-right: 0; }
        }
      `}</style>
      {/* Header */}
      <div style={{ padding: compact ? '0.65rem 1.25rem 0.55rem' : '0.85rem 1.5rem 0.75rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: compact ? '1.1rem' : '1.35rem', color: '#C8A848', margin: compact ? '0 0 0.55rem' : '0 0 0.75rem', letterSpacing: '0.1em', textShadow: '0 0 20px rgba(200,168,72,0.4)' }}>
          {title}
        </p>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(200,168,72,0.5) 20%, rgba(200,168,72,0.5) 80%, transparent 95%)' }} />
      </div>

      {/* Rows */}
      <div className="commitments-rows">
        {/* Role / Designation — shown first */}
        {role && (
          <div>
            <Row
              circleContent={
                dept?.icon
                  ? dept.icon.startsWith('/')
                    ? <img src={dept.icon} alt="" aria-hidden style={{ width: '62%', height: '62%', objectFit: 'contain', opacity: 0.85 }} />
                    : <span style={{ fontSize: compact ? '1.1rem' : '1.4rem', lineHeight: 1 }}>{dept.icon}</span>
                  : <img src="/handicon.png" alt="" aria-hidden style={{ width: '62%', height: '62%', objectFit: 'contain', opacity: 0.85 }} />
              }
              title={isPending ? `${role.name} (pending)` : role.name}
              description={role.description || role.purpose}
              tag="DESIGNATION"
              iconSize={iconSize}
              compact={compact}
            />
            {(contributions.length > 0 || shift) && (
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)' }} />
            )}
          </div>
        )}

        {/* Contributions */}
        {contributions.map((c, i) => {
          const meta = metaByValue[c] ?? { icon: '✦', desc: null }
          return (
            <div key={c}>
              <Row
                circleContent={<span style={{ fontSize: compact ? '1.1rem' : '1.4rem', lineHeight: 1 }}>{meta.icon}</span>}
                title={c}
                description={meta.desc}
                tag="GROUP"
                iconSize={iconSize}
                compact={compact}
              />
              {(i < contributions.length - 1 || shift) && (
                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)' }} />
              )}
            </div>
          )
        })}

        {/* Shift */}
        {shift && (
          <Row
            circleContent={
              <div style={{ color: '#C8A848', opacity: 0.75 }}>
                <EventIcon type={shift.icon_type} size={compact ? 28 : 36} />
              </div>
            }
            title={shift.title}
            description={`${DAY_LABELS[shift.day] ?? shift.day}\n${shift.time}`}
            tag="SHIFT"
            iconSize={iconSize}
            compact={compact}
          />
        )}
      </div>

      {/* Footer */}
      {showManageLink && (
        <div style={{ padding: '0.65rem 1.5rem' }}>
          <a href="/signup" style={{ fontSize: '0.78rem', color: '#C8A848', opacity: 0.85, textDecoration: 'none', letterSpacing: '0.04em' }}>
            Manage commitments →
          </a>
        </div>
      )}
    </div>
  )
}
