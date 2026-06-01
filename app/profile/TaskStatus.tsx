type Task = {
  id: string
  label: string
  done: boolean
  pending?: boolean   // in-progress but not actionable (e.g. awaiting admin)
  href?: string
  cta?: string
  note?: string
}

type Props = {
  track: 'pending' | 'approved' | 'volunteer'
  volunteerStatus?: string | null
  contributions?: string[]
  campSignup?: {
    role_id: string | null
    schedule_event_id: string | null
    role_approval_status: string | null
  } | null
  signupIntent?: string[] | null
}

export function TaskStatus({ track, volunteerStatus, contributions, campSignup, signupIntent }: Props) {
  const tasks: Task[] = []

  if (track === 'pending') {
    tasks.push({ id: 'submitted', label: 'Application submitted', done: true })
    tasks.push({
      id: 'review',
      label: 'Awaiting review',
      done: false,
      pending: true,
      note: "You'll receive an email once your application has been reviewed.",
    })
  }

  if (track === 'approved') {
    const hasRole = !!campSignup?.role_id
    const hasShift = !!campSignup?.schedule_event_id
    const rolePending = campSignup?.role_approval_status === 'pending'
    const hasContributions = (contributions?.length ?? 0) > 0

    tasks.push({ id: 'approved', label: 'Application approved', done: true })
    tasks.push({
      id: 'contributions',
      label: 'Choose your contributions',
      done: hasContributions,
      href: undefined, // edited via profile settings gear
      note: hasContributions ? undefined : 'Let us know if you can help with setup, teardown, or decor. Open the settings gear to update.',
    })
    tasks.push({
      id: 'role',
      label: rolePending ? 'Role request pending approval' : 'Choose a camp role',
      done: hasRole && !rolePending,
      pending: rolePending,
      href: rolePending ? undefined : '#role-signup',
      cta: 'Select a role →',
      note: rolePending ? "You'll be notified once your role request is reviewed." : undefined,
    })
    tasks.push({
      id: 'shift',
      label: 'Sign up for a shift',
      done: hasShift,
      href: '#role-signup',
      cta: 'Pick a shift →',
    })
  }

  if (track === 'volunteer') {
    const hasRole = !!campSignup?.role_id
    const hasShift = !!campSignup?.schedule_event_id
    const isPending = volunteerStatus === 'pending'

    tasks.push({ id: 'signed-up', label: 'Volunteer signup complete', done: true })

    if (isPending) {
      tasks.push({
        id: 'approval',
        label: 'Awaiting admin approval',
        done: false,
        pending: true,
        note: "You'll receive a notification once your signup has been reviewed.",
      })
    } else {
      const intents = signupIntent ?? []
      const wantsRole = intents.includes('role')
      const wantsShift = intents.includes('shift')
      const wantsOther = intents.includes('other')
      const hasAnyIntent = intents.length > 0

      if (wantsRole || (!hasAnyIntent)) {
        tasks.push({
          id: 'role',
          label: 'Choose a volunteer role',
          done: hasRole,
          href: '#role-signup',
          cta: 'Select a role →',
        })
      }
      if (wantsShift || (!hasAnyIntent)) {
        tasks.push({
          id: 'shift',
          label: 'Sign up for a shift',
          done: hasShift,
          href: '#role-signup',
          cta: 'Pick a shift →',
        })
      }
      if (wantsOther && !wantsRole && !wantsShift) {
        tasks.push({
          id: 'outreach',
          label: "We'll reach out with ways to contribute",
          done: false,
          pending: true,
          note: "Keep an eye on your email — we'll be in touch as the event gets closer.",
        })
      }
    }
  }

  const allDone = tasks.every(t => t.done || t.pending === false)
  const actionablePending = tasks.filter(t => !t.done && !t.pending)
  const isAllCaughtUp = tasks.every(t => t.done) && track !== 'pending'

  return (
    <div style={{
      marginBottom: '2rem',
      padding: '1.25rem 1.5rem',
      borderRadius: '1rem',
      border: isAllCaughtUp
        ? '1px solid rgba(100,200,120,0.25)'
        : '1px solid rgba(200,168,72,0.2)',
      background: isAllCaughtUp
        ? 'rgba(100,200,120,0.04)'
        : 'rgba(200,168,72,0.04)',
    }}>
      <p style={{
        fontSize: '0.65rem',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: isAllCaughtUp ? '#7dcf8e' : '#C8A848',
        opacity: 0.7,
        marginBottom: '1rem',
      }}>
        {isAllCaughtUp ? 'All caught up' : "What's next"}
      </p>

      {isAllCaughtUp ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: '#7dcf8e', fontSize: '1rem' }}>✓</span>
          <span style={{ fontSize: '0.9rem', color: '#7dcf8e' }}>
            You're all set. Nothing left to do for now.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tasks.map(task => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              {/* Status dot */}
              <div style={{
                width: '1.1rem',
                height: '1.1rem',
                borderRadius: '50%',
                flexShrink: 0,
                marginTop: '0.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: task.done
                  ? 'none'
                  : task.pending
                  ? '1.5px solid rgba(210,57,248,0.5)'
                  : '1.5px solid rgba(200,168,72,0.5)',
                background: task.done ? 'rgba(100,200,120,0.15)' : 'transparent',
              }}>
                {task.done && <span style={{ fontSize: '0.6rem', color: '#7dcf8e' }}>✓</span>}
                {task.pending && <span style={{ fontSize: '0.55rem', color: '#D239F8' }}>○</span>}
              </div>

              {/* Label + note + CTA */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.875rem',
                    color: task.done ? '#F3EDE6' : task.pending ? '#D239F8' : '#C8A848',
                    opacity: task.done ? 0.45 : 1,
                    textDecoration: task.done ? 'line-through' : 'none',
                  }}>
                    {task.label}
                  </span>
                  {!task.done && !task.pending && task.href && task.cta && (
                    <a
                      href={task.href}
                      style={{
                        fontSize: '0.78rem',
                        color: '#C8A848',
                        opacity: 0.75,
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.cta}
                    </a>
                  )}
                </div>
                {task.note && (
                  <p style={{ fontSize: '0.78rem', opacity: 0.45, marginTop: '0.2rem', lineHeight: 1.5 }}>
                    {task.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
