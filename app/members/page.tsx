import { HandsBackdrop } from '@/components/HandsBackdrop'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { getApprovedMember } from '@/lib/members'
import { Header } from '@/components/Header'
import { MembersGrid, type MemberCard } from './MembersGrid'

export default async function MembersPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // The viewer gate (approved members only) runs alongside the directory
  // queries — it gates the response, not what we fetch.
  const [viewer, { data: members }, { data: signups }] = await Promise.all([
    getApprovedMember(userId),
    supabaseAdmin
      .from('applications')
      .select('id, first_name, preferred_name, avatar_url, clerk_user_id')
      .eq('status', 'approved')
      .order('first_name', { ascending: true }),
    supabaseAdmin
      .from('camp_signups')
      .select('clerk_user_id, role_approval_status, roles ( name, departments ( name, icon ) )'),
  ])

  if (!viewer) redirect('/profile')

  const signupByUser = Object.fromEntries(
    (signups ?? []).map(s => [s.clerk_user_id, s])
  )

  const all: MemberCard[] = (members ?? []).map(m => {
    const signup = m.clerk_user_id ? signupByUser[m.clerk_user_id] : null
    const role = signup?.roles as { name?: string; departments?: { name?: string; icon?: string } | null } | null
    return {
      id: m.clerk_user_id ?? m.id,
      dbId: m.id,
      name: m.preferred_name || m.first_name || 'Member',
      avatarUrl: m.avatar_url ?? null,
      roleName: role?.name ?? null,
      deptName: role?.departments?.name ?? null,
      roleApprovalStatus: signup?.role_approval_status ?? null,
    }
  })

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
      <Header />
      <HandsBackdrop />

      <main aria-labelledby="members-heading" style={{ maxWidth: '960px', margin: '0 auto', padding: '6rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.7, marginBottom: '0.5rem' }}>
            <span aria-hidden="true">✦ &nbsp;</span>Glåüm Camp 2026<span aria-hidden="true">&nbsp; ✦</span>
          </p>
          <h1 id="members-heading" style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', marginBottom: '0.25rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
            Many Hands
          </h1>
          <p style={{ fontSize: '0.85rem', opacity: 0.4 }}>
            {all.length} approved {all.length === 1 ? 'member' : 'members'}
          </p>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)', marginBottom: '3rem' }} aria-hidden="true" />

        <MembersGrid members={all} />

      </main>
    </div>
  )
}
