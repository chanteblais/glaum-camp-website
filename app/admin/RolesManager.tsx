'use client'

import { useState, useEffect } from 'react'

type Role = {
  id: string
  name: string
  description: string | null
  capacity: number
  sort_order: number
  signed_up?: number
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,168,72,0.2)',
  borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#F3EDE6', fontSize: '0.875rem',
  fontFamily: 'var(--font-libre-baskerville), Georgia, serif', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase',
  color: '#C8A848', opacity: 0.65, display: 'block', marginBottom: '0.35rem',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>
}

function blankRole(): Omit<Role, 'id' | 'sort_order' | 'signed_up'> {
  return { name: '', description: '', capacity: 1 }
}

function RoleModal({
  initial,
  onSave,
  onClose,
  saving,
  error,
}: {
  initial: Omit<Role, 'id' | 'sort_order' | 'signed_up'>
  onSave: (form: Omit<Role, 'id' | 'sort_order' | 'signed_up'>) => void
  onClose: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof typeof form, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 51, background: '#1a1410', border: '1px solid rgba(200,168,72,0.25)',
        borderRadius: '1rem', padding: '2rem', width: '90%', maxWidth: '500px',
      }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', marginBottom: '1.5rem' }}>
          {initial.name ? 'Edit Role' : 'New Role'}
        </p>

        <Field label="Role Name">
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Kitchen Crew" />
        </Field>

        <Field label="Description">
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            value={form.description ?? ''}
            onChange={e => set('description', e.target.value)}
            placeholder="Brief description of what this role involves"
          />
        </Field>

        <Field label="Capacity (max campers)">
          <input
            style={inputStyle}
            type="number"
            min={1}
            value={form.capacity}
            onChange={e => set('capacity', parseInt(e.target.value) || 1)}
          />
        </Field>

        {error && <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7 }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.05em', opacity: saving || !form.name ? 0.4 : 1 }}
          >
            {saving ? 'Saving…' : 'Save role'}
          </button>
        </div>
      </div>
    </>
  )
}

export function RolesManager() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Role | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/roles')
      .then(r => r.json())
      .then(d => setRoles(d.roles ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(form: Omit<Role, 'id' | 'sort_order' | 'signed_up'>) {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sort_order: roles.length }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setRoles(prev => [...prev, data.role])
    setCreating(false)
    setSaving(false)
  }

  async function handleUpdate(role: Role, form: Omit<Role, 'id' | 'sort_order' | 'signed_up'>) {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/roles/${role.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setRoles(prev => prev.map(r => r.id === role.id ? { ...r, ...data.role } : r))
    setEditing(null)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this role? Any campers signed up for it will lose their role assignment.')) return
    const res = await fetch(`/api/admin/roles/${id}`, { method: 'DELETE' })
    if (res.ok) setRoles(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return <p style={{ opacity: 0.4, fontSize: '0.85rem' }}>Loading…</p>

  return (
    <div>
      {roles.length === 0 && (
        <p style={{ opacity: 0.4, fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '1.5rem' }}>No roles yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {roles.map(role => (
          <div key={role.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.85rem 1rem', borderRadius: '0.65rem',
            border: '1px solid rgba(200,168,72,0.12)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.9rem', color: '#F3EDE6', margin: 0 }}>{role.name}</p>
              {role.description && (
                <p style={{ fontSize: '0.78rem', opacity: 0.45, margin: '0.2rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role.description}</p>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#C8A848', opacity: 0.6, flexShrink: 0 }}>
              cap. {role.capacity}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              <button
                onClick={() => { setEditing(role); setError(null) }}
                style={{ background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.7 }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(role.id)}
                style={{ background: 'none', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '0.4rem', color: '#ff8a8a', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.7 }}
              >
                Del
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => { setCreating(true); setError(null) }}
        style={{ padding: '0.6rem 1.4rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.3)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.05em' }}
      >
        + Add role
      </button>

      {creating && (
        <RoleModal
          initial={blankRole()}
          onSave={handleCreate}
          onClose={() => setCreating(false)}
          saving={saving}
          error={error}
        />
      )}

      {editing && (
        <RoleModal
          initial={{ name: editing.name, description: editing.description, capacity: editing.capacity }}
          onSave={(form) => handleUpdate(editing, form)}
          onClose={() => setEditing(null)}
          saving={saving}
          error={error}
        />
      )}
    </div>
  )
}
