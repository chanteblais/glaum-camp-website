import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

export default async function MemberPage({ params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Only approved members can view other profiles
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const { data: viewer } = await supabaseAdmin
    .from('applications')
    .select('status')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .eq('status', 'approved')
    .maybeSingle()

  if (!viewer) redirect('/profile')

  // Fetch target member and their signup separately
  const { data: member } = await supabaseAdmin
    .from('applications')
    .select('id, first_name, last_name, preferred_name, pronouns, avatar_url, clerk_user_id')
    .eq('status', 'approved')
    .or(`clerk_user_id.eq.${params.id},id.eq.${params.id}`)
    .maybeSingle()

  if (!member) notFound()

  const { data: signup } = member.clerk_user_id
    ? await supabaseAdmin
        .from('camp_signups')
        .select('role_approval_status, roles ( name, description, purpose, departments ( name, icon ) )')
        .eq('clerk_user_id', member.clerk_user_id)
        .maybeSingle()
    : { data: null }

  const role = signup?.roles as {
    name?: string
    description?: string | null
    purpose?: string | null
    departments?: { name?: string; icon?: string | null } | null
  } | null

  const isPendingRole = signup?.role_approval_status === 'pending'
  const roleName = (!isPendingRole && role?.name) ? role.name : null
  const deptName = (!isPendingRole && role?.departments?.name) ? role.departments.name : null
  const displayName = member.preferred_name || member.first_name || 'Member'

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
      <img src="/hands-left.svg"  alt="" aria-hidden style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3rem 1.5rem 6rem', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <a href="/members" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C8A848', textDecoration: 'none', opacity: 0.6 }}>
            ← All members
          </a>
        </div>

        {/* Profile card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', marginBottom: '3rem' }}>

          {/* Badge + avatar row */}
          {roleName && deptName ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1.5rem', width: '100%', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/badge?role=${encodeURIComponent(roleName)}&dept=${encodeURIComponent(deptName)}`}
                  alt={`${roleName} badge`}
                  width={175}
                  height={203}
                  style={{ display: 'block', transform: 'translate(-40px, -28px)', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6)) drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
                />
              </div>
              {/* Avatar */}
              <div style={{
                width: '200px', height: '200px',
                borderRadius: '50%',
                border: '3px solid #6F491F',
                boxShadow: '0 0 0 1px rgba(60,35,10,0.6), 0 0 20px rgba(111,73,31,0.25), 0 8px 32px rgba(0,0,0,0.55)',
                background: 'rgba(200,168,72,0.08)',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: 'TokyoDreams, serif', fontSize: '3rem', color: '#C8A848', opacity: 0.5 }}>
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div />
            </div>
          ) : (
            // No role — just center the avatar
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                width: '200px', height: '200px',
                borderRadius: '50%',
                border: '3px solid #6F491F',
                boxShadow: '0 0 0 1px rgba(60,35,10,0.6), 0 0 20px rgba(111,73,31,0.25), 0 8px 32px rgba(0,0,0,0.55)',
                background: 'rgba(200,168,72,0.08)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: 'TokyoDreams, serif', fontSize: '3rem', color: '#C8A848', opacity: 0.5 }}>
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Name + pronouns */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'inline-block', padding: '0.35rem 1.25rem', borderRadius: '9999px', backgroundColor: 'rgba(210,57,248,0.15)', border: '1px solid rgba(210,57,248,0.3)', fontSize: '0.75rem', letterSpacing: '0.12em', color: '#D239F8', marginBottom: '0.75rem' }}>
              ✦ APPROVED CAMPER
            </span>
            <h1 style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2rem, 6vw, 2.8rem)', color: '#C8A848', margin: '0 0 0.15rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
              {displayName}
            </h1>
            {member.pronouns && (
              <p style={{ fontSize: '0.85rem', opacity: 0.45, margin: 0 }}>{member.pronouns}</p>
            )}
          </div>
        </div>

        {/* Role / dept detail */}
        {roleName && (
          <>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.25), transparent)', marginBottom: '2rem' }} />
            <div style={{ padding: '1.5rem', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '1rem', background: 'rgba(200,168,72,0.03)', textAlign: 'center' }}>
              {deptName && (
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.7, marginBottom: '0.5rem' }}>
                  {deptName}
                </p>
              )}
              <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.3rem', color: '#C8A848', margin: 0 }}>
                {roleName}
              </p>
              {(role?.description || role?.purpose) && (
                <p style={{ fontSize: '0.85rem', lineHeight: 1.7, opacity: 0.5, marginTop: '0.75rem', marginBottom: 0, fontStyle: 'italic' }}>
                  {role?.description || role?.purpose}
                </p>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
