'use client'

import { useState, useEffect, useRef } from 'react'
import { supabaseResizedUrl } from '@/lib/supabase-image'
import type { MemberOption } from './page'

type Conversation = {
  otherUserId: string
  displayName: string
  avatarUrl: string | null
  lastMessage: string
  lastMessageAt: string
  lastMessageFromMe: boolean
  unreadCount: number
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function Avatar({ avatarUrl, displayName, size = 44 }: { avatarUrl: string | null; displayName: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: '1px solid rgba(111,73,31,0.7)',
      background: 'rgba(200,168,72,0.08)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={supabaseResizedUrl(avatarUrl, size * 2) ?? ''} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontFamily: 'TokyoDreams, serif', fontSize: size * 0.4, color: '#C8A848', opacity: 0.6 }}>
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

function NewMessageModal({ members, onClose }: { members: MemberOption[]; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = query.trim()
    ? members.filter(m => m.displayName.toLowerCase().includes(query.toLowerCase()))
    : members

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(10,4,18,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(22,8,34,0.98)',
        border: '1px solid rgba(200,168,72,0.2)',
        borderRadius: '1.1rem',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{ padding: '1.1rem 1.25rem 0.85rem', borderBottom: '1px solid rgba(200,168,72,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1rem', color: '#C8A848' }}>New Message</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#F3EDE6', opacity: 0.4, cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0.1rem 0.3rem' }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(200,168,72,0.08)' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search members…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', padding: '0.55rem 0.75rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(200,168,72,0.18)',
              borderRadius: '0.6rem',
              color: '#F3EDE6', fontSize: '0.9rem',
              outline: 'none', boxSizing: 'border-box',
              fontFamily: 'var(--font-libre-baskerville), Georgia, serif',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(210,57,248,0.45)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(200,168,72,0.18)' }}
          />
        </div>

        {/* Member list */}
        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <p style={{ padding: '1.5rem 1.25rem', fontSize: '0.85rem', opacity: 0.4, fontStyle: 'italic', margin: 0, textAlign: 'center' }}>No members found</p>
          ) : (
            filtered.map(m => (
              <a
                key={m.userId}
                href={`/messages/${m.userId}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  padding: '0.75rem 1.25rem',
                  textDecoration: 'none', color: 'inherit',
                  borderBottom: '1px solid rgba(200,168,72,0.06)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <Avatar avatarUrl={m.avatarUrl} displayName={m.displayName} size={36} />
                <span style={{ fontFamily: 'TokyoDreams, serif', fontSize: '0.95rem', color: '#F3EDE6', opacity: 0.9 }}>
                  {m.displayName}
                </span>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function MessagesInboxClient({ currentUserId, members }: { currentUserId: string; members: MemberOption[] }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewMessage, setShowNewMessage] = useState(false)

  useEffect(() => {
    fetch('/api/messages')
      .then(r => r.json())
      .then(d => {
        setConversations(d.conversations ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      {/* New Message button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setShowNewMessage(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.5rem 1.1rem',
            background: 'rgba(210,57,248,0.12)',
            border: '1px solid rgba(210,57,248,0.35)',
            borderRadius: '9999px',
            color: '#D239F8',
            fontSize: '0.8rem',
            fontFamily: 'TokyoDreams, serif',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(210,57,248,0.2)'; e.currentTarget.style.borderColor = 'rgba(210,57,248,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(210,57,248,0.12)'; e.currentTarget.style.borderColor = 'rgba(210,57,248,0.35)' }}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>✉</span>
          New Message
        </button>
      </div>

      {/* Conversation list */}
      {loading ? (
        <p style={{ textAlign: 'center', opacity: 0.4, fontStyle: 'italic', fontSize: '0.9rem' }}>Loading…</p>
      ) : conversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <p style={{ fontSize: '0.9rem', opacity: 0.4, fontStyle: 'italic', marginBottom: '1.5rem' }}>
            No messages yet.
          </p>
          <button
            onClick={() => setShowNewMessage(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', color: '#C8A848', letterSpacing: '0.06em', opacity: 0.8,
              textDecoration: 'underline', textUnderlineOffset: '3px',
            }}
          >
            Start a conversation →
          </button>
        </div>
      ) : (
        conversations.map(conv => (
          <a
            key={conv.otherUserId}
            href={`/messages/${conv.otherUserId}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1rem 1.25rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(200,168,72,0.12)',
              borderRadius: '0.85rem',
              textDecoration: 'none', color: 'inherit',
              transition: 'border-color 0.2s, background 0.2s',
              marginBottom: '0.75rem',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.35)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,168,72,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          >
            <Avatar avatarUrl={conv.avatarUrl} displayName={conv.displayName} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                <span style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1rem', color: conv.unreadCount > 0 ? '#C8A848' : '#F3EDE6', opacity: conv.unreadCount > 0 ? 1 : 0.85 }}>
                  {conv.displayName}
                </span>
                <span style={{ fontSize: '0.7rem', opacity: 0.35, flexShrink: 0, marginLeft: '0.75rem' }}>
                  {timeAgo(conv.lastMessageAt)}
                </span>
              </div>
              <p style={{
                margin: 0, fontSize: '0.82rem',
                opacity: conv.unreadCount > 0 ? 0.75 : 0.4,
                fontWeight: conv.unreadCount > 0 ? 600 : 400,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {conv.lastMessageFromMe ? 'You: ' : ''}{conv.lastMessage}
              </p>
            </div>
            {conv.unreadCount > 0 && (
              <div style={{
                minWidth: '20px', height: '20px', borderRadius: '9999px',
                background: '#D239F8', color: '#fff',
                fontSize: '0.65rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 5px', flexShrink: 0,
              }}>
                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
              </div>
            )}
          </a>
        ))
      )}

      {/* New Message modal */}
      {showNewMessage && (
        <NewMessageModal members={members} onClose={() => setShowNewMessage(false)} />
      )}
    </>
  )
}
