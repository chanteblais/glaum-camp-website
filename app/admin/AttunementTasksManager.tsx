'use client'

import { useCallback, useRef, useState } from 'react'
import {
  ATTUNEMENT_REQUIREMENTS,
  type AttunementRequirement,
  type AttunementTask,
} from '@/lib/site-config'

const GOLD = '#C8A848'
const PURPLE = '#D239F8'
const CREAM = '#F3EDE6'

function reqHint(requirement: AttunementRequirement): string {
  return ATTUNEMENT_REQUIREMENTS.find(r => r.value === requirement)?.hint ?? ''
}

export function AttunementTasksManager({ initialTasks }: { initialTasks: AttunementTask[] }) {
  const [tasks, setTasks] = useState<AttunementTask[]>(initialTasks)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback((next: AttunementTask[]) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/admin/page-content', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config_attunement_tasks: JSON.stringify(next) }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setError(d.error ?? 'Failed to save')
          setSaved(false)
        } else {
          setError(null)
          setSaved(true)
          setTimeout(() => setSaved(false), 1800)
        }
      } catch {
        setError('Network error')
        setSaved(false)
      }
    }, 600)
  }, [])

  function update(next: AttunementTask[]) {
    setTasks(next)
    save(next)
  }

  return (
    <div>
      <p style={{ fontSize: '0.78rem', opacity: 0.5, lineHeight: 1.6, margin: '0 0 1.25rem' }}>
        These items make up the <strong style={{ opacity: 0.8 }}>Attunement Status</strong> checklist on each
        member&rsquo;s profile. Every item auto-completes when the member meets its requirement — pick the
        requirement from the dropdown. Disabled items are hidden from members.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
        {tasks.length === 0 && (
          <p style={{ textAlign: 'center', opacity: 0.4, fontStyle: 'italic', fontSize: '0.82rem', padding: '1rem 0' }}>
            No attunement tasks. The checklist is hidden from members until you add one.
          </p>
        )}

        {tasks.map((task, idx) => (
          <div
            key={task.id}
            style={{
              border: '1px solid rgba(200,168,72,0.15)',
              borderRadius: '0.75rem',
              background: 'rgba(200,168,72,0.02)',
              padding: '0.85rem 1rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              opacity: task.enabled ? 1 : 0.55,
            }}
          >
            {/* Enable toggle */}
            <button
              onClick={() => update(tasks.map((t, i) => i === idx ? { ...t, enabled: !t.enabled } : t))}
              aria-pressed={task.enabled}
              title={task.enabled ? 'Shown to members' : 'Hidden from members'}
              style={{
                width: '40px', height: '22px', borderRadius: '9999px', flexShrink: 0, marginTop: '0.15rem',
                border: 'none', cursor: 'pointer',
                background: task.enabled ? GOLD : 'rgba(255,255,255,0.12)',
                transition: 'background 0.2s', position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: '3px', left: task.enabled ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: task.enabled ? '#1A0A24' : 'rgba(255,255,255,0.5)',
                transition: 'left 0.2s',
              }} />
            </button>

            {/* Label + requirement */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 }}>
              <input
                value={task.label}
                onChange={e => update(tasks.map((t, i) => i === idx ? { ...t, label: e.target.value } : t))}
                placeholder="Label (e.g. Role Selected)"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid rgba(200,168,72,0.2)',
                  color: CREAM, fontSize: '0.85rem', outline: 'none',
                  padding: '0 0 0.15rem', fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.65rem', opacity: 0.4, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  Completes when
                </span>
                <select
                  value={task.requirement}
                  onChange={e => update(tasks.map((t, i) => i === idx ? { ...t, requirement: e.target.value as AttunementRequirement } : t))}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,168,72,0.2)',
                    borderRadius: '0.3rem', color: CREAM, fontSize: '0.75rem',
                    padding: '0.2rem 0.4rem', outline: 'none', fontFamily: 'inherit',
                  }}
                >
                  {ATTUNEMENT_REQUIREMENTS.map(r => (
                    <option key={r.value} value={r.value} style={{ background: '#1A0A24' }}>{r.label}</option>
                  ))}
                </select>
              </div>
              <p style={{ fontSize: '0.68rem', opacity: 0.35, margin: 0, fontStyle: 'italic' }}>
                {reqHint(task.requirement)}
              </p>
            </div>

            {/* Move + delete */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
              <button
                onClick={() => {
                  if (idx === 0) return
                  const next = [...tasks]
                  ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                  update(next)
                }}
                disabled={idx === 0}
                title="Move up"
                style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: GOLD, opacity: idx === 0 ? 0.2 : 0.5, fontSize: '0.75rem', padding: '0.1rem' }}
              >▲</button>
              <button
                onClick={() => {
                  if (idx === tasks.length - 1) return
                  const next = [...tasks]
                  ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
                  update(next)
                }}
                disabled={idx === tasks.length - 1}
                title="Move down"
                style={{ background: 'none', border: 'none', cursor: idx === tasks.length - 1 ? 'default' : 'pointer', color: GOLD, opacity: idx === tasks.length - 1 ? 0.2 : 0.5, fontSize: '0.75rem', padding: '0.1rem' }}
              >▼</button>
              <button
                onClick={() => {
                  if (!window.confirm(`Remove "${task.label}"?`)) return
                  update(tasks.filter((_, i) => i !== idx))
                }}
                title="Remove"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff8a8a', opacity: 0.45, fontSize: '0.8rem', padding: '0.1rem', marginTop: '0.15rem' }}
              >✕</button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => update([
          ...tasks,
          { id: `task-${Date.now()}`, label: 'New task', requirement: 'role', enabled: true },
        ])}
        style={{
          width: '100%', padding: '0.65rem',
          border: '1px dashed rgba(210,57,248,0.25)',
          borderRadius: '0.75rem', background: 'transparent',
          color: PURPLE, fontSize: '0.8rem', letterSpacing: '0.08em',
          cursor: 'pointer', opacity: 0.6,
        }}
      >+ Add attunement task</button>

      <div style={{ minHeight: '1.2rem', marginTop: '0.75rem' }}>
        {error && <p style={{ fontSize: '0.78rem', color: '#ff8a8a', margin: 0 }}>{error}</p>}
        {!error && saved && <p style={{ fontSize: '0.72rem', color: GOLD, opacity: 0.6, margin: 0 }}>Saved ✓</p>}
      </div>
    </div>
  )
}
