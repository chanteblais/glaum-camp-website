import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { supabaseResizedUrl } from '@/lib/supabase-image'
import { getMemberGroups } from '@/lib/groups'
import { getBadgeVersion } from '@/lib/badge-version'
import { buildMemberFacts } from '@/lib/member-facts'
import { parseDistinctions, evaluateDistinctions } from '@/lib/distinctions'
import { resolveMember, getMemberProfileValues } from '@/lib/members'
import { parseProfileFields, storedFields } from '@/lib/profile-fields'
import { getMemberAwards } from '@/lib/distinction-awards'
import { CabinetOfDistinctions } from '@/app/profile/CabinetOfDistinctions'

const GOLD = '#C8A848'
const PURPLE = '#D239F8'
const CREAM = '#F3EDE6'

// A patch-style value is an uploaded image (URL); anything else is an emoji glyph.
const isImageIcon = (v: string) => /^https?:\/\//.test(v) || v.startsWith('/')

// Card shell shared by every section — the warm, gold-edged registry panel.
function cardStyle(): React.CSSProperties {
  return {
    border: '1px solid rgba(200,168,72,0.28)',
    borderRadius: '1rem',
    background: 'rgba(10,0,20,0.55)',
    boxShadow: '0 0 0 1px rgba(200,168,72,0.06), 0 18px 50px rgba(0,0,0,0.35)',
    padding: '1.75rem 1.9rem 1.9rem',
  }
}

// Ceremonial section heading: ✦ — TITLE — ✦, echoing the Cabinet's header.
function SectionHeading({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', marginBottom: '1.4rem' }}>
      <span aria-hidden style={{ color: GOLD, fontSize: '0.7rem', opacity: 0.85 }}>✦</span>
      <span aria-hidden style={{ width: '34px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.55))' }} />
      <h2 style={{
        fontFamily: 'var(--font-cormorant-garamond), serif', fontSize: '1.05rem', fontWeight: 600,
        letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, margin: 0,
        textShadow: '0 0 18px rgba(200,168,72,0.3)', whiteSpace: 'nowrap',
      }}>{title}</h2>
      <span aria-hidden style={{ width: '34px', height: '1px', background: 'linear-gradient(90deg, rgba(200,168,72,0.55), transparent)' }} />
      <span aria-hidden style={{ color: GOLD, fontSize: '0.7rem', opacity: 0.85 }}>✦</span>
    </div>
  )
}

