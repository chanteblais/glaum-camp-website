import { catLabel } from './admin-sections'

// Anchored heading that opens each group of sections on the Manage and
// Configure pages. The `id` doubles as the scroll anchor used by AdminNav's
// jump-links.
export function CategoryHeading({ id }: { id: string }) {
  return (
    <h2
      id={id}
      style={{
        scrollMarginTop: '6rem',
        fontFamily: 'TokyoDreams, serif',
        fontSize: '1.15rem',
        color: '#C8A848',
        opacity: 0.85,
        margin: '3.5rem 0 1.5rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid rgba(200,168,72,0.18)',
      }}
    >
      {catLabel(id)}
    </h2>
  )
}
