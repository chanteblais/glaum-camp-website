'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

type Group = {
  id: string
  name: string
  description: string | null
  icon: string | null
  badge_image: string | null
  apply_selectable: boolean
  sort_order: number
  join_policy: string
  visibility: string
  member_count: number
}

type RosterMember = {
  clerk_user_id: string
  source: string
  first_name: string | null
  last_name: string | null
  preferred_name: string | null
  email: string | null
  status: string | null
}

// Approved members available to assign, passed from the admin page.
export type AssignableMember = {
  clerk_user_id: string
  displayName: string
  email: string
}

type GroupForm = { name: string; description: string; icon: string; join_policy: string; visibility: string }

const selectStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,168,72,0.2)',
  borderRadius: '0.5rem', padding: '0.55rem 0.85rem', color: '#F3EDE6', fontSize: '0.85rem',
  fontFamily: 'var(--font-libre-baskerville), Georgia, serif', outline: 'none', boxSizing: 'border-box',
}

const GOLD = '#C8A848'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,168,72,0.2)',
  borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#F3EDE6', fontSize: '0.875rem',
  fontFamily: 'var(--font-libre-baskerville), Georgia, serif', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase',
  color: GOLD, opacity: 0.65, display: 'block', marginBottom: '0.35rem',
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={labelStyle}>{label}</label>
      {hint && <p style={{ fontSize: '0.72rem', opacity: 0.4, marginBottom: '0.4rem' }}>{hint}</p>}
      {children}
    </div>
  )
}

// ── Badge image upload ──────────────────────────────────────────────────────
// Optional per-group badge image, rendered scattered on the member profile.
// Uploads immediately (persists server-side) and reports the new URL upward so
// the group row stays in sync.

