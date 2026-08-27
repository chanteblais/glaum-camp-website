#!/usr/bin/env node
// One-off: retro-normalize the existing `avatars` bucket to match what
// /api/profile/avatar now produces at upload time (2026-08-27) —
//   · non-GIFs: EXIF-rotate → ≤1024px → WebP q82, stored as <userId>/avatar.webp
//   · GIFs: bytes untouched (animation), re-uploaded only to re-stamp metadata
//   · every object: cacheControl 1 year (old objects carry the 3600s default)
//   · stale siblings (old avatar.jpg next to the new avatar.webp) removed
//   · applications / volunteers / members rows repointed at the new URL with a
//     fresh ?v= buster, matched by the /avatars/<userId>/ path prefix
//
// DRY RUN by default — prints the per-user plan (file, size before → after,
// DB rows that would be repointed) and writes nothing. Pass --execute to apply.
//
// Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
//   node scripts/reencode-avatars.mjs            # dry run
//   node scripts/reencode-avatars.mjs --execute  # apply

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const EXECUTE = process.argv.includes('--execute')
const BUCKET = 'avatars'
const CACHE = '31536000'
const AVATAR_TABLES = ['applications', 'volunteers', 'members']
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i

const supabase = createClient(url, key)
const kb = (n) => `${Math.round(n / 1024)}KB`

async function repointRows(prefix, newUrl) {
  // prefix = the /avatars/<userId>/ path segment shared by every historical
  // URL for this user, regardless of extension or ?v= buster.
  const results = []
  for (const table of AVATAR_TABLES) {
    const match = `%/${BUCKET}/${prefix}/%`
    if (EXECUTE) {
      const { data, error } = await supabase
        .from(table).update({ avatar_url: newUrl }).like('avatar_url', match).select('id')
      if (error) throw new Error(`${table} update: ${error.message}`)
      results.push(`${table}:${data.length}`)
    } else {
      const { count, error } = await supabase
        .from(table).select('id', { count: 'exact', head: true }).like('avatar_url', match)
      if (error) throw new Error(`${table} count: ${error.message}`)
      results.push(`${table}:${count}`)
    }
  }
  return results.join(' ')
}

async function main() {
  const { data: folders, error: listError } = await supabase.storage
    .from(BUCKET).list('', { limit: 1000 })
  if (listError) throw new Error(`bucket list: ${listError.message}`)

  let processed = 0, savedBytes = 0
  for (const folder of folders) {
    if (folder.id) { // a loose top-level file, not a <userId>/ folder
      console.log(`SKIP  ${folder.name} — loose file at bucket root, not a user folder`)
      continue
    }
    const { data: files, error } = await supabase.storage
      .from(BUCKET).list(folder.name, { limit: 100 })
    if (error) throw new Error(`list ${folder.name}: ${error.message}`)

    // A folder can hold several historical files (avatar.jpg AND avatar.png
    // from before extensions were cleaned up on re-upload). The newest one is
    // the member's current avatar — convert that; the rest are stale.
    const images = files
      .filter((f) => IMAGE_EXT.test(f.name))
      .sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0) - new Date(a.updated_at ?? a.created_at ?? 0))
    for (const staleFile of images.slice(1)) {
      const stalePath = `${folder.name}/${staleFile.name}`
      if (EXECUTE) {
        const { error: rmError } = await supabase.storage.from(BUCKET).remove([stalePath])
        if (rmError) console.warn(`  warn: could not remove ${stalePath}: ${rmError.message}`)
      }
      console.log(`${EXECUTE ? 'RM   ' : 'PLAN '} ${stalePath} — stale duplicate (older than ${images[0].name})`)
    }
    for (const file of images.slice(0, 1)) {
      const oldPath = `${folder.name}/${file.name}`
      const isGif = /\.gif$/i.test(file.name)
      const alreadyCached = file.metadata?.cacheControl === `max-age=${CACHE}`

      const { data: blob, error: dlError } = await supabase.storage.from(BUCKET).download(oldPath)
      if (dlError) throw new Error(`download ${oldPath}: ${dlError.message}`)
      const oldBytes = Buffer.from(await blob.arrayBuffer())

      let newPath = oldPath
      let newBytes = oldBytes
      let contentType = file.metadata?.mimetype ?? 'application/octet-stream'
      if (!isGif) {
        newPath = `${folder.name}/avatar.webp`
        newBytes = Buffer.from(
          await sharp(oldBytes)
            .rotate()
            .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer()
        )
        contentType = 'image/webp'
      }

      const alreadyDone = alreadyCached && newPath === oldPath && isGif
      if (alreadyDone) {
        console.log(`OK    ${oldPath} — already normalized, nothing to do`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(newPath)
      const newUrl = `${publicUrl}?v=${Date.now()}`

      if (EXECUTE) {
        const { error: upError } = await supabase.storage
          .from(BUCKET).upload(newPath, newBytes, { contentType, upsert: true, cacheControl: CACHE })
        if (upError) throw new Error(`upload ${newPath}: ${upError.message}`)
        if (newPath !== oldPath) {
          const { error: rmError } = await supabase.storage.from(BUCKET).remove([oldPath])
          if (rmError) console.warn(`  warn: could not remove ${oldPath}: ${rmError.message}`)
        }
      }
      const rows = await repointRows(folder.name, newUrl)
      processed++
      savedBytes += oldBytes.length - newBytes.length
      console.log(
        `${EXECUTE ? 'DONE ' : 'PLAN '} ${oldPath} → ${newPath}  ` +
        `${kb(oldBytes.length)} → ${kb(newBytes.length)}  cache ${file.metadata?.cacheControl ?? '?'} → max-age=${CACHE}  rows[${rows}]`
      )
    }
  }
  console.log(
    `\n${EXECUTE ? 'Re-encoded' : 'Would re-encode'} ${processed} avatar(s), ` +
    `${EXECUTE ? 'saving' : 'would save'} ${kb(Math.max(0, savedBytes))} of storage.` +
    (EXECUTE ? '' : '\nDry run — nothing was written. Re-run with --execute to apply.')
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
