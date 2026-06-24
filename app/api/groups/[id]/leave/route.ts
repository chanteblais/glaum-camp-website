import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { findGroupConversation } from '@/lib/conversations'

export const dynamic = 'force-dynamic'

// POST /api/groups/[id]/leave — leave an open group. Admin-assigned groups are
// admin-managed: a member can't unilaterally leave (would drop a camp responsibility).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: group } = await supabaseAdmin
    .from('groups')
    .select('id, join_policy')
    .eq('id', params.id)
    .maybeSingle()
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (group.join_policy !== 'open') {
    return NextResponse.json({ error: 'Ask an admin to remove you from this group.' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('group_members')
    .delete()
    .eq('group_id', params.id)
    .eq('clerk_user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Clean up my participant row so read/mute state doesn't linger.
  const convId = await findGroupConversation(params.id)
  if (convId) {
    await supabaseAdmin
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', convId)
      .eq('clerk_user_id', userId)
  }

  return NextResponse.json({ success: true })
}
