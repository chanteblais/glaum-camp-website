import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeIconImage } from '@/lib/icon-image'

const ALLOWED_TYPES = ['image/png', 'image/webp', 'image/svg+xml', 'image/jpeg', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
// Storage bucket + object filename keep their original `group-badges` / `badge.png`
// names so existing stored objects and their URLs (in groups.icon_image) keep
// resolving — the bucket name is internal and never shown in the UI.
const BUCKET = 'group-badges'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') return null
  return userId
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('icon') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File must be a PNG, WebP, SVG, JPEG, or GIF' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  const original = Buffer.from(await file.arrayBuffer())

  // Normalize every upload onto the standard frame so all icons render at the
  // same size (see lib/icon-image.ts). On failure, fall back to the raw file
  // rather than blocking the upload. Output is always PNG.
  let buffer: Buffer = original
  try {
    buffer = await normalizeIconImage(original)
  } catch (err) {
    console.error('[group icon normalize]', err)
  }

  const path = `${params.id}/badge.png`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    console.error('[group icon upload]', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  // Bust CDN cache so a re-upload shows immediately.
  const iconUrl = `${publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabaseAdmin
    .from('groups')
    .update({ icon_image: iconUrl })
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ icon_image: iconUrl })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Clear the column; leave the storage object (cheap, and re-upload overwrites it).
  const { error } = await supabaseAdmin
    .from('groups')
    .update({ icon_image: null })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
