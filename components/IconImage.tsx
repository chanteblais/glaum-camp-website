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
// reads as the same optical size for every icon.
//
// `fill` is the fraction of the box a square-ish icon's height occupies.
// Defaults to 0.82. CAUTION with round masks: diagonal normalization equalizes
// how far corners reach, but it does NOT keep them inside a circle at every
// fill — the art's half-diagonal is ~0.71·fill of the box, so a circular clip
// (this component's `round`, or a border-radius'd `overflow: hidden` parent)
// shaves icon corners whenever fill > ~0.7. Use ROUND_FILL inside circles.
// The Cabinet of Distinctions keeps its own 132% medal sizing (coins fill
// their frame differently) — everything else renders here.

// Height of a square-ish artwork on the standard frame (art diagonal 1060 on a
// 1024-high canvas → ~750px). The img height that makes that art fill the box:
// fill / (750/1024).
import { supabaseResizedUrl } from '@/lib/supabase-image'

const ART_OF_FRAME = 750 / 1024

// Uploaded icon art is stored at the full 1536×1024 frame (~700KB-1MB PNG) but
// never renders larger than ~220px of art height, so storage URLs go through
// the transform CDN at 720×480 — same 3:2 aspect as the frame, i.e. a pure
// downscale (resize=cover crops nothing when aspects match), retina-safe for
// every render site. Built-in /asset-library/ paths pass through unchanged.
export const ICON_FRAME_W = 720
export const ICON_FRAME_H = 480
export function iconDisplaySrc(src: string): string {
  return supabaseResizedUrl(src, ICON_FRAME_W, ICON_FRAME_H) ?? src
}

// The largest `fill` at which no icon clips inside a circular mask. Geometry
// bounds it at 750/1060 ≈ 0.71 (art half-diagonal ≤ circle radius); measured
// against the current asset library the worst icons need ≤ 0.683, so 0.68
// keeps a hair of margin. Larger fills read fine in square boxes but shave
// corners off tents, suns, songbirds, etc. in a circle.
export const ROUND_FILL = 0.68

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
        src={iconDisplaySrc(src)}
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
