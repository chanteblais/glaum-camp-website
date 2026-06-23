import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { GroupThreadClient } from './GroupThreadClient'

export default async function GroupThreadPage({ params }: { params: { groupId: string } }) {
  const { userId: myId } = await auth()
  if (!myId) redirect('/sign-in')

  // Approved members only.
  const { data: myApp } = await supabaseAdmin
    .from('applications')
    .select('status')
    .eq('clerk_user_id', myId)
    .maybeSingle()
  if (myApp?.status !== 'approved') redirect('/profile')

  // The group must exist…
  const { data: group } = await supabaseAdmin
    .from('groups')
    .select('id, name, icon')
    .eq('id', params.groupId)
    .maybeSingle()
  if (!group) notFound()

  // …and group threads are members-only.
  const { data: roster } = await supabaseAdmin
    .from('group_members')
    .select('clerk_user_id')
    .eq('group_id', params.groupId)
  const memberIds = (roster ?? []).map(r => r.clerk_user_id).filter(Boolean)
  if (!memberIds.includes(myId)) redirect('/messages')

  // Members (for @mention autocomplete), excluding me.
  const otherIds = memberIds.filter(id => id !== myId)
  const { data: memberApps } = otherIds.length
    ? await supabaseAdmin
        .from('applications')
        .select('clerk_user_id, first_name, preferred_name, avatar_url')
        .in('clerk_user_id', otherIds)
        .eq('status', 'approved')
    : { data: [] }
  const members = (memberApps ?? []).map(a => ({
    userId: a.clerk_user_id as string,
    displayName: a.preferred_name || a.first_name || 'Member',
    avatarUrl: a.avatar_url ?? null,
  }))

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <Header />
      <img src="/hands-left.svg"  alt="" aria-hidden role="presentation" style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.6, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden role="presentation" style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.6, zIndex: 0 }} />
      <GroupThreadClient
        currentUserId={myId}
        groupId={group.id}
        groupName={group.name}
        groupIcon={group.icon}
        members={members}
      />
    </div>
  )
}
