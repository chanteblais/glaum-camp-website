import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeIconImage } from '@/lib/icon-image'

const ALLOWED_TYPES = ['image/png', 'image/webp', 'image/svg+xml', 'image/jpeg', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
// Reuse the public `group-badges` bucket (same patch-style art as group /
// department icons). Objects live under a `resources/` prefix. The `[id]`
// segment is just a stable storage key: for an existing item it's the row id;
// for a not-yet-saved one the client passes a generated key. The resulting URL
// is written into `resources.icon` when the modal saves (no DB write here).
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

  // Normalize onto the standard frame so every icon renders at a uniform size
  // (see lib/icon-image.ts). Fall back to the raw file on failure. Output is PNG.
  let buffer: Buffer = original
  try {
    buffer = await normalizeIconImage(original)
  } catch (err) {
    console.error('[resource icon normalize]', err)
  }

  const path = `resources/${params.id}/icon.png`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    console.error('[resource icon upload]', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  // Bust CDN cache so a re-upload shows immediately.
  const image = `${publicUrl}?v=${Date.now()}`

  return NextResponse.json({ image })
}
