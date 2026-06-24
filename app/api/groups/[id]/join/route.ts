import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOrCreateGroupConversation } from '@/lib/conversations'

export const dynamic = 'force-dynamic'

// POST /api/groups/[id]/join — self-join an open group.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: app } = await supabaseAdmin
    .from('applications')
    .select('status')
    .eq('clerk_user_id', userId)
    .maybeSingle()
  if (app?.status !== 'approved') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: group } = await supabaseAdmin
    .from('groups')
    .select('id, join_policy')
    .eq('id', params.id)
    .maybeSingle()
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (group.join_policy !== 'open') {
    return NextResponse.json({ error: "This group isn't open to self-join." }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('group_members').upsert(
    { group_id: params.id, clerk_user_id: userId, source: 'self' },
    { onConflict: 'group_id,clerk_user_id', ignoreDuplicates: true },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Make sure the thread exists so it shows up in the inbox.
  await getOrCreateGroupConversation(params.id).catch(() => {})

  return NextResponse.json({ success: true })
}
