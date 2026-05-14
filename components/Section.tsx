import { ReactNode } from 'react'

interface SectionProps {
  id?: string
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Section({ id, children, style }: SectionProps) {
  return (
    <section
      id={id}
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '5rem 1.5rem',
        position: 'relative',
        zIndex: 1,
        ...style,
      }}
    >
      {children}
    </section>
  )
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: '0.7rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: '#D239F8',
        marginBottom: '0.75rem',
        fontFamily: 'var(--font-libre-baskerville)',
        opacity: 0.9,
      }}
    >
      {children}
    </p>
  )
}

export function GoldDivider() {
  return (
    <div
      style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, #C8A848, transparent)',
        opacity: 0.3,
        margin: '3rem 0',
      }}
    />
  )
}
