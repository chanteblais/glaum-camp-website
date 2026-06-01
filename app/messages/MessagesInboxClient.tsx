'use client'

import { useState, useEffect } from 'react'
import { supabaseResizedUrl } from '@/lib/supabase-image'

type Conversation = {
  otherUserId: string
  displayName: string
  avatarUrl: string | null
  lastMessage: string
  lastMessageAt: string
  lastMessageFromMe: boolean
  unreadCount: number
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '1rem 1.25rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(200,168,72,0.12)',
  borderRadius: '0.85rem',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'border-color 0.2s, background 0.2s',
  cursor: 'pointer',
  marginBottom: '0.75rem',
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

export function MessagesInboxClient({ currentUserId }: { currentUserId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/messages')
      .then(r => r.json())
      .then(d => {
        setConversations(d.conversations ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <p style={{ textAlign: 'center', opacity: 0.4, fontStyle: 'italic', fontSize: '0.9rem' }}>Loading…</p>
  )

  if (conversations.length === 0) return (
    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
      <p style={{ fontSize: '0.9rem', opacity: 0.4, fontStyle: 'italic', marginBottom: '1.5rem' }}>
        No messages yet.
      </p>
      <a href="/members" style={{ fontSize: '0.82rem', color: '#C8A848', textDecoration: 'none', letterSpacing: '0.06em', opacity: 0.8 }}>
        Browse Many Hands to find someone to message →
      </a>
    </div>
  )

  return (
    <div>
      {conversations.map(conv => {
        const initials = conv.displayName.charAt(0).toUpperCase()
        return (
          <a
            key={conv.otherUserId}
            href={`/messages/${conv.otherUserId}`}
            style={cardStyle}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.borderColor = 'rgba(200,168,72,0.35)'
              el.style.background = 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.borderColor = 'rgba(200,168,72,0.12)'
              el.style.background = 'rgba(255,255,255,0.03)'
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
              border: '1px solid rgba(111,73,31,0.7)',
              background: 'rgba(200,168,72,0.08)',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {conv.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={supabaseResizedUrl(conv.avatarUrl, 88) ?? ''} alt={conv.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', opacity: 0.6 }}>{initials}</span>
              )}
            </div>

            {/* Content */}
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

            {/* Unread badge */}
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
        )
      })}
    </div>
  )
}
