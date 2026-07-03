// Renders a radio post line, lighting `**…**` spans gold — the entity the
// moment is about ("Sarah is bringing a **camping stove**."). Pure and
// import-safe from both server components (home teaser) and client ones
// (the /radio feed). Not markdown — just the one highlight convention.

export function RadioMessage({ text, gold = '#C8A848' }: { text: string; gold?: string }) {
  const parts = text.split('**')
  // Odd indexes sit inside a **…** pair. A balanced string splits into an odd
  // number of parts; when the count is even, the final ** was never closed —
  // that trailing part renders plain (with its ** restored).
  const balanced = parts.length % 2 === 1
  return (
    <>
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1
        if (i % 2 === 1 && (balanced || !isLast)) {
          return <span key={i} style={{ color: gold }}>{part}</span>
        }
        return <span key={i}>{i % 2 === 1 && isLast ? `**${part}` : part}</span>
      })}
    </>
  )
}
