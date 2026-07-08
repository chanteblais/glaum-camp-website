import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { findGroupConversation, getParticipantPrefs } from '@/lib/conversations'
import { GroupThreadClient } from './GroupThreadClient'

export default async function GroupThreadPage({ params }: { params: { groupId: string } }) {
  const { userId: myId } = await auth()
  if (!myId) redirect('/sign-in')

  // The access check, group row, roster, and conversation lookup are
  // independent reads — run them together.
  const [{ data: myApp }, { data: group }, { data: roster }, convId] = await Promise.all([
    // Approved members only.
    supabaseAdmin
      .from('applications')
      .select('status')
      .eq('clerk_user_id', myId)
      .maybeSingle(),
    // The group must exist…
    supabaseAdmin
      .from('groups')
      .select('id, name, icon, icon_image, join_policy')
      .eq('id', params.groupId)
      .maybeSingle(),
    // …and group threads are members-only.
    supabaseAdmin
      .from('group_members')
      .select('clerk_user_id')
      .eq('group_id', params.groupId),
    findGroupConversation(params.groupId),
  ])

  if (myApp?.status !== 'approved') redirect('/profile')
  if (!group) notFound()
  const memberIds = (roster ?? []).map(r => r.clerk_user_id).filter(Boolean)
  if (!memberIds.includes(myId)) redirect('/messages')

  // Member profiles (for @mention autocomplete + highlighting — includes me so
  // a mention of me renders highlighted too) and my per-thread prefs.
  const [memberAppsRes, prefs] = await Promise.all([
    memberIds.length
      ? supabaseAdmin
          .from('members')
          .select('clerk_user_id, first_name, preferred_name, avatar_url')
          .in('clerk_user_id', memberIds)
          .eq('status', 'approved')
      : Promise.resolve({ data: [] }),
    convId ? getParticipantPrefs(convId, myId) : Promise.resolve({ muted: false, email_opt_in: false }),
  ])
  const members = (memberAppsRes.data ?? []).map(a => ({
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
        groupIconImage={group.icon_image}
        members={members}
        canLeave={group.join_policy === 'open'}
        initialMuted={prefs.muted}
        initialEmailOptIn={prefs.email_opt_in}
      />
    </div>
  )
}