export default async function MemberPage({ params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Only approved members can view other profiles
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const { data: viewer } = await supabaseAdmin
    .from('members')
    .select('status')
    .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
    .eq('status', 'approved')
    .maybeSingle()

  if (!viewer) redirect('/profile')

  // Fetch target member
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)

  const { data: member } = await supabaseAdmin
    .from('applications')
    .select('id, first_name, preferred_name, pronouns, avatar_url, clerk_user_id, submitted_at, status, camped_before, public_bio, public_skills')
    .eq('status', 'approved')
    .eq(isUuid ? 'id' : 'clerk_user_id', params.id)
    .maybeSingle()

  if (!member) notFound()

  // Fetch their camp signup with role + dept
  const { data: campSignup } = member.clerk_user_id
    ? await supabaseAdmin
        .from('camp_signups')
        .select('role_id, role_approval_status, roles(name, description, purpose, department_id, departments(name, icon))')
        .eq('clerk_user_id', member.clerk_user_id)
        .maybeSingle()
    : { data: null }

  const roleInfo = campSignup?.roles as { name?: string; description?: string | null; purpose?: string | null; departments?: { name?: string; icon?: string } | null } | null
  const roleApproved = !!campSignup?.role_id && campSignup?.role_approval_status !== 'pending'

  // Group affiliations — the member's "Contributions" (Setup / Decor / Teardown …).
  const memberGroups = await getMemberGroups(member.clerk_user_id as string | null)

  // Earned medals — derived from facts against the admin's distinction rules
  // (store-the-facts, derive-the-badge). Never persisted; recomputed per render.
  const { data: distRow } = await supabaseAdmin
    .from('page_content')
    .select('value')
    .eq('key', 'config_distinctions')
    .maybeSingle()
  const memberFacts = buildMemberFacts({ application: member, roleInfo, memberGroups, roleApproved })
  // Merged namespace: stored profile values ∪ derived system facts (system wins).
  // Guarded — falls back to system-facts-only when no member row exists yet.
  const profileMember = await resolveMember((member.clerk_user_id as string | null) ?? null)
  const profileValues = profileMember ? await getMemberProfileValues(profileMember.id) : {}
  const awardedIds = profileMember ? new Set(await getMemberAwards(profileMember.id)) : undefined
  const factContext = { ...profileValues, ...memberFacts }
  const earnedDistinctions = evaluateDistinctions(factContext, parseDistinctions(distRow?.value), awardedIds)

  const displayName = member.preferred_name || member.first_name || 'Member'
  const memberSince = member.submitted_at ? new Date(member.submitted_at as string).getFullYear() : null
  const deptName = roleApproved ? roleInfo?.departments?.name ?? null : null
  const deptIcon = roleInfo?.departments?.icon ?? null
  const roleName = roleApproved ? roleInfo?.name ?? null : null

  const badgeVersion = await getBadgeVersion()
  const showBadge = !!roleName && !!deptName

  const skills = ((member.public_skills as string | null) ?? '')
    .split(',').map(s => s.trim()).filter(Boolean)
  const bio = (member.public_bio as string | null)?.trim() || null

  // Public registry-defined profile fields with a value (Phase 4).
  const { data: pfRow } = await supabaseAdmin
    .from('page_content').select('value').eq('key', 'config_profile_fields').maybeSingle()
  const publicProfileFields = storedFields(parseProfileFields(pfRow?.value))
    .filter(f => f.public)
    .map(f => ({ field: f, value: profileValues[f.key] }))
    .filter(({ value }) => value != null && value !== '' && !(Array.isArray(value) && value.length === 0))

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
      <Header />
      <img src="/hands-left.svg"  alt="" aria-hidden role="presentation" style={{ position: 'fixed', left: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />
      <img src="/hands-right.svg" alt="" aria-hidden role="presentation" style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.85, zIndex: 0 }} />

      <main aria-labelledby="member-heading" style={{ maxWidth: '880px', margin: '0 auto', padding: '6rem 1.5rem 7rem', position: 'relative', zIndex: 1 }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{
            width: '260px', height: '260px', borderRadius: '50%',
            border: '3px solid #6F491F',
            boxShadow: '0 0 0 1px rgba(60,35,10,0.6), 0 0 20px rgba(111,73,31,0.25), 0 8px 32px rgba(0,0,0,0.55)',
            background: 'rgba(200,168,72,0.08)', overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.75rem',
          }}>
            {member.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={supabaseResizedUrl(member.avatar_url as string, 520) ?? ''} alt={`${displayName}'s portrait`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span aria-hidden="true" style={{ fontFamily: 'TokyoDreams, serif', fontSize: '3rem', color: GOLD, opacity: 0.5 }}>
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: PURPLE, marginBottom: '0.45rem', opacity: 0.85 }}>
            Approved Camper
          </p>
          <h1 id="member-heading" style={{ fontFamily: 'TokyoDreams, serif', fontSize: 'clamp(2.1rem, 6vw, 3.1rem)', color: GOLD, marginBottom: '0.2rem', textShadow: '0 0 40px rgba(210,57,248,0.4)' }}>
            {displayName}
          </h1>
          {member.pronouns && (
            <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '0.3rem' }}>{member.pronouns as string}</p>
          )}
          {memberSince && (
            <p style={{ fontSize: '0.8rem', letterSpacing: '0.12em', color: CREAM, opacity: 0.65, marginTop: '0.35rem' }}>
              Member since {memberSince}
            </p>
          )}

          <a
            href={`/messages/${member.clerk_user_id}`}
            aria-label={`Send a message to ${displayName}`}
            style={{
              display: 'inline-block', marginTop: '1.4rem', padding: '0.5rem 1.4rem',
              borderRadius: '9999px', border: '1px solid rgba(210,57,248,0.35)',
              color: PURPLE, fontSize: '0.78rem', letterSpacing: '0.1em',
              textDecoration: 'none', opacity: 0.9, fontFamily: 'TokyoDreams, serif',
            }}
          >
            <span aria-hidden="true">✉ </span>Message
          </a>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* ── About ──────────────────────────────────────────────────────── */}
          {bio && (
            <section style={cardStyle()}>
              <SectionHeading title="About" />
              <p style={{
                fontSize: '1rem', lineHeight: 1.85, color: CREAM, opacity: 0.92,
                textAlign: 'center', maxWidth: '52ch', margin: '0 auto', whiteSpace: 'pre-line',
              }}>
                {bio}
              </p>
            </section>
          )}

          {/* ── Roles & Responsibilities ───────────────────────────────────── */}
          {(deptName || roleName) ? (
            <section style={cardStyle()}>
              <SectionHeading title="Roles & Responsibilities" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'stretch', justifyContent: 'center' }}>
                {deptName && (
                  <RoleCard icon={deptIcon || '✦'} kicker="Department" title={deptName} />
                )}
                {roleName && (
                  <RoleCard icon="✦" kicker="Primary role" title={roleName} subtitle={roleInfo?.purpose ?? null} />
                )}
                {showBadge && (
                  <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.5rem' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/badge?role=${encodeURIComponent(roleName as string)}&dept=${encodeURIComponent(deptName as string)}&v=${badgeVersion}`}
                      alt={`${displayName}'s ${roleName} role badge`}
                      width={130} height={151}
                      style={{ display: 'block', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.55))' }}
                    />
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {/* ── Contributions ──────────────────────────────────────────────── */}
          {memberGroups.length > 0 && (
            <section style={cardStyle()}>
              <SectionHeading title="Contributions" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem', justifyContent: 'center' }}>
                {memberGroups.map(g => {
                  const icon = g.icon || g.icon_image || '✦'
                  return (
                    <span key={g.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.55rem',
                      padding: '0.5rem 1.1rem', borderRadius: '9999px',
                      border: '1px solid rgba(200,168,72,0.3)', background: 'rgba(200,168,72,0.06)',
                      color: CREAM, fontSize: '0.9rem',
                    }}>
                      {isImageIcon(icon)
                        ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={icon} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
                        : <span aria-hidden style={{ fontSize: '1.05rem', lineHeight: 1 }}>{icon}</span>}
                      {g.name}
                    </span>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Profile fields (registry-defined, public) ───────────────────── */}
          {publicProfileFields.length > 0 && (
            <section style={cardStyle()}>
              <SectionHeading title="Profile" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {publicProfileFields.map(({ field, value }) => (
                  <div key={field.key} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: GOLD, opacity: 0.6, marginBottom: '0.35rem' }}>{field.label}</p>
                    {Array.isArray(value) ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                        {value.map((v, i) => (
                          <span key={i} style={{ padding: '0.35rem 0.85rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.3)', background: 'rgba(200,168,72,0.07)', color: CREAM, fontSize: '0.82rem' }}>{String(v)}</span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.9rem', color: CREAM, opacity: 0.85, margin: 0 }}>{field.type === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Skills & Gifts ─────────────────────────────────────────────── */}
          {skills.length > 0 && (
            <section style={cardStyle()}>
              <SectionHeading title="Skills & Gifts" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', justifyContent: 'center' }}>
                {skills.map((s, i) => (
                  <span key={i} style={{
                    padding: '0.45rem 1rem', borderRadius: '9999px',
                    border: '1px solid rgba(210,57,248,0.32)', background: 'rgba(210,57,248,0.07)',
                    color: '#F4E3FA', fontSize: '0.85rem', letterSpacing: '0.02em',
                  }}>{s}</span>
                ))}
              </div>
            </section>
          )}

          {/* ── Distinctions — the cabinet of honours ──────────────────────── */}
          {earnedDistinctions.length > 0 && (
            <section>
              <CabinetOfDistinctions distinctions={earnedDistinctions} />
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

// One elegant role/department card with a small icon medallion.
function RoleCard({ icon, kicker, title, subtitle }: {
  icon: string
  kicker: string
  title: string
  subtitle?: string | null
}) {
  return (
    <div style={{
      flex: '1 1 220px', minWidth: '200px', maxWidth: '320px',
      display: 'flex', alignItems: 'center', gap: '0.9rem',
      padding: '1rem 1.2rem', borderRadius: '0.85rem',
      border: '1px solid rgba(200,168,72,0.2)', background: 'rgba(200,168,72,0.04)',
    }}>
      <span aria-hidden style={{
        width: 46, height: 46, flexShrink: 0, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle at 38% 30%, rgba(210,57,248,0.16), rgba(8,0,18,0.85) 72%)',
        border: '1.5px solid rgba(200,168,72,0.7)', fontSize: '1.25rem',
        boxShadow: 'inset 0 0 12px rgba(200,168,72,0.15)',
      }}>
        {isImageIcon(icon)
          ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={icon} alt="" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
          : icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, opacity: 0.7, marginBottom: '0.2rem' }}>{kicker}</p>
        <p style={{ fontSize: '1rem', color: CREAM, lineHeight: 1.3, fontFamily: 'var(--font-cormorant-garamond), serif', fontWeight: 600 }}>{title}</p>
        {subtitle && <p style={{ fontSize: '0.76rem', opacity: 0.5, marginTop: '0.2rem', lineHeight: 1.4 }}>{subtitle}</p>}
      </div>
    </div>
  )
}
