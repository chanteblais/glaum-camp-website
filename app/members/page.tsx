import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

export default async function MembersPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Only approved members can view the directory
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const { data: viewer } = await supabaseAdmin
    .from('applications')
    .select('status')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .eq('status', 'approved')
    .maybeSingle()

  if (!viewer) redirect('/profile')

  // Fetch approved members and their signups separately, then join in JS
  const [{ data: members }, { data: signups }] = await Promise.all([
    supabaseAdmin
      .from('applications')
      .select('id, first_name, preferred_name, avatar_url, clerk_user_id')
      .eq('status', 'approved')
      .order('first_name', { ascending: true }),
    supabaseAdmin
      .from('camp_signups')
      .select('clerk_user_id, role_approval_status, roles ( name, departments ( name, icon ) )'),
  ])

  const signupByUser = Object.fromEntries(
    (signups ?? []).map(s => [s.clerk_user_id, s])
  )

  const all = (members ?? []).map(m => {
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
      <img src="/hands-left.svg"  alt="" aria-hidden style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <a href="/profile" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.6 }}>
            ← Back to profile
          </a>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.7, marginBottom: '0.5rem' }}>
            ✦ &nbsp;Glåüm Camp 2026&nbsp; ✦
          </p>
          <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#C8A848', marginBottom: '0.25rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
            Many Hands
          </h1>
          <p style={{ fontSize: '0.85rem', opacity: 0.4 }}>
            {all.length} approved {all.length === 1 ? 'member' : 'members'}
          </p>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.3), transparent)', marginBottom: '3rem' }} />

        {/* Member grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '1.5rem',
        }}>
          {all.map(member => (
            <a
              key={member.dbId}
              href={`/members/${member.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1.25rem 1rem',
                border: '1px solid rgba(200,168,72,0.15)',
                borderRadius: '1rem',
                background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={undefined}
              >
                {/* Avatar */}
                <div style={{
                  width: '80px', height: '80px',
                  borderRadius: '50%',
                  border: '2px solid rgba(111,73,31,0.6)',
                  background: 'rgba(200,168,72,0.08)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.4rem', color: '#C8A848', opacity: 0.6 }}>
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name */}
                <p style={{
                  fontSize: '0.88rem',
                  color: '#EDE0C8',
                  textAlign: 'center',
                  margin: 0,
                  lineHeight: 1.3,
                  letterSpacing: '0.03em',
                }}>
                  {member.name}
                </p>

                {/* Role pill (if assigned and approved) */}
                {member.roleName && member.roleApprovalStatus !== 'pending' && (
                  <p style={{
                    fontSize: '0.62rem',
                    color: '#C8A848',
                    opacity: 0.65,
                    textAlign: 'center',
                    margin: 0,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    lineHeight: 1.3,
                  }}>
                    {member.roleName}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>

        {all.length === 0 && (
          <p style={{ textAlign: 'center', opacity: 0.35, fontStyle: 'italic', fontSize: '0.9rem' }}>
            No approved members yet.
          </p>
        )}

      </div>
    </div>
  )
}
