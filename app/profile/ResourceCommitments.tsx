'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// The member face of Shared Resources — a preparation board, not an
// inventory. It answers "what can I do that would be most helpful?" first:
// a pinned I'M BRINGING card, per-list readiness (84% Ready), items grouped
// Still Needed → Covered → Suggested, visible names on every commitment
// (social proof), and expandable rows for detail. See docs/shared-resources.md.

type Claimant = { name: string; quantity: number; me: boolean }
type ResourceItem = {
  id: string
  name: string
  note: string | null
  icon: string | null
  // NULL = an open suggestion (no set target) — someone proposed gear that wasn't asked for.
  needed: number | null
  claimed: number
  mine: number
  claimants: Claimant[]
  offered_by_name: string | null
  offered_by_me: boolean
}
type ResourceList = {
  id: string
  title: string
  description: string | null
  // The list's steward — a group, department, or role name (display context only).
  steward_name: string | null
  items: ResourceItem[]
}

const GOLD = '#C8A848'
const GREEN = '#7dcf8e'
const PURPLE = '#D239F8'
const LAVENDER = '#D9B8E8'
const CREAM = '#F3EDE6'

const groupLabelStyle: React.CSSProperties = {
  fontSize: '0.66rem', letterSpacing: '0.2em', textTransform: 'uppercase',
  margin: '0 0 0.6rem',
}

function claimantLine(c: Claimant) {
  return c.quantity > 1 ? `${c.name} ×${c.quantity}` : c.name
}

