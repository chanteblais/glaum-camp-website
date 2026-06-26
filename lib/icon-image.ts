import sharp from 'sharp'

// Group icons are uploaded as arbitrary art (often a glowing emblem on a
// transparent or white field, framed with inconsistent padding). To make every
// icon render at the same size and dead-centered — in the profile Commitments
// circles and the Cabinet of Distinctions medals — we normalize each upload:
// detect the real artwork, trim the surrounding whitespace, scale it to one
// uniform target box, and center it on a standard transparent frame.
export const ICON_FRAME_W = 1536
export const ICON_FRAME_H = 1024

// The artwork is scaled so its bounding-box *diagonal* equals TARGET_DIAGONAL,
// then centered. Sizing by diagonal (rather than longest side or area) is what the
// circular clip wants: it equalizes how far every icon's corners reach toward the
// round edge regardless of aspect ratio, so a wide-short emblem and a tall one read
// as the same size and keep the same margin. Deliberately smaller than the frame so
// there's always a gap. Tune alongside the render scale in CommitmentsSection.
const TARGET_DIAGONAL = 1060
// Safety cap so an extreme aspect ratio (very wide or very tall art) can't scale a
// single side past the frame; for normal aspects the diagonal governs.
const MAX_SIDE = 980

// A pixel counts as artwork if it's not near-transparent and not near-white, so a
// soft glow tail or a white backing field doesn't inflate the detected box.
const ALPHA_FLOOR = 16
const WHITE_CEIL = 245

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

/**
 * Normalize a group-icon image onto the standard frame. Returns a PNG buffer
 * (always — for transparent corners). The pipeline:
 *   1. Detect the artwork's tight bounding box (ignoring transparent/white border).
 *   2. Crop to it (whitespace trim).
 *   3. Scale the artwork to the uniform target box, preserving aspect ratio.
 *   4. Composite it centered on the standard transparent canvas.
 *
 * `density: 300` only affects vector (SVG) inputs, giving a crisp raster.
 */
export async function normalizeIconImage(input: Buffer): Promise<Buffer> {
  // Rasterize once (handles SVG via density) and guarantee an alpha channel so
  // the pixel scan and transparent compositing behave consistently.
  const base = await sharp(input, { density: 300 }).ensureAlpha().png().toBuffer()

  // 1) Detect the artwork box. 2) Crop to it (fall back to the full raster if the
  // image is blank/uniform so we never produce an empty icon).
  const box = await contentBox(base)
  const cropped = box
    ? await sharp(base).extract({ left: box.left, top: box.top, width: box.width, height: box.height }).png().toBuffer()
    : base

  // 3) Scale the artwork so its bounding-box diagonal equals TARGET_DIAGONAL (with a
  // per-side safety cap), preserving aspect ratio — uniform reach toward the edge.
  const cm = await sharp(cropped).metadata()
  const cw = cm.width ?? 1, ch = cm.height ?? 1
  const factor = Math.min(TARGET_DIAGONAL / Math.hypot(cw, ch), MAX_SIDE / Math.max(cw, ch))
  const scaled = await sharp(cropped)
    .resize({ width: Math.max(1, Math.round(cw * factor)) })
    .png()
    .toBuffer()

  // 4) Center the artwork box on the standard frame. We center by bounding box
  // (the art is already cropped tight, so the raster's own dimensions are the box):
  // the circular clip cares about the art's full extent, so a symmetric box keeps
  // every edge an equal distance from the round mask.
  const { width = 1, height = 1 } = await sharp(scaled).metadata()
  const left = Math.round((ICON_FRAME_W - width) / 2)
  const top = Math.round((ICON_FRAME_H - height) / 2)

  return sharp({
    create: { width: ICON_FRAME_W, height: ICON_FRAME_H, channels: 4, background: TRANSPARENT },
  })
    .composite([{ input: scaled, left, top }])
    .png()
    .toBuffer()
}

/**
 * Tight bounding box of the visible artwork in a PNG (the box of pixels that are
 * neither near-transparent nor near-white). Returns `null` for a blank/uniform
 * image so callers can fall back to the raw raster.
 */
export async function contentBox(
  png: Buffer,
): Promise<{ left: number; top: number; width: number; height: number } | null> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let minX = width, maxX = -1, minY = height, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (data[i + 3] < ALPHA_FLOOR) continue
      if (data[i] > WHITE_CEIL && data[i + 1] > WHITE_CEIL && data[i + 2] > WHITE_CEIL) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}
