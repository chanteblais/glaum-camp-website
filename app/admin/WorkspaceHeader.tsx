// Band header that opens each Program workspace (Scheduled Events, Lead-Up
// Gatherings): the small-caps gold line kept thin and letterspaced, set on a
// faint gilded band so it reads as a header without going bold.
export function WorkspaceHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div
      style={{
        padding: '0.65rem 1.1rem',
        marginBottom: '1rem',
        borderRadius: '0.5rem',
        border: '1px solid rgba(200,168,72,0.22)',
        background: 'linear-gradient(90deg, rgba(200,168,72,0.10), rgba(200,168,72,0.02))',
      }}
    >
      <p style={{ margin: 0, fontSize: '0.8rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A848' }}>
        <span style={{ opacity: 0.6, marginRight: '0.6rem' }}>✦</span>
        {title}
        {typeof count === 'number' && <span style={{ opacity: 0.55 }}> — {count}</span>}
      </p>
    </div>
  )
}
