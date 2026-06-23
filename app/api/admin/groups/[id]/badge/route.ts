import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_TYPES = ['image/png', 'image/webp', 'image/svg+xml', 'image/jpeg', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
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
  const file = formData.get('badge') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File must be a PNG, WebP, SVG, JPEG, or GIF' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  const ext = file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1].replace('jpeg', 'jpg')
  const path = `${params.id}/badge.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[group badge upload]', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  // Bust CDN cache so a re-upload shows immediately.
  const badgeUrl = `${publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabaseAdmin
    .from('groups')
    .update({ badge_image: badgeUrl })
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ badge_image: badgeUrl })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Clear the column; leave the storage object (cheap, and re-upload overwrites it).
  const { error } = await supabaseAdmin
    .from('groups')
    .update({ badge_image: null })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
