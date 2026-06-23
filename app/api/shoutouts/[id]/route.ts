import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: shoutout } = await supabaseAdmin
    .from('shoutouts')
    .select('id, clerk_user_id')
    .eq('id', params.id)
    .maybeSingle()

  if (!shoutout) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Allowed if author, or admin.
  const isOwner = shoutout.clerk_user_id === userId
  let isAdmin = false
  if (!isOwner) {
    const user = await currentUser()
    isAdmin = user?.publicMetadata?.role === 'admin'
  }
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin.from('shoutouts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
