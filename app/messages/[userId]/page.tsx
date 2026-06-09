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
    .from('applications')
    .select('clerk_user_id, first_name, preferred_name, avatar_url, pronouns')
    .eq('clerk_user_id', params.userId)
    .eq('status', 'approved')
    .maybeSingle()

  if (!other) notFound()

  const displayName = other.preferred_name || other.first_name || 'Member'
  const avatarUrl = supabaseResizedUrl(other.avatar_url ?? null, 160) ?? null

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
        pronouns={other.pronouns ?? null}
      />
    </div>
  )
}
