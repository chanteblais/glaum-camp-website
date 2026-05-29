'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  application_id: string | null
  event_type: string
  message: string
  details: { email?: string; reason?: string; changes?: Record<string, unknown> } | null
  created_at: string
  read_at: string | null
}

export function NotificationsSection({
  initialNotifications,
}: {
  initialNotifications: Notification[]
}) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [dismissing, setDismissing] = useState(false)

  const unread = notifications.filter((n) => !n.read_at)

  const dismissAll = async () => {
    setDismissing(true)
    try {
      await fetch('/api/admin/notifications', { method: 'PATCH' })
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
      router.refresh()
    } finally {
      setDismissing(false)
    }
  }

  if (notifications.length === 0) return null

  return (
    <div
      style={{
        marginBottom: '2.5rem',
        padding: '1.25rem 1.5rem',
        border: '1px solid rgba(210,57,248,0.25)',
        borderRadius: '0.85rem',
        background: 'rgba(210,57,248,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D239F8', margin: 0 }}>
          {unread.length > 0 ? `${unread.length} new update${unread.length === 1 ? '' : 's'}` : 'Recent updates'}
        </p>
        {unread.length > 0 && (
          <button
            type="button"
            onClick={dismissAll}
            disabled={dismissing}
            style={{
              border: '1px solid rgba(200,168,72,0.25)',
              background: 'transparent',
              color: '#C8A848',
              borderRadius: '9999px',
              padding: '0.35rem 0.85rem',
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            {dismissing ? 'Clearing…' : 'Mark all read'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {notifications.slice(0, 8).map((n) => {
          const when = new Date(n.created_at).toLocaleString('en-CA', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
          const isUnread = !n.read_at

          return (
            <div
              key={n.id}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '0.65rem',
                border: `1px solid ${isUnread ? 'rgba(210,57,248,0.35)' : 'rgba(200,168,72,0.12)'}`,
                background: isUnread ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '0.88rem', margin: 0, opacity: isUnread ? 1 : 0.75 }}>{n.message}</p>
                <span style={{ fontSize: '0.72rem', opacity: 0.45, flexShrink: 0 }}>{when}</span>
              </div>
              {n.details?.email && (
                <p style={{ fontSize: '0.75rem', opacity: 0.5, margin: '0.35rem 0 0' }}>{n.details.email}</p>
              )}
              {n.event_type === 'attendance_cancelled' && n.details?.reason && (
                <p style={{ fontSize: '0.8rem', opacity: 0.65, margin: '0.5rem 0 0', fontStyle: 'italic' }}>
                  Reason: {n.details.reason}
                </p>
              )}
              {n.application_id && (
                <a
                  href={`/admin/${n.application_id}`}
                  style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', color: '#C8A848', opacity: 0.8 }}
                >
                  View application →
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
