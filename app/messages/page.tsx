import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { MessagesInboxClient } from './MessagesInboxClient'

export type MemberOption = {
  userId: string
  displayName: string
  avatarUrl: string | null
}

export default async function MessagesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Only approved members
  const { data: app } = await supabaseAdmin
    .from('applications')
    .select('status')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (app?.status !== 'approved') redirect('/profile')

  // Fetch all other approved members for the "New Message" picker
  const { data: members } = await supabaseAdmin
    .from('applications')
    .select('clerk_user_id, first_name, preferred_name, avatar_url')
    .eq('status', 'approved')
    .neq('clerk_user_id', userId)
    .order('first_name', { ascending: true })

  const memberOptions: MemberOption[] = (members ?? [])
    .filter(m => m.clerk_user_id)
    .map(m => ({
      userId: m.clerk_user_id!,
      displayName: m.preferred_name || m.first_name || 'Member',
      avatarUrl: m.avatar_url ?? null,
    }))

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Header />
      <img src="/hands-left.svg"  alt="" aria-hidden="true" role="presentation" style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden="true" role="presentation" style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <main aria-labelledby="messages-heading" style={{ maxWidth: '720px', margin: '0 auto', padding: '4.5rem 1.5rem 3rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <div>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.7, marginBottom: '0.4rem' }}>
              <span aria-hidden="true">✦ &nbsp;</span>Messages<span aria-hidden="true">&nbsp; ✦</span>
            </p>
            <h1 id="messages-heading" style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#C8A848', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              Messages
            </h1>
          </div>
        </div>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)', marginBottom: '2.5rem' }} aria-hidden="true" />
        <MessagesInboxClient currentUserId={userId} members={memberOptions} />
      </main>
    </div>
  )
}
