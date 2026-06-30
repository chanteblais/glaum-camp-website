import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { ThreadClient } from './ThreadClient'
import { supabaseResizedUrl } from '@/lib/supabase-image'

export default async function ThreadPage({ params }: { params: { userId: string } }) {
  const { userId: myId } = await auth()
  if (!myId) redirect('/sign-in')

  // Auth: only approved members
  const { data: myApp } = await supabaseAdmin
    .from('applications')
    .select('status')
    .eq('clerk_user_id', myId)
    .maybeSingle()

  if (myApp?.status !== 'approved') redirect('/profile')

  // Can't message yourself
  if (params.userId === myId) redirect('/messages')

  // Fetch recipient profile
  const { data: other } = await supabaseAdmin
    .from('members')
    .select('clerk_user_id, first_name, preferred_name, avatar_url, pronouns')
    .eq('clerk_user_id', params.userId)
    .eq('status', 'approved')
    .maybeSingle()

  // The other member may have been removed (deleted / no longer approved). Rather
  // than 404, still show the existing conversation read-only — but only if there's
  // actually message history (otherwise this is a genuinely invalid link).
  let recipientActive = true
  let displayName: string
  let avatarUrl: string | null
  let pronouns: string | null

  if (other) {
    displayName = other.preferred_name || other.first_name || 'Member'
    avatarUrl = supabaseResizedUrl(other.avatar_url ?? null, 160) ?? null
    pronouns = other.pronouns ?? null
  } else {
    // Find the most recent message they sent us — its snapshot name (and the
    // existence check) tells us whether to render the thread read-only.
    const { data: lastFromThem } = await supabaseAdmin
      .from('messages')
      .select('sender_name')
      .eq('sender_clerk_id', params.userId)
      .eq('recipient_clerk_id', myId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // They may have only ever received messages from us — still allow the thread
    // if any history exists in either direction.
    const { count } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .or(
        `and(sender_clerk_id.eq.${myId},recipient_clerk_id.eq.${params.userId}),and(sender_clerk_id.eq.${params.userId},recipient_clerk_id.eq.${myId})`
      )
    if (!count) notFound()
    recipientActive = false
    displayName = lastFromThem?.sender_name || 'Former member'
    avatarUrl = null
    pronouns = null
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <Header />
      <img src="/hands-left.svg"  alt="" aria-hidden role="presentation" style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.6, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden role="presentation" style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.6, zIndex: 0 }} />
      <ThreadClient
        currentUserId={myId}
        recipientId={params.userId}
        displayName={displayName}
        avatarUrl={avatarUrl}
        pronouns={pronouns}
        recipientActive={recipientActive}
      />
    </div>
  )
}
