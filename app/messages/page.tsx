import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { MessagesInboxClient } from './MessagesInboxClient'

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

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Header />
      <img src="/hands-left.svg"  alt="" aria-hidden style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '6rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.7, marginBottom: '0.4rem' }}>
            ✦ &nbsp;Messages&nbsp; ✦
          </p>
          <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            Messages
          </h1>
        </div>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)', marginBottom: '2.5rem' }} />
        <MessagesInboxClient currentUserId={userId} />
      </div>
    </div>
  )
}