function BadgeField({ groupId, initial, onChange }: {
  groupId: string
  initial: string | null
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true); setErr(null)
    const fd = new FormData()
    fd.append('badge', file)
    const res = await fetch(`/api/admin/groups/${groupId}/badge`, { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(data.error ?? 'Upload failed'); setBusy(false); return }
    setPreview(data.badge_image)
    onChange(data.badge_image)
    setBusy(false)
  }

  async function remove() {
    setBusy(true); setErr(null)
    const res = await fetch(`/api/admin/groups/${groupId}/badge`, { method: 'DELETE' })
    if (res.ok) { setPreview(null); onChange(null) }
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Field label="Badge image (optional)" hint="A patch-style image shown scattered on members' profiles. PNG with transparency works best.">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: '0.5rem', border: '1px solid rgba(200,168,72,0.2)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {preview
            ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <span style={{ fontSize: '0.6rem', opacity: 0.35, textAlign: 'center' }}>none</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} style={{ padding: '0.4rem 0.9rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.3)', background: 'transparent', color: '#FFFACD', cursor: busy ? 'wait' : 'pointer', fontSize: '0.78rem', opacity: busy ? 0.5 : 1 }}>
            {busy ? 'Uploading…' : preview ? 'Replace image' : 'Upload image'}
          </button>
          {preview && (
            <button type="button" onClick={remove} disabled={busy} style={{ padding: '0.3rem 0.9rem', borderRadius: '9999px', border: '1px solid rgba(255,80,80,0.2)', background: 'transparent', color: '#ff8a8a', cursor: 'pointer', fontSize: '0.72rem', opacity: 0.8 }}>
              Remove
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/webp,image/svg+xml,image/jpeg,image/gif" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
      </div>
      {err && <p style={{ color: '#ff8a8a', fontSize: '0.75rem', marginTop: '0.4rem' }}>{err}</p>}
    </Field>
  )
}

// ── Group Modal ───────────────────────────────────────────────────────────────

function GroupModal({
  initial, isNew, onSave, onClose, saving, error, groupId, initialBadge, onBadgeChange,
}: {
  initial: GroupForm
  isNew: boolean
  onSave: (f: GroupForm) => void
  onClose: () => void
  saving: boolean
  error: string | null
  groupId?: string
  initialBadge?: string | null
  onBadgeChange?: (url: string | null) => void
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof GroupForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 51, background: '#1a1410', border: '1px solid rgba(200,168,72,0.25)', borderRadius: '1rem', padding: '2rem', width: '90%', maxWidth: '480px' }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: GOLD, marginBottom: '1.5rem' }}>
          {isNew ? 'New Group' : 'Edit Group'}
        </p>
        <Field label="Name">
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Setup" maxLength={40} />
        </Field>
        <Field label="Description (optional)">
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What is this group for? Shown to applicants when offered on the form." />
        </Field>
        <Field label="Icon (optional — emoji)">
          <input style={inputStyle} value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="e.g. ⚒️" />
        </Field>
        <Field label="Who can join" hint="Admin-assigned: only admins manage members. Open: members can join/leave themselves from the Messages → Find a group picker.">
          <select style={selectStyle} value={form.join_policy} onChange={e => set('join_policy', e.target.value)}>
            <option value="admin_assigned">Admin-assigned (admins manage membership)</option>
            <option value="open">Open (members can self-join &amp; leave)</option>
          </select>
        </Field>
        <Field label="Visibility" hint="Listed: open groups appear in the Find-a-group picker. Hidden: invite/admin-add only, not discoverable.">
          <select style={selectStyle} value={form.visibility} onChange={e => set('visibility', e.target.value)}>
            <option value="listed">Listed (discoverable)</option>
            <option value="hidden">Hidden (invite / admin-add only)</option>
          </select>
        </Field>
        {groupId
          ? <BadgeField groupId={groupId} initial={initialBadge ?? null} onChange={url => onBadgeChange?.(url)} />
          : <p style={{ fontSize: '0.72rem', opacity: 0.4, lineHeight: 1.5, marginBottom: '1rem' }}>
              Save the group first, then re-open it to add a badge image.
            </p>}
        <p style={{ fontSize: '0.72rem', opacity: 0.4, lineHeight: 1.5, marginBottom: '1.25rem' }}>
          To let applicants opt into groups, add a <strong style={{ opacity: 0.8 }}>Group selection</strong> field in the Application Builder and choose which groups it offers.
        </p>
        {error && <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7 }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', opacity: saving || !form.name ? 0.4 : 1 }}>
            {saving ? 'Saving…' : 'Save group'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Roster (member assignment) ─────────────────────────────────────────────────

function Roster({ groupId, members }: { groupId: string; members: AssignableMember[] }) {
  const [roster, setRoster] = useState<RosterMember[] | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/groups/${groupId}/members`)
      .then(r => r.json())
      .then(d => setRoster(d.members ?? []))
      .catch(() => setRoster([]))
  }, [groupId])

  const inGroup = useMemo(() => new Set((roster ?? []).map(m => m.clerk_user_id)), [roster])

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members
      .filter(m => !inGroup.has(m.clerk_user_id))
      .filter(m => !q || m.displayName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .slice(0, 8)
  }, [members, inGroup, query])

  async function add(m: AssignableMember) {
    setBusy(true)
    const res = await fetch(`/api/admin/groups/${groupId}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerk_user_id: m.clerk_user_id }),
    })
    if (res.ok) {
      setRoster(prev => [...(prev ?? []), {
        clerk_user_id: m.clerk_user_id, source: 'admin',
        first_name: m.displayName, last_name: null, preferred_name: null, email: m.email, status: 'approved',
      }])
      setQuery('')
    }
    setBusy(false)
  }

  async function remove(clerkId: string) {
    setBusy(true)
    const res = await fetch(`/api/admin/groups/${groupId}/members?clerk_user_id=${encodeURIComponent(clerkId)}`, { method: 'DELETE' })
    if (res.ok) setRoster(prev => (prev ?? []).filter(m => m.clerk_user_id !== clerkId))
    setBusy(false)
  }

  if (roster === null) return <p style={{ fontSize: '0.8rem', opacity: 0.4, padding: '0.5rem 0' }}>Loading roster…</p>

  return (
    <div>
      {roster.length === 0 ? (
        <p style={{ fontSize: '0.82rem', opacity: 0.35, fontStyle: 'italic', margin: '0 0 0.85rem' }}>No members yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem' }}>
          {roster.map(m => {
            const name = m.preferred_name || m.first_name || m.email || m.clerk_user_id
            return (
              <div key={m.clerk_user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(200,168,72,0.08)' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.85rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                  {m.email && <p style={{ fontSize: '0.7rem', opacity: 0.4, margin: 0 }}>{m.email}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  {m.source === 'application' && <span style={{ fontSize: '0.6rem', color: GOLD, opacity: 0.55, border: '1px solid rgba(200,168,72,0.2)', borderRadius: '9999px', padding: '0.1rem 0.4rem' }} title="Opted in on their application">opted in</span>}
                  {m.status && m.status !== 'approved' && <span style={{ fontSize: '0.6rem', color: '#ffb432', opacity: 0.8 }}>{m.status}</span>}
                  <button onClick={() => remove(m.clerk_user_id)} disabled={busy} style={{ background: 'none', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '0.4rem', color: '#ff8a8a', cursor: 'pointer', padding: '0.15rem 0.45rem', fontSize: '0.65rem', opacity: 0.7 }}>Remove</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add member */}
      <input
        style={{ ...inputStyle, fontSize: '0.82rem' }}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Add a member — type a name or email…"
      />
      {query.trim() && (
        <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {candidates.length === 0 ? (
            <p style={{ fontSize: '0.75rem', opacity: 0.35, fontStyle: 'italic', padding: '0.25rem 0' }}>No matching approved members.</p>
          ) : candidates.map(m => (
            <button key={m.clerk_user_id} onClick={() => add(m)} disabled={busy} style={{ textAlign: 'left', background: 'rgba(200,168,72,0.04)', border: '1px solid rgba(200,168,72,0.12)', borderRadius: '0.4rem', color: '#F3EDE6', cursor: 'pointer', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}>
              + {m.displayName} <span style={{ opacity: 0.4 }}>· {m.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Group Row ───────────────────────────────────────────────────────────────

function GroupRow({
  group, members, isDragOver, onEdit, onDelete, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  group: Group
  members: AssignableMember[]
  isDragOver: boolean
  onEdit: () => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        borderRadius: '0.75rem',
        border: isDragOver ? '1px solid rgba(200,168,72,0.5)' : '1px solid rgba(200,168,72,0.18)',
        background: isDragOver ? 'rgba(200,168,72,0.05)' : 'rgba(255,255,255,0.02)',
        transition: 'border-color 0.15s, background 0.15s', overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', cursor: 'grab', background: 'rgba(200,168,72,0.06)', borderBottom: open ? '1px solid rgba(200,168,72,0.12)' : 'none' }}>
        <span style={{ color: GOLD, opacity: 0.25, fontSize: '1rem', userSelect: 'none', flexShrink: 0 }}>⠿</span>
        {group.icon && <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{group.icon}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.92rem', color: '#F3EDE6', margin: 0, fontWeight: 600 }}>{group.name}</p>
          {group.description && (
            <p style={{ fontSize: '0.77rem', opacity: 0.45, margin: '0.15rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.description}</p>
          )}
        </div>
        {group.join_policy === 'open' && (
          <span title="Members can self-join" style={{ fontSize: '0.6rem', color: '#7fd1a0', opacity: 0.85, border: '1px solid rgba(127,209,160,0.3)', borderRadius: '9999px', padding: '0.1rem 0.45rem', flexShrink: 0, letterSpacing: '0.05em' }}>OPEN</span>
        )}
        {group.visibility === 'hidden' && (
          <span title="Not discoverable" style={{ fontSize: '0.6rem', color: GOLD, opacity: 0.5, border: '1px solid rgba(200,168,72,0.25)', borderRadius: '9999px', padding: '0.1rem 0.45rem', flexShrink: 0, letterSpacing: '0.05em' }}>HIDDEN</span>
        )}
        <span style={{ fontSize: '0.72rem', color: GOLD, opacity: 0.5, flexShrink: 0 }}>
          {group.member_count} member{group.member_count !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          <button onClick={onEdit} style={{ background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: GOLD, cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.7 }}>Edit</button>
          <button onClick={onDelete} style={{ background: 'none', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '0.4rem', color: '#ff8a8a', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.7 }}>Del</button>
          <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '0.4rem', color: GOLD, cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.5 }}>
            {open ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ padding: '0.85rem 1rem 1rem' }}>
          <Roster groupId={group.id} members={members} />
        </div>
      )}
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────

export function GroupsManager({ members }: { members: AssignableMember[] }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState<Group | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/groups')
      .then(r => r.json())
      .then(d => setGroups(d.groups ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(form: GroupForm) {
    setSaving(true); setError(null)
    const res = await fetch('/api/admin/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, sort_order: groups.length }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setGroups(prev => [...prev, data.group])
    setCreating(false); setSaving(false)
  }

  async function handleUpdate(group: Group, form: GroupForm) {
    setSaving(true); setError(null)
    const res = await fetch(`/api/admin/groups/${group.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, ...data.group } : g))
    setEditing(null); setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this group? All member assignments for it will be removed. This cannot be undone.')) return
    const res = await fetch(`/api/admin/groups/${id}`, { method: 'DELETE' })
    if (res.ok) setGroups(prev => prev.filter(g => g.id !== id))
  }

  function handleDrop(toIndex: number) {
    if (dragIndex === null || dragIndex === toIndex) { setDragIndex(null); setDragOverIndex(null); return }
    const reordered = [...groups]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(toIndex, 0, moved)
    const withOrder = reordered.map((g, i) => ({ ...g, sort_order: i }))
    setGroups(withOrder)
    setDragIndex(null); setDragOverIndex(null)
    withOrder.forEach(g => fetch(`/api/admin/groups/${g.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: g.sort_order }) }))
  }

  if (loading) return <p style={{ opacity: 0.4, fontSize: '0.85rem' }}>Loading…</p>

  return (
    <div>
      {groups.length === 0 && (
        <p style={{ opacity: 0.4, fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '1.5rem' }}>No groups yet. Create one to start assigning members.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {groups.map((group, i) => (
          <GroupRow
            key={group.id}
            group={group}
            members={members}
            isDragOver={dragOverIndex === i}
            onEdit={() => { setEditing(group); setError(null) }}
            onDelete={() => handleDelete(group.id)}
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i) }}
            onDrop={() => handleDrop(i)}
            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
          />
        ))}
      </div>

      <button onClick={() => { setCreating(true); setError(null) }} style={{ padding: '0.6rem 1.4rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.3)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.05em' }}>
        + Add group
      </button>

      {creating && <GroupModal isNew initial={{ name: '', description: '', icon: '', join_policy: 'admin_assigned', visibility: 'listed' }} onSave={handleCreate} onClose={() => setCreating(false)} saving={saving} error={error} />}
      {editing && <GroupModal
        isNew={false}
        initial={{ name: editing.name, description: editing.description ?? '', icon: editing.icon ?? '', join_policy: editing.join_policy ?? 'admin_assigned', visibility: editing.visibility ?? 'listed' }}
        onSave={(f) => handleUpdate(editing, f)}
        onClose={() => setEditing(null)}
        saving={saving}
        error={error}
        groupId={editing.id}
        initialBadge={editing.badge_image}
        onBadgeChange={(url) => {
          setEditing(g => g ? { ...g, badge_image: url } : g)
          setGroups(prev => prev.map(g => g.id === editing.id ? { ...g, badge_image: url } : g))
        }}
      />}
    </div>
  )
}
