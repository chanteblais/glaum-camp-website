'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type ResourceItem = {
  id: string
  name: string
  note: string | null
  // NULL = an open offer (no set target) — someone listed gear that wasn't asked for.
  needed: number | null
  claimed: number
  mine: number
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

export function ResourceCommitments() {
  const router = useRouter()
  const [lists, setLists] = useState<ResourceList[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Inline "Offer it" form — open on at most one list at a time.
  const [offerListId, setOfferListId] = useState<string | null>(null)
  const [offerName, setOfferName] = useState('')
  const [offerNote, setOfferNote] = useState('')
  const [offerBusy, setOfferBusy] = useState(false)

  const load = () =>
    fetch('/api/resources')
      .then(r => r.json())
      .then(d => setLists(d.lists ?? []))
      .catch(() => setLists([]))

  useEffect(() => { load() }, [])

  // Set my claim to `quantity` (0 = unclaim), optimistically adjusting both
  // my count and the community total by the delta.
  async function setClaim(item: ResourceItem, quantity: number) {
    const qty = Math.min(99, Math.max(0, quantity))
    if (qty === item.mine) return
    const delta = qty - item.mine
    setBusyId(item.id)
    setError(null)
    setLists(prev => prev?.map(l => ({
      ...l,
      items: l.items.map(i => i.id === item.id ? { ...i, mine: qty, claimed: i.claimed + delta } : i),
    })) ?? prev)

    const res = await fetch('/api/resources/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource_id: item.id, quantity: qty }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Could not update. Try again.')
      // Revert
      setLists(prev => prev?.map(l => ({
        ...l,
        items: l.items.map(i => i.id === item.id ? { ...i, mine: item.mine, claimed: i.claimed - delta } : i),
      })) ?? prev)
    } else {
      // Retracting your own offer may delete the listing server-side — refetch
      // so the row disappears (or stays, if others piled on) truthfully.
      if (item.offered_by_me && qty === 0) await load()
      // Refresh server components (profile commitments card) on next nav.
      router.refresh()
    }
    setBusyId(null)
  }

  async function submitOffer(listId: string) {
    if (!offerName.trim()) return
    setOfferBusy(true)
    setError(null)
    const res = await fetch('/api/resources/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: listId, name: offerName, note: offerNote }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Could not add your offer. Try again.')
    } else {
      setOfferListId(null)
      setOfferName('')
      setOfferNote('')
      await load()
      router.refresh()
    }
    setOfferBusy(false)
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

  const stepBtn: React.CSSProperties = {
    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
    border: `1px solid rgba(210,57,248,0.45)`, background: 'rgba(210,57,248,0.1)',
    color: '#D239F8', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }

  const renderItem = (item: ResourceItem) => {
    const busy = busyId === item.id
    const isOffer = item.needed === null
    const met = !isOffer && item.claimed >= (item.needed as number)
    const claimedByMe = item.mine > 0
    const statusLine = isOffer
      ? [
          `Offered by ${item.offered_by_me ? 'you' : item.offered_by_name ?? 'a member'}`,
          item.claimed > 1 ? `${item.claimed} offered` : null,
        ].filter(Boolean).join(' · ')
      : `${met ? '✓ ' : ''}${item.claimed} of ${item.needed} committed${claimedByMe ? ` · you're bringing ${item.mine}` : ''}`
    return (
      <div
        key={item.id}
        style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '0.85rem 1.25rem', borderRadius: '0.85rem',
          border: `1px solid ${claimedByMe ? 'rgba(210,57,248,0.45)' : 'rgba(200,168,72,0.18)'}`,
          background: claimedByMe ? 'rgba(210,57,248,0.08)' : 'rgba(255,255,255,0.02)',
          transition: 'border-color 0.15s, background 0.15s', opacity: busy ? 0.6 : 1,
        }}
      >
        {/* Name + note + progress */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#F3EDE6', fontWeight: 600 }}>{item.name}</p>
          {item.note && (
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', opacity: 0.5, lineHeight: 1.5 }}>{item.note}</p>
          )}
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: met ? GREEN : isOffer ? '#D9B8E8' : GOLD, opacity: 0.85, letterSpacing: '0.04em', fontStyle: isOffer ? 'italic' : 'normal' }}>
            {statusLine}
          </p>
        </div>

        {/* Claim control */}
        {claimedByMe ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
            <button style={stepBtn} disabled={busy} onClick={() => setClaim(item, item.mine - 1)} aria-label="Bring one fewer">−</button>
            <span style={{ fontSize: '0.85rem', color: '#D239F8', minWidth: '1.2rem', textAlign: 'center' }}>{item.mine}</span>
            <button style={stepBtn} disabled={busy} onClick={() => setClaim(item, item.mine + 1)} aria-label="Bring one more">+</button>
          </div>
        ) : (
          <button
            disabled={busy}
            onClick={() => setClaim(item, 1)}
            style={{
              flexShrink: 0, fontSize: '0.7rem', letterSpacing: '0.08em', padding: '0.35rem 0.85rem',
              borderRadius: '9999px', whiteSpace: 'nowrap', cursor: busy ? 'wait' : 'pointer',
              border: `1px solid rgba(200,168,72,0.3)`, color: GOLD, background: 'transparent',
              // Met needs stay claimable (extras welcome) but recede.
              opacity: met ? 0.55 : 1,
            }}
          >
            + I&rsquo;ll bring one
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      {error && <p style={{ color: '#ff8a8a', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {lists.map(list => (
          <div key={list.id}>
            <p style={{
              margin: '0 0 0.2rem', fontSize: '1.15rem', letterSpacing: '0.05em',
              color: GOLD, opacity: 0.9, fontFamily: 'TokyoDreams, serif',
            }}>
              {list.title}
            </p>
            {(list.description || list.steward_name) && (
              <p style={{ margin: '0 0 0.85rem', fontSize: '0.78rem', opacity: 0.45, lineHeight: 1.5 }}>
                {[list.description, list.steward_name ? `Stewarded by ${list.steward_name}` : null].filter(Boolean).join(' · ')}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: list.description || list.steward_name ? 0 : '0.65rem' }}>
              {list.items.map(renderItem)}
            </div>

            {/* Open-ended offers: list gear that isn't asked for */}
            {offerListId === list.id ? (
              <div style={{
                marginTop: '0.75rem', padding: '1rem 1.25rem', borderRadius: '0.85rem',
                border: '1px dashed rgba(200,168,72,0.35)', background: 'rgba(200,168,72,0.04)',
              }}>
                <input
                  autoFocus
                  value={offerName}
                  onChange={e => setOfferName(e.target.value)}
                  placeholder="What do you have? (e.g. Guitar amp)"
                  maxLength={80}
                  style={{
                    width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(200,168,72,0.25)', borderRadius: '0.5rem',
                    padding: '0.55rem 0.8rem', color: '#F3EDE6', fontSize: '0.85rem', outline: 'none',
                    fontFamily: 'inherit', marginBottom: '0.5rem',
                  }}
                />
                <input
                  value={offerNote}
                  onChange={e => setOfferNote(e.target.value)}
                  placeholder="Details (optional)"
                  maxLength={200}
                  style={{
                    width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.5rem',
                    padding: '0.55rem 0.8rem', color: '#F3EDE6', fontSize: '0.8rem', outline: 'none',
                    fontFamily: 'inherit', marginBottom: '0.75rem',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setOfferListId(null); setOfferName(''); setOfferNote('') }}
                    style={{ padding: '0.4rem 0.9rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.7 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submitOffer(list.id)}
                    disabled={offerBusy || !offerName.trim()}
                    style={{ padding: '0.4rem 0.9rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.05em', opacity: offerBusy || !offerName.trim() ? 0.5 : 1 }}
                  >
                    {offerBusy ? 'Adding…' : "Offer it — I'll bring it"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setOfferListId(list.id); setOfferName(''); setOfferNote('') }}
                style={{
                  marginTop: '0.75rem', background: 'none', border: 'none', padding: 0,
                  color: GOLD, opacity: 0.6, cursor: 'pointer', fontSize: '0.75rem',
                  letterSpacing: '0.05em', fontFamily: 'inherit',
                }}
              >
                Have something that fits? ＋ Offer it
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