// Server-rendered pages pass the same shape /api/resources returns
// (lib/resources.ts → getMemberResourceView), so the section renders with its
// data already in place and skips the fetch-after-hydration round-trip.
export function ResourceCommitments({ initialLists }: { initialLists?: ResourceList[] }) {
  const router = useRouter()
  const [lists, setLists] = useState<ResourceList[] | null>(initialLists ?? null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // Inline "Suggest a resource" form — open on at most one list at a time.
  const [suggestListId, setSuggestListId] = useState<string | null>(null)
  const [suggestName, setSuggestName] = useState('')
  const [suggestNote, setSuggestNote] = useState('')
  const [suggestBring, setSuggestBring] = useState(true)
  const [suggestBusy, setSuggestBusy] = useState(false)

  const load = () =>
    fetch('/api/resources')
      .then(r => r.json())
      .then(d => setLists(d.lists ?? []))
      .catch(() => setLists([]))

  useEffect(() => {
    if (initialLists) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deep links (/participate#bring, e.g. from the home widget): the sections
  // now arrive server-rendered, but late layout shifts (images, fonts) can
  // still nudge the anchor, and a single scroll — native or ours — gets undone
  // when later content lands
  // above the anchor and pushes it down. Instead, pin the anchor on every
  // layout change for the first few seconds, then let go. The first wheel or
  // touch hands control back to the user immediately.
  useEffect(() => {
    if (window.location.hash !== '#bring') return
    let cancelled = false
    const cancel = () => { cancelled = true }
    window.addEventListener('wheel', cancel, { passive: true })
    window.addEventListener('touchstart', cancel, { passive: true })
    const snap = () => { if (!cancelled) document.getElementById('bring')?.scrollIntoView({ block: 'start' }) }
    const ro = new ResizeObserver(snap)
    ro.observe(document.body)
    snap()
    const stop = setTimeout(() => ro.disconnect(), 3000)
    return () => {
      clearTimeout(stop)
      ro.disconnect()
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchstart', cancel)
    }
  }, [])

  const toggleExpanded = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // My claim on `item` becomes `qty` — locally adjust mine, the total, AND my
  // entry in the visible claimant names, so the board stays truthful mid-flight.
  const applyMine = (item: ResourceItem, qty: number) => (i: ResourceItem): ResourceItem => {
    if (i.id !== item.id) return i
    const others = i.claimants.filter(c => !c.me)
    return {
      ...i,
      mine: qty,
      claimed: i.claimed - i.mine + qty,
      claimants: qty > 0 ? [{ name: 'You', quantity: qty, me: true }, ...others] : others,
    }
  }

  async function setClaim(item: ResourceItem, quantity: number) {
    const qty = Math.min(99, Math.max(0, quantity))
    if (qty === item.mine) return
    setBusyId(item.id)
    setError(null)
    setLists(prev => prev?.map(l => ({ ...l, items: l.items.map(applyMine(item, qty)) })) ?? prev)

    const res = await fetch('/api/resources/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource_id: item.id, quantity: qty }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Could not update. Try again.')
      // Revert (applyMine reads the current state's own quantity, so setting
      // back to the original target undoes the optimistic step)
      setLists(prev => prev?.map(l => ({ ...l, items: l.items.map(applyMine(item, item.mine)) })) ?? prev)
    } else {
      // Retracting your own suggestion may delete the listing server-side —
      // refetch so the row disappears (or stays, if others piled on) truthfully.
      if (item.offered_by_me && qty === 0) await load()
      // Refresh server components (profile commitments card) on next nav.
      router.refresh()
    }
    setBusyId(null)
  }

  async function submitSuggestion(listId: string) {
    if (!suggestName.trim()) return
    setSuggestBusy(true)
    setError(null)
    const res = await fetch('/api/resources/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: listId, name: suggestName, note: suggestNote, bring: suggestBring }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Could not add your suggestion. Try again.')
    } else {
      setSuggestListId(null)
      setSuggestName('')
      setSuggestNote('')
      setSuggestBring(true)
      await load()
      router.refresh()
    }
    setSuggestBusy(false)
  }

  if (lists === null) {
    return <p style={{ fontSize: '0.85rem', opacity: 0.4 }}>Loading…</p>
  }
  if (lists.length === 0) {
    return (
      <p style={{ fontSize: '0.85rem', opacity: 0.45, fontStyle: 'italic' }}>
        Nothing needs bringing right now.
      </p>
    )
  }

  // ── I'M BRINGING — everything I've committed to, pinned up top ──
  const myCommitments = lists.flatMap(l =>
    l.items.filter(i => i.mine > 0).map(i => ({ item: i, listTitle: l.title })))

  const jumpToItem = (id: string) => {
    setExpanded(prev => new Set(prev).add(id))
    // Let the expansion render before scrolling to it.
    setTimeout(() => document.getElementById(`res-item-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  const stepBtn: React.CSSProperties = {
    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
    border: `1px solid rgba(210,57,248,0.45)`, background: 'rgba(210,57,248,0.1)',
    color: PURPLE, cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }
  const claimBtn = (label: string, onClick: () => void, busy: boolean): React.ReactNode => (
    <button
      disabled={busy}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        flexShrink: 0, fontSize: '0.72rem', letterSpacing: '0.06em', padding: '0.4rem 0.95rem',
        borderRadius: '9999px', whiteSpace: 'nowrap', cursor: busy ? 'wait' : 'pointer',
        border: `1px solid rgba(200,168,72,0.45)`, color: '#FFFACD', background: 'rgba(200,168,72,0.08)',
      }}
    >
      {label}
    </button>
  )

  const renderItem = (item: ResourceItem) => {
    const busy = busyId === item.id
    const isSuggestion = item.needed === null
    const remaining = isSuggestion ? 0 : Math.max(0, (item.needed as number) - item.claimed)
    const covered = !isSuggestion && remaining === 0
    const isOpen = expanded.has(item.id)
    const claimedByMe = item.mine > 0

    return (
      <div
        key={item.id}
        id={`res-item-${item.id}`}
        style={{
          borderRadius: '0.85rem',
          border: `1px solid ${claimedByMe ? 'rgba(210,57,248,0.45)' : 'rgba(200,168,72,0.18)'}`,
          background: claimedByMe ? 'rgba(210,57,248,0.06)' : 'rgba(255,255,255,0.02)',
          transition: 'border-color 0.15s, background 0.15s', opacity: busy ? 0.6 : 1,
          overflow: 'hidden',
        }}
      >
        {/* Compact row — click to expand */}
        <div
          onClick={() => toggleExpanded(item.id)}
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.25rem', cursor: 'pointer' }}
        >
          <div style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.icon
              ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={item.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: '1.4rem', color: GOLD, opacity: 0.45 }}>✦</span>}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.95rem', color: CREAM, fontWeight: 600 }}>{item.name}</p>
            {/* What matters most, first: the shortage — not the count. */}
            {isSuggestion ? (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.74rem', color: LAVENDER, opacity: 0.85, fontStyle: 'italic' }}>
                Suggested by {item.offered_by_me ? 'you' : item.offered_by_name ?? 'a member'}
                {item.claimed > 0 ? ` · ${item.claimed} being brought` : ' · nobody bringing it yet'}
              </p>
            ) : covered ? (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.74rem', color: GREEN, opacity: 0.9 }}>
                ✓ Covered · {item.claimed} of {item.needed} committed
              </p>
            ) : (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem' }}>
                <span style={{ color: GOLD, fontWeight: 700 }}>Still need: {remaining}</span>
                <span style={{ color: CREAM, opacity: 0.4 }}> · {item.claimed} / {item.needed} committed</span>
              </p>
            )}
          </div>

          {/* Primary action stays one click away on open needs */}
          {!covered && !isSuggestion && !claimedByMe && claimBtn("I'll bring one", () => setClaim(item, 1), busy)}
          <span aria-hidden style={{ color: GOLD, opacity: 0.4, fontSize: '0.8rem', flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
        </div>

        {/* Expanded detail */}
        {isOpen && (
          <div style={{ padding: '0 1.25rem 1rem', borderTop: '1px solid rgba(200,168,72,0.1)' }}>
            {item.note && (
              <p style={{ margin: '0.8rem 0 0', fontSize: '0.78rem', opacity: 0.55, fontStyle: 'italic', lineHeight: 1.5 }}>{item.note}</p>
            )}

            {/* Who's bringing it — social proof */}
            <div style={{ margin: '0.8rem 0 0' }}>
              {item.claimants.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.4, fontStyle: 'italic' }}>Nobody yet — be the first.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.9rem' }}>
                  {item.claimants.map((c, i) => (
                    <span key={i} style={{ fontSize: '0.78rem', color: c.me ? PURPLE : CREAM, opacity: c.me ? 1 : 0.75 }}>
                      <span style={{ color: GREEN }}>✓</span> {claimantLine(c)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* My commitment controls */}
            <div style={{ margin: '0.9rem 0 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {claimedByMe ? (
                <>
                  <span style={{ fontSize: '0.78rem', color: PURPLE, opacity: 0.85 }}>You&rsquo;re bringing</span>
                  <button style={stepBtn} disabled={busy} onClick={() => setClaim(item, item.mine - 1)} aria-label="Bring one fewer">−</button>
                  <span style={{ fontSize: '0.85rem', color: PURPLE, minWidth: '1.2rem', textAlign: 'center' }}>{item.mine}</span>
                  <button style={stepBtn} disabled={busy} onClick={() => setClaim(item, item.mine + 1)} aria-label="Bring one more">+</button>
                  <button
                    disabled={busy}
                    onClick={() => setClaim(item, 0)}
                    style={{ background: 'none', border: 'none', padding: 0, color: '#ff8a8a', opacity: 0.65, cursor: 'pointer', fontSize: '0.74rem', fontFamily: 'inherit' }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                claimBtn(covered ? '＋ Bring an extra' : isSuggestion ? "＋ I'll bring one" : "＋ I'll bring one", () => setClaim(item, 1), busy)
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderList = (list: ResourceList) => {
    const targeted = list.items.filter(i => i.needed !== null)
    const totalUnits = targeted.reduce((s, i) => s + (i.needed as number), 0)
    const coveredUnits = targeted.reduce((s, i) => s + Math.min(i.claimed, i.needed as number), 0)
    const pct = totalUnits > 0 ? Math.round((coveredUnits / totalUnits) * 100) : null
    const fullyReady = totalUnits > 0 && coveredUnits >= totalUnits

    const stillNeeded = list.items.filter(i => i.needed !== null && i.claimed < (i.needed as number))
    const covered = list.items.filter(i => i.needed !== null && i.claimed >= (i.needed as number))
    const suggested = list.items.filter(i => i.needed === null)

    return (
      <div key={list.id}>
        {/* List header: the shared goal, not the inventory */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '0.05em', color: GOLD, opacity: 0.95, fontFamily: 'TokyoDreams, serif' }}>
              {list.title}
            </p>
            {pct !== null && (
              <p style={{ margin: 0, fontSize: '0.95rem', color: fullyReady ? GREEN : GOLD, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {pct}% Ready
              </p>
            )}
          </div>
          {(list.description || list.steward_name) && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', opacity: 0.45, lineHeight: 1.5 }}>
              {[list.description, list.steward_name ? `Stewarded by ${list.steward_name}` : null].filter(Boolean).join(' · ')}
            </p>
          )}
          {pct !== null && (
            <>
              <div style={{ marginTop: '0.6rem', height: '6px', borderRadius: '9999px', background: 'rgba(200,168,72,0.12)', overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', borderRadius: '9999px', transition: 'width 0.3s',
                  background: fullyReady
                    ? 'linear-gradient(90deg, rgba(125,207,142,0.7), rgba(125,207,142,0.95))'
                    : 'linear-gradient(90deg, rgba(200,168,72,0.55), rgba(200,168,72,0.9))',
                }} />
              </div>
              {fullyReady ? (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: GREEN, opacity: 0.9 }}>
                  ✨ {list.title} is fully equipped! Thanks to everyone contributing.
                </p>
              ) : (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.72rem', opacity: 0.45 }}>
                  {coveredUnits} of {totalUnits} covered
                </p>
              )}
            </>
          )}
        </div>

        {/* Items grouped by what needs attention */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {stillNeeded.length > 0 && (
            <div>
              <p style={{ ...groupLabelStyle, color: GOLD, opacity: 0.75 }}>Still Needed</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {stillNeeded.map(renderItem)}
              </div>
            </div>
          )}
          {covered.length > 0 && (
            <div>
              <p style={{ ...groupLabelStyle, color: GREEN, opacity: 0.6 }}>Covered</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', opacity: 0.8 }}>
                {covered.map(renderItem)}
              </div>
            </div>
          )}
          {suggested.length > 0 && (
            <div>
              <p style={{ ...groupLabelStyle, color: LAVENDER, opacity: 0.65 }}>Suggested by Members</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {suggested.map(renderItem)}
              </div>
            </div>
          )}

          {/* Collaborative planning: suggest what the organizers haven't thought of */}
          {suggestListId === list.id ? (
            <div style={{
              padding: '1rem 1.25rem', borderRadius: '0.85rem',
              border: '1px dashed rgba(200,168,72,0.35)', background: 'rgba(200,168,72,0.04)',
            }}>
              <input
                autoFocus
                value={suggestName}
                onChange={e => setSuggestName(e.target.value)}
                placeholder="What should be on this list? (e.g. Sharp knives)"
                maxLength={80}
                style={{
                  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(200,168,72,0.25)', borderRadius: '0.5rem',
                  padding: '0.55rem 0.8rem', color: CREAM, fontSize: '0.85rem', outline: 'none',
                  fontFamily: 'inherit', marginBottom: '0.5rem',
                }}
              />
              <input
                value={suggestNote}
                onChange={e => setSuggestNote(e.target.value)}
                placeholder="Details (optional)"
                maxLength={200}
                style={{
                  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.5rem',
                  padding: '0.55rem 0.8rem', color: CREAM, fontSize: '0.8rem', outline: 'none',
                  fontFamily: 'inherit', marginBottom: '0.65rem',
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', opacity: 0.7, cursor: 'pointer', userSelect: 'none', marginBottom: '0.75rem' }}>
                <input type="checkbox" checked={suggestBring} onChange={e => setSuggestBring(e.target.checked)} style={{ accentColor: GOLD }} />
                I can bring one myself
              </label>
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setSuggestListId(null); setSuggestName(''); setSuggestNote(''); setSuggestBring(true) }}
                  style={{ padding: '0.4rem 0.9rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: CREAM, cursor: 'pointer', fontSize: '0.75rem', opacity: 0.7 }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitSuggestion(list.id)}
                  disabled={suggestBusy || !suggestName.trim()}
                  style={{ padding: '0.4rem 0.9rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.05em', opacity: suggestBusy || !suggestName.trim() ? 0.5 : 1 }}
                >
                  {suggestBusy ? 'Adding…' : 'Suggest it'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setSuggestListId(list.id); setSuggestName(''); setSuggestNote(''); setSuggestBring(true) }}
              style={{
                display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center',
                padding: '0.8rem 1.25rem', borderRadius: '0.85rem', cursor: 'pointer',
                border: '1px dashed rgba(200,168,72,0.3)', background: 'rgba(255,255,255,0.01)',
                color: GOLD, opacity: 0.65, fontSize: '0.78rem',
                letterSpacing: '0.05em', fontFamily: 'inherit',
              }}
            >
              Don&rsquo;t see something? ＋ Suggest a resource
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      {error && <p style={{ color: '#ff8a8a', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}

      {/* ── I'M BRINGING — my commitments, pinned up top ── */}
      {myCommitments.length > 0 && (
        <div style={{
          marginBottom: '2rem', borderRadius: '0.85rem', overflow: 'hidden',
          border: '1px solid rgba(210,57,248,0.35)', background: 'rgba(210,57,248,0.05)',
        }}>
          <div style={{ padding: '0.8rem 1.25rem 0.6rem', borderBottom: '1px solid rgba(210,57,248,0.15)' }}>
            <p style={{ margin: 0, fontSize: '0.66rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: PURPLE, opacity: 0.85 }}>
              I&rsquo;m Bringing
            </p>
          </div>
          <div style={{ padding: '0.5rem 1.25rem 0.75rem' }}>
            {myCommitments.map(({ item, listTitle }) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0' }}>
                <span style={{ color: GREEN, flexShrink: 0 }}>✓</span>
                <p style={{ flex: 1, margin: 0, fontSize: '0.85rem', color: CREAM, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}{item.mine > 1 ? ` ×${item.mine}` : ''}
                  <span style={{ opacity: 0.4, fontSize: '0.75rem' }}> — {listTitle}</span>
                </p>
                <button
                  onClick={() => jumpToItem(item.id)}
                  style={{ background: 'none', border: 'none', padding: 0, color: GOLD, opacity: 0.6, cursor: 'pointer', fontSize: '0.72rem', letterSpacing: '0.05em', fontFamily: 'inherit', flexShrink: 0 }}
                >
                  Edit ›
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {lists.map(renderList)}
      </div>
    </div>
  )
}
