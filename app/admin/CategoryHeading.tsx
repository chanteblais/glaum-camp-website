import { catLabel } from './admin-sections'

// Anchored heading that opens each group of sections on the Community, Program,
// and Configure pages. The `id` doubles as the scroll anchor used by AdminNav's
// jump-links. `large` is the Program page's variant — there each heading names
// a whole workspace panel, so it carries more weight.
export function CategoryHeading({ id, large }: { id: string; large?: boolean }) {
  return (
    <h2
      id={id}
      style={{
        scrollMarginTop: '6rem',
        fontFamily: 'TokyoDreams, serif',
        fontSize: large ? '1.5rem' : '1.4rem',
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
