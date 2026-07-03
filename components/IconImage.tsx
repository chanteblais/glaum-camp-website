// The one way to render icon art from the asset library (or an icon upload).
//
// All icon art lives on the standard normalized frame (lib/icon-image.ts):
// artwork scaled so its bounding-box diagonal is uniform, centered on a
// transparent 1536x1024 canvas. Rendering that frame with `objectFit: contain`
// shows the art at roughly half the intended size (the wide margins win), and
// per-surface hand-tuned percentages drift apart — so every icon <img> goes
// through this component instead: a square clipping box in which the frame is
// sized by HEIGHT so the artwork fills `fill` of the box and the frame's
// margins clip away. Because the art is diagonal-normalized, one `fill` value
// reads as the same optical size for every icon, and nothing pokes out of a
// round mask.
//
// `fill` is the fraction of the box a square-ish icon's height occupies.
// Defaults to 0.82; circle containers read best around 0.78-0.88 depending on
// how tight the ring is. The Cabinet of Distinctions keeps its own 132% medal
// sizing (coins fill their frame differently) — everything else renders here.

// Height of a square-ish artwork on the standard frame (art diagonal 1060 on a
// 1024-high canvas → ~750px). The img height that makes that art fill the box:
// fill / (750/1024).
const ART_OF_FRAME = 750 / 1024

export function IconImage({ src, size, fill = 0.82, opacity, round = false, imgStyle }: {
  src: string
  /** Side of the square clipping box — px number or any CSS length ('1.4rem', '100%'). */
  size: string | number
  /** Fraction of the box a square-ish icon's height fills (default 0.82). */
  fill?: number
  opacity?: number
  /** Clip the box itself to a circle. */
  round?: boolean
  /** Extra styles merged onto the inner <img> (e.g. a filter). */
  imgStyle?: React.CSSProperties
}) {
  const s = typeof size === 'number' ? `${size}px` : size
  return (
    <span
      aria-hidden
      style={{
        width: s, height: s, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', borderRadius: round ? '50%' : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{
          height: `${(fill / ART_OF_FRAME) * 100}%`,
          width: 'auto', maxWidth: 'none', display: 'block',
          opacity,
          ...imgStyle,
        }}
      />
    </span>
  )
}
