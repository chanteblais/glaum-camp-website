// Strikes the rasters of the ornamental hands.
//
// public/hands-{left,right}.svg are ~750 paths each; compositing the
// full-viewport fixed SVGs is a measurable cost (phones re-rasterize at 3×
// DPR on every page), and the SVGs gzip to ~138KB combined that HTTP-cache
// poorly. <HandsBackdrop> serves these WebP strikes at ALL breakpoints; the
// SVGs stay in public/ as the editable masters only.
//
// The output filename carries a VERSION because next.config.js serves
// /hands-*.v*.webp with a 1-year immutable cache — after any edit to the
// source SVGs, bump VERSION here AND in components/HandsBackdrop.tsx, then:
//
//   node scripts/raster-hands.mjs
import sharp from 'sharp'

const VERSION = 'v2'
const HEIGHT = 2000 // ~2.4× DPR at a typical phone viewport height

for (const side of ['left', 'right']) {
  const src = `public/hands-${side}.svg`
  const out = `public/hands-${side}.${VERSION}.webp`
  await sharp(src, { density: 300 })
    .resize({ height: HEIGHT })
    .webp({ quality: 60 })
    .toFile(out)
  const { size } = await import('node:fs/promises').then(fs => fs.stat(out))
  console.log(`${out}: ${(size / 1024).toFixed(0)} KB`)
}
