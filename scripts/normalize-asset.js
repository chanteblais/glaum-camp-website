// Normalize a source image into a built-in asset-library WebP.
//
// Built-in library assets (lib/asset-library.ts → BUILTIN_ASSETS) are rendered
// DIRECTLY in the UI — they do NOT pass through the upload API route — so they must
// be pre-normalized the same way uploads are (lib/icon-image.ts): trim transparent
// margins → scale the artwork so its bounding-box diagonal hits a target → center it
// on a 1536×1024 transparent landscape frame. This script replicates that pipeline
// (there's no tsx/ts-node to import the TS directly), then downscales + encodes WebP.
//
// Art convention: emblem on a FULLY TRANSPARENT background, no baked rim/disc — the
// UI frame supplies the ring. (See docs / the Elder Tree asset.)
//
// Usage:
//   node scripts/normalize-asset.js <source-image> <category> <id> [label]
//     <source-image>  path to a PNG/etc (absolute or relative to cwd)
//     <category>      distinction | icon   (controls the output subfolder + tab)
//     <id>            kebab-case id → output file <id>.webp and the manifest id
//     [label]         optional; only printed as a reminder for the manifest entry
//
// Output: public/asset-library/{distinctions|icons}/<id>.webp
// After running, add the entry to lib/asset-library.ts BUILTIN_ASSETS and run tsc.

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

// Mirrors lib/icon-image.ts constants — keep in sync if that file changes.
const FRAME_W = 1536
const FRAME_H = 1024
const TARGET_DIAGONAL = 1060
const MAX_SIDE = 980
const ALPHA_FLOOR = 16
const WHITE_CEIL = 245
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }
// Downscale target — 2x retina at the largest in-app render (~150px). 800px
// originals weighed 100-180KB each and shipped ~10x more pixels than any
// render site uses; the full-res masters live on the design-exploration branch.
const OUTPUT_WIDTH = 320

async function contentBox(png) {
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

async function normalize(input) {
  const base = await sharp(input, { density: 300 }).ensureAlpha().png().toBuffer()
  const box = await contentBox(base)
  const cropped = box
    ? await sharp(base).extract(box).png().toBuffer()
    : base
  const cm = await sharp(cropped).metadata()
  const cw = cm.width ?? 1, ch = cm.height ?? 1
  const factor = Math.min(TARGET_DIAGONAL / Math.hypot(cw, ch), MAX_SIDE / Math.max(cw, ch))
  const scaled = await sharp(cropped).resize({ width: Math.max(1, Math.round(cw * factor)) }).png().toBuffer()
  const sm = await sharp(scaled).metadata()
  const w = sm.width ?? 1, h = sm.height ?? 1
  return sharp({ create: { width: FRAME_W, height: FRAME_H, channels: 4, background: TRANSPARENT } })
    .composite([{ input: scaled, left: Math.round((FRAME_W - w) / 2), top: Math.round((FRAME_H - h) / 2) }])
    .png()
    .toBuffer()
}

async function main() {
  const [, , src, category, id, label] = process.argv
  if (!src || !category || !id) {
    console.error('Usage: node scripts/normalize-asset.js <source-image> <category> <id> [label]')
    console.error('  <category> = distinction | icon')
    process.exit(1)
  }
  if (category !== 'distinction' && category !== 'icon') {
    console.error(`Invalid category "${category}" — must be "distinction" or "icon".`)
    process.exit(1)
  }
  if (!fs.existsSync(src)) {
    console.error(`Source image not found: ${src}`)
    process.exit(1)
  }

  const folder = category === 'distinction' ? 'distinctions' : 'icons'
  const outDir = path.join(__dirname, '..', 'public', 'asset-library', folder)
  fs.mkdirSync(outDir, { recursive: true })
  const out = path.join(outDir, `${id}.webp`)

  const normalized = await normalize(fs.readFileSync(src))
  await sharp(normalized).resize({ width: OUTPUT_WIDTH }).webp({ quality: 86, effort: 6 }).toFile(out)

  const meta = await sharp(out).metadata()
  const kb = Math.round(fs.statSync(out).size / 1024)
  console.log(`\n✓ wrote ${out}  (${meta.width}×${meta.height}, ${kb}KB)\n`)
  console.log('Add to lib/asset-library.ts → BUILTIN_ASSETS:')
  console.log(`  {`)
  console.log(`    id: '${id}',`)
  console.log(`    label: '${label ?? '<Generic Label>'}',`)
  console.log(`    src: '/asset-library/${folder}/${id}.webp',`)
  console.log(`    kind: 'raster',`)
  console.log(`    category: '${category}',`)
  console.log(`    source: 'builtin',`)
  console.log(`    tags: [],`)
  console.log(`  },\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
