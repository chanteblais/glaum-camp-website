#!/usr/bin/env node
// One-off (companion to reencode-avatars.mjs): re-stamp the existing
// `group-badges` objects with the 1-year cacheControl that uploads now set
// (2026-08-27). Bytes are untouched — icon art stays the normalized 1536×1024
// PNG frame (IconImage geometry depends on it; the transform CDN does the
// display-size shrinking) — but transform responses inherit the ORIGIN
// object's cacheControl, so the old max-age=3600 stamp throttled edge caching
// even after the IconImage fix. Repoints `groups.icon_image` with a fresh
// ?v= buster. Departments/distinctions have no uploaded art yet (verified
// empty prefixes); rerun-safe if that changes only for the groups table.
//
// DRY RUN by default; pass --execute to apply.
//
//   node scripts/restamp-group-badges.mjs            # dry run
//   node scripts/restamp-group-badges.mjs --execute  # apply

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const EXECUTE = process.argv.includes('--execute')
const BUCKET = 'group-badges'
const CACHE = '31536000'
const supabase = createClient(url, key)

const { data: groups, error } = await supabase
  .from('groups').select('id, name, icon_image').not('icon_image', 'is', null)
if (error) throw new Error(error.message)

for (const g of groups) {
  const match = g.icon_image.match(new RegExp(`/${BUCKET}/([^?]+)`))
  if (!match) {
    console.log(`SKIP  ${g.name} — icon_image is not a ${BUCKET} URL: ${g.icon_image.slice(0, 80)}`)
    continue
  }
  const path = match[1]
  const { data: blob, error: dlError } = await supabase.storage.from(BUCKET).download(path)
  if (dlError) {
    console.log(`SKIP  ${g.name} — object missing (${path}): ${dlError.message}`)
    continue
  }
  const bytes = Buffer.from(await blob.arrayBuffer())
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const newUrl = `${publicUrl}?v=${Date.now()}`
  if (EXECUTE) {
    const { error: upError } = await supabase.storage
      .from(BUCKET).upload(path, bytes, { contentType: 'image/png', upsert: true, cacheControl: CACHE })
    if (upError) throw new Error(`upload ${path}: ${upError.message}`)
    const { error: dbError } = await supabase.from('groups').update({ icon_image: newUrl }).eq('id', g.id)
    if (dbError) throw new Error(`groups update ${g.id}: ${dbError.message}`)
  }
  console.log(`${EXECUTE ? 'DONE ' : 'PLAN '} ${g.name}: ${path} (${Math.round(bytes.length / 1024)}KB) → cacheControl max-age=${CACHE}, repoint groups.icon_image`)
}
console.log(EXECUTE ? '\nDone.' : '\nDry run — nothing was written. Re-run with --execute to apply.')
