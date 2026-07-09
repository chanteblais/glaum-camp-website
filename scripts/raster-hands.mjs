// Strikes the mobile rasters of the ornamental hands.
//
// public/hands-{left,right}.svg are ~750 paths each; phones re-rasterize the
// full-viewport fixed SVGs at 3× device-pixel-ratio on every page, which is a
// measurable scroll cost. <HandsBackdrop> serves these WebP strikes below
// 768px instead (desktop keeps the crisp SVGs). Re-run after any edit to the
// source SVGs:
//
//   node scripts/raster-hands.mjs
import sharp from 'sharp'

const HEIGHT = 2000 // ~2.4× DPR at a typical phone viewport height

for (const side of ['left', 'right']) {
  const src = `public/hands-${side}.svg`
  const out = `public/hands-${side}.mobile.webp`
  await sharp(src, { density: 300 })
    .resize({ height: HEIGHT })
    .webp({ quality: 70 })
    .toFile(out)
  const { size } = await import('node:fs/promises').then(fs => fs.stat(out))
  console.log(`${out}: ${(size / 1024).toFixed(0)} KB`)
}
