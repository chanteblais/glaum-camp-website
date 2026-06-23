import type { MemberGroup } from '@/lib/groups'

// Scattered cluster of a member's contribution badges, shown on the right of the
// badge row to mirror the role ("designation") badge on the left. Positions are
// deterministic per group id (a seeded PRNG), so they're stable across renders
// and identical on server + client — no hydration drift, no jitter on refresh.

const BADGE = 150 // px — readable, close to the 175×203 role badge
const STEP = 92 // vertical stride between stacked badges

// Small seeded PRNG (mulberry-ish) keyed off the group id.
function seeded(id: string) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function ContributionBadges({ groups }: { groups: MemberGroup[] }) {
  const badged = groups.filter(g => g.badge_image)
  if (badged.length === 0) return <div className="profile-badge-spacer" />

  const placed = badged.map((g, i) => {
    const rnd = seeded(g.id)
    const top = i * STEP + (rnd() * 16 - 8)
    const left = (i % 2 ? 44 : 4) + (rnd() * 16 - 8) // stagger left/right
    return { g, top, left }
  })

  const height = (badged.length - 1) * STEP + BADGE + 16

  return (
    <div className="profile-contrib-badges" style={{ position: 'relative', width: BADGE + 60, height, justifySelf: 'start' }}>
      {placed.map(({ g, top, left }, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={g.id}
          src={g.badge_image as string}
          alt={`${g.name} badge`}
          title={g.name}
          width={BADGE}
          height={BADGE}
          style={{
            position: 'absolute',
            top,
            left,
            width: BADGE,
            height: BADGE,
            objectFit: 'contain',
            zIndex: i + 1,
            filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
          }}
        />
      ))}
    </div>
  )
}
