import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('avatar') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File must be a JPEG, PNG, WebP, or GIF' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const path = `${userId}/avatar.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload (upsert so re-uploads overwrite cleanly)
  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[avatar upload]', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('avatars')
    .getPublicUrl(path)

  // Bust CDN cache by appending a timestamp query param
  const avatarUrl = `${publicUrl}?v=${Date.now()}`

  // Update whichever record(s) belong to this user
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  await supabaseAdmin
    .from('applications')
    .update({ avatar_url: avatarUrl })
    .or(`clerk_user_id.eq.${userId}${email ? `,email.eq.${email}` : ''}`)

  await supabaseAdmin
    .from('volunteers')
    .update({ avatar_url: avatarUrl })
    .eq('clerk_user_id', userId)

  return NextResponse.json({ avatarUrl })
}
