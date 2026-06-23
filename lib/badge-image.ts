import sharp from 'sharp'

// Group badges are rendered in a fixed square box with `object-fit: contain`
// (see app/profile/ContributionBadges.tsx). If uploaded images have different
// frame sizes or medallion-to-frame ratios, they render at visibly different
// sizes. To keep every badge consistent we normalize each upload onto a single
// reference frame with the medallion scaled to a fixed target box.
//
// Reference values measured from the original matched set (Setup/Teardown):
// 1536x1024 frames with the medallion occupying a ~850x840 box, centered.
export const BADGE_FRAME_W = 1536
export const BADGE_FRAME_H = 1024
const MED_W = 850
const MED_H = 840

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

/**
 * Normalize a group-badge image so it matches the standard frame and medallion
 * size. Returns a PNG buffer (always — for transparent corners). The pipeline:
 *   1. Trim the uniform/transparent border to isolate the medallion.
 *   2. Scale the medallion to fit the target box, preserving aspect ratio.
 *   3. Composite it centered on the standard transparent canvas.
 *
 * `density: 300` only affects vector (SVG) inputs, giving a crisp raster.
 */
export async function normalizeBadgeImage(input: Buffer): Promise<Buffer> {
  // 1) Isolate the medallion by trimming the uniform/transparent border.
  // A fully-uniform image makes trim() throw — fall back to the raw raster.
  let medallion: Buffer
  try {
    medallion = await sharp(input, { density: 300 }).trim({ threshold: 10 }).png().toBuffer()
  } catch {
    medallion = await sharp(input, { density: 300 }).png().toBuffer()
  }

  // 2) Scale to fit the target medallion box, preserving aspect ratio.
  const scaled = await sharp(medallion)
    .resize(MED_W, MED_H, { fit: 'inside', background: TRANSPARENT })
    .png()
    .toBuffer()

  // 3) Composite centered on the standard frame.
  const { width = MED_W, height = MED_H } = await sharp(scaled).metadata()
  const left = Math.round((BADGE_FRAME_W - width) / 2)
  const top = Math.round((BADGE_FRAME_H - height) / 2)

  return sharp({
    create: { width: BADGE_FRAME_W, height: BADGE_FRAME_H, channels: 4, background: TRANSPARENT },
  })
    .composite([{ input: scaled, left, top }])
    .png()
    .toBuffer()
}
