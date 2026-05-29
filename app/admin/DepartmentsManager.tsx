'use client'

import { useState, useEffect } from 'react'

type Role = {
  id: string
  name: string
  description: string | null
  capacity: number
  sort_order: number
  department_id: string
  purpose: string | null
  responsibilities_before: string | null
  responsibilities_during: string | null
  ideal_for: string | null
  commitment: string | null
  commitment_period: string | null
  requires_approval: boolean
}

type Department = {
  id: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
  roles: Role[]
}

type RoleForm = {
  name: string
  description: string
  capacity: number
  purpose: string
  responsibilities_before: string
  responsibilities_during: string
  ideal_for: string
  commitment: string
  commitment_period: string
  requires_approval: boolean
}

const COMMITMENT_LEVELS = ['Low', 'Low–Medium', 'Medium', 'Medium–High', 'High']
const COMMITMENT_PERIODS = ['Pre-Event', 'During Event', 'Both']

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,168,72,0.2)',
  borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#F3EDE6', fontSize: '0.875rem',
  fontFamily: 'var(--font-libre-baskerville), Georgia, serif', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase',
  color: '#C8A848', opacity: 0.65, display: 'block', marginBottom: '0.35rem',
}
const selectStyle: React.CSSProperties = {
  ...({} as React.CSSProperties),
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,168,72,0.2)',
  borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#F3EDE6', fontSize: '0.875rem',
  outline: 'none', appearance: 'none' as const,
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

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0 1rem' }}>
      <span style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(200,168,72,0.12)' }} />
    </div>
  )
}

// ── Department Modal ──────────────────────────────────────────────────────────

function DeptModal({
  initial, onSave, onClose, saving, error,
}: {
  initial: { name: string; description: string; icon: string }
  onSave: (f: { name: string; description: string; icon: string }) => void
  onClose: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 51, background: '#1a1410', border: '1px solid rgba(200,168,72,0.25)', borderRadius: '1rem', padding: '2rem', width: '90%', maxWidth: '480px' }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', marginBottom: '1.5rem' }}>
          {initial.name ? 'Edit Department' : 'New Department'}
        </p>
        <Field label="Name">
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Food & Drink" />
        </Field>
        <Field label="Description (optional)">
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this department handle?" />
        </Field>
        <Field label="Icon (optional — emoji or short text)">
          <input style={inputStyle} value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="e.g. 🍳" />
        </Field>
        {error && <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7 }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', opacity: saving || !form.name ? 0.4 : 1 }}>
            {saving ? 'Saving…' : 'Save department'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Role Modal ────────────────────────────────────────────────────────────────

function blankRoleForm(): RoleForm {
  return { name: '', description: '', capacity: 1, purpose: '', responsibilities_before: '', responsibilities_during: '', ideal_for: '', commitment: '', commitment_period: '', requires_approval: false }
}

function RoleModal({
  initial, onSave, onClose, saving, error,
}: {
  initial: RoleForm
  onSave: (f: RoleForm) => void
  onClose: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof RoleForm, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 52 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 53, background: '#1a1410', border: '1px solid rgba(200,168,72,0.25)',
        borderRadius: '1rem', padding: '2rem', width: '90%', maxWidth: '560px',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', marginBottom: '1.5rem' }}>
          {initial.name ? 'Edit Role' : 'New Role'}
        </p>

        {/* ── Basics ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
          <Field label="Role Name">
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Shift Coordinator" />
          </Field>
          <Field label="Capacity">
            <input style={{ ...inputStyle, width: '80px' }} type="number" min={1} value={form.capacity} onChange={e => set('capacity', parseInt(e.target.value) || 1)} />
          </Field>
        </div>

        <Field label="Short Description (optional)">
          <input style={inputStyle} value={form.description} onChange={e => set('description', e.target.value)} placeholder="One-line summary shown in the role list" />
        </Field>

        {/* ── Commitment ── */}
        <SectionDivider label="Commitment" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Level">
            <select style={selectStyle} value={form.commitment} onChange={e => set('commitment', e.target.value)}>
              <option value="">— not set —</option>
              {COMMITMENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Period">
            <select style={selectStyle} value={form.commitment_period} onChange={e => set('commitment_period', e.target.value)}>
              <option value="">— not set —</option>
              {COMMITMENT_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        {/* ── Role Detail ── */}
        <SectionDivider label="Role Detail" />

        <Field label="Purpose" hint="What is this role trying to achieve?">
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }} value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="Ensures volunteers know when and where they are expected." />
        </Field>

        <Field label="Responsibilities — Before Event" hint="One responsibility per line. Each line becomes a bullet point.">
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '96px' }} value={form.responsibilities_before} onChange={e => set('responsibilities_before', e.target.value)} placeholder={"Confirm volunteers are assigned to shifts.\nEnsure everyone receives their schedule."} />
        </Field>

        <Field label="Responsibilities — During Event" hint="One responsibility per line.">
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '96px' }} value={form.responsibilities_during} onChange={e => set('responsibilities_during', e.target.value)} placeholder={"Check that upcoming volunteers are aware of their shifts.\nHelp coordinate replacements if someone becomes unavailable."} />
        </Field>

        <Field label="Ideal For">
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '64px' }} value={form.ideal_for} onChange={e => set('ideal_for', e.target.value)} placeholder="Someone detail-oriented who enjoys helping people stay organized." />
        </Field>

        <SectionDivider label="Access" />

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer', marginBottom: '1rem' }}>
          <span
            onClick={() => set('requires_approval', !form.requires_approval)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '20px', borderRadius: '9999px', flexShrink: 0, marginTop: '2px',
              background: form.requires_approval ? '#C8A848' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${form.requires_approval ? '#C8A848' : 'rgba(200,168,72,0.2)'}`,
              position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
            }}
          >
            <span style={{
              position: 'absolute', top: '2px', left: form.requires_approval ? '17px' : '2px',
              width: '14px', height: '14px', borderRadius: '50%',
              background: '#F3EDE6', transition: 'left 0.2s',
            }} />
          </span>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#F3EDE6', margin: 0 }}>Requires admin approval</p>
            <p style={{ fontSize: '0.75rem', opacity: 0.45, margin: '0.2rem 0 0', lineHeight: 1.5 }}>
              Campers can request this role, but it won't be confirmed until an admin approves it.
            </p>
          </div>
        </label>

        {error && <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7 }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', opacity: saving || !form.name ? 0.4 : 1 }}>
            {saving ? 'Saving…' : 'Save role'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Role Detail View (expanded in admin) ──────────────────────────────────────

function RoleDetailView({ role }: { role: Role }) {
  return (
    <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid rgba(200,168,72,0.08)', background: 'rgba(0,0,0,0.15)' }}>
      {(role.commitment || role.commitment_period) && (
        <p style={{ fontSize: '0.75rem', color: '#C8A848', opacity: 0.65, marginBottom: '0.85rem' }}>
          Time Commitment: {[role.commitment, role.commitment_period].filter(Boolean).join(' · ')}
        </p>
      )}
      {role.purpose && (
        <div style={{ marginBottom: '0.85rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.35rem' }}>Purpose</p>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.65, opacity: 0.7 }}>{role.purpose}</p>
        </div>
      )}
      {role.responsibilities_before && (
        <div style={{ marginBottom: '0.85rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.35rem' }}>Before Event</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {role.responsibilities_before.split('\n').filter(Boolean).map((line, i) => (
              <li key={i} style={{ fontSize: '0.82rem', lineHeight: 1.65, opacity: 0.7 }}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {role.responsibilities_during && (
        <div style={{ marginBottom: '0.85rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.35rem' }}>During Event</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {role.responsibilities_during.split('\n').filter(Boolean).map((line, i) => (
              <li key={i} style={{ fontSize: '0.82rem', lineHeight: 1.65, opacity: 0.7 }}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {role.ideal_for && (
        <div>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.5, marginBottom: '0.35rem' }}>Ideal For</p>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.65, opacity: 0.7, fontStyle: 'italic' }}>{role.ideal_for}</p>
        </div>
      )}
      {!role.commitment && !role.purpose && !role.responsibilities_before && !role.responsibilities_during && !role.ideal_for && (
        <p style={{ fontSize: '0.78rem', opacity: 0.3, fontStyle: 'italic' }}>No detail added yet.</p>
      )}
    </div>
  )
}

// ── Role Row ──────────────────────────────────────────────────────────────────

function RoleRow({ role, onEdit, onDelete }: { role: Role; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const hasDetail = !!(role.commitment || role.purpose || role.responsibilities_before || role.responsibilities_during || role.ideal_for)

  return (
    <div style={{ borderRadius: '0.5rem', border: '1px solid rgba(200,168,72,0.1)', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.85rem', color: '#F3EDE6', margin: 0 }}>{role.name}</p>
          {role.description && (
            <p style={{ fontSize: '0.75rem', opacity: 0.4, margin: '0.15rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role.description}</p>
          )}
        </div>
        {(role.commitment || role.commitment_period) && (
          <span style={{ fontSize: '0.68rem', color: '#C8A848', opacity: 0.45, flexShrink: 0 }}>
            {role.commitment}{role.commitment && role.commitment_period ? ' · ' : ''}{role.commitment_period}
          </span>
        )}
        {role.requires_approval && (
          <span style={{ fontSize: '0.65rem', color: '#D239F8', opacity: 0.7, flexShrink: 0, border: '1px solid rgba(210,57,248,0.25)', borderRadius: '9999px', padding: '0.1rem 0.45rem' }}>approval</span>
        )}
        <span style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.5, flexShrink: 0 }}>cap. {role.capacity}</span>
        <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
          <button onClick={onEdit} style={{ background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.2rem 0.45rem', fontSize: '0.68rem', opacity: 0.7 }}>Edit</button>
          <button onClick={onDelete} style={{ background: 'none', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '0.4rem', color: '#ff8a8a', cursor: 'pointer', padding: '0.2rem 0.45rem', fontSize: '0.68rem', opacity: 0.7 }}>Del</button>
          <button
            onClick={() => setOpen(o => !o)}
            title={open ? 'Collapse' : 'Expand detail'}
            style={{ background: 'none', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.2rem 0.45rem', fontSize: '0.68rem', opacity: hasDetail ? 0.6 : 0.25 }}
          >
            {open ? '▲' : '▼'}
          </button>
        </div>
      </div>
      {open && <RoleDetailView role={role} />}
    </div>
  )
}

// ── Department Row ────────────────────────────────────────────────────────────

function DeptRow({
  dept, isDragOver, onEdit, onDelete, onAddRole, onEditRole, onDeleteRole,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  dept: Department
  isDragOver: boolean
  onEdit: () => void
  onDelete: () => void
  onAddRole: () => void
  onEditRole: (r: Role) => void
  onDeleteRole: (id: string) => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  const [open, setOpen] = useState(true)

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
        transition: 'border-color 0.15s, background 0.15s',
        overflow: 'hidden',
      }}
    >
      {/* Department header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', cursor: 'grab' }}>
        <span style={{ color: '#C8A848', opacity: 0.25, fontSize: '1rem', userSelect: 'none', flexShrink: 0 }}>⠿</span>
        {dept.icon && <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{dept.icon}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.92rem', color: '#F3EDE6', margin: 0, fontWeight: 600 }}>{dept.name}</p>
          {dept.description && (
            <p style={{ fontSize: '0.77rem', opacity: 0.45, margin: '0.15rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.description}</p>
          )}
        </div>
        <span style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.45, flexShrink: 0 }}>
          {dept.roles.length} role{dept.roles.length !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          <button onClick={onEdit} style={{ background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.7 }}>Edit</button>
          <button onClick={onDelete} style={{ background: 'none', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '0.4rem', color: '#ff8a8a', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.7 }}>Del</button>
          <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: '1px solid rgba(200,168,72,0.15)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.5 }}>
            {open ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Roles list */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(200,168,72,0.08)', padding: '0.75rem 1rem 1rem' }}>
          {dept.roles.length === 0 && (
            <p style={{ fontSize: '0.78rem', opacity: 0.35, fontStyle: 'italic', marginBottom: '0.75rem' }}>No roles yet.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: dept.roles.length > 0 ? '0.75rem' : 0 }}>
            {dept.roles.map(role => (
              <RoleRow
                key={role.id}
                role={role}
                onEdit={() => onEditRole(role)}
                onDelete={() => onDeleteRole(role.id)}
              />
            ))}
          </div>
          <button onClick={onAddRole} style={{ fontSize: '0.78rem', color: '#C8A848', opacity: 0.6, background: 'none', border: '1px dashed rgba(200,168,72,0.25)', borderRadius: '0.5rem', padding: '0.4rem 0.85rem', cursor: 'pointer', letterSpacing: '0.04em' }}>
            + Add role
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DepartmentsManager() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [creatingDept, setCreatingDept] = useState(false)
  const [deptSaving, setDeptSaving] = useState(false)
  const [deptError, setDeptError] = useState<string | null>(null)

  const [editingRole, setEditingRole] = useState<{ role: Role; deptId: string } | null>(null)
  const [creatingRole, setCreatingRole] = useState<{ deptId: string } | null>(null)
  const [roleSaving, setRoleSaving] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/departments').then(r => r.json()),
      fetch('/api/admin/roles').then(r => r.json()),
    ]).then(([deptData, rolesData]) => {
      const roles: Role[] = rolesData.roles ?? []
      const depts: Department[] = (deptData.departments ?? []).map((d: Department) => ({
        ...d,
        roles: roles.filter(r => r.department_id === d.id).sort((a, b) => a.sort_order - b.sort_order),
      }))
      setDepartments(depts)
    }).finally(() => setLoading(false))
  }, [])

  async function handleCreateDept(form: { name: string; description: string; icon: string }) {
    setDeptSaving(true); setDeptError(null)
    const res = await fetch('/api/admin/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, sort_order: departments.length }) })
    const data = await res.json()
    if (!res.ok) { setDeptError(data.error); setDeptSaving(false); return }
    setDepartments(prev => [...prev, { ...data.department, roles: [] }])
    setCreatingDept(false); setDeptSaving(false)
  }

  async function handleUpdateDept(dept: Department, form: { name: string; description: string; icon: string }) {
    setDeptSaving(true); setDeptError(null)
    const res = await fetch(`/api/admin/departments/${dept.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setDeptError(data.error); setDeptSaving(false); return }
    setDepartments(prev => prev.map(d => d.id === dept.id ? { ...d, ...data.department } : d))
    setEditingDept(null); setDeptSaving(false)
  }

  async function handleDeleteDept(id: string) {
    if (!confirm('Delete this department and all its roles? This cannot be undone.')) return
    const res = await fetch(`/api/admin/departments/${id}`, { method: 'DELETE' })
    if (res.ok) setDepartments(prev => prev.filter(d => d.id !== id))
  }

  async function handleCreateRole(deptId: string, form: RoleForm) {
    setRoleSaving(true); setRoleError(null)
    const dept = departments.find(d => d.id === deptId)
    const res = await fetch('/api/admin/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, department_id: deptId, sort_order: dept?.roles.length ?? 0 }) })
    const data = await res.json()
    if (!res.ok) { setRoleError(data.error); setRoleSaving(false); return }
    setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, roles: [...d.roles, data.role] } : d))
    setCreatingRole(null); setRoleSaving(false)
  }

  async function handleUpdateRole(role: Role, form: RoleForm) {
    setRoleSaving(true); setRoleError(null)
    const res = await fetch(`/api/admin/roles/${role.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setRoleError(data.error); setRoleSaving(false); return }
    setDepartments(prev => prev.map(d => ({ ...d, roles: d.roles.map(r => r.id === role.id ? { ...r, ...data.role } : r) })))
    setEditingRole(null); setRoleSaving(false)
  }

  async function handleDeleteRole(id: string) {
    if (!confirm('Delete this role? Any campers signed up for it will lose their role assignment.')) return
    const res = await fetch(`/api/admin/roles/${id}`, { method: 'DELETE' })
    if (res.ok) setDepartments(prev => prev.map(d => ({ ...d, roles: d.roles.filter(r => r.id !== id) })))
  }

  function handleDrop(toIndex: number) {
    if (dragIndex === null || dragIndex === toIndex) { setDragIndex(null); setDragOverIndex(null); return }
    const reordered = [...departments]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(toIndex, 0, moved)
    const withOrder = reordered.map((d, i) => ({ ...d, sort_order: i }))
    setDepartments(withOrder)
    setDragIndex(null); setDragOverIndex(null)
    withOrder.forEach(d => fetch(`/api/admin/departments/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: d.sort_order }) }))
  }

  if (loading) return <p style={{ opacity: 0.4, fontSize: '0.85rem' }}>Loading…</p>

  return (
    <div>
      {departments.length === 0 && (
        <p style={{ opacity: 0.4, fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '1.5rem' }}>No departments yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {departments.map((dept, i) => (
          <DeptRow
            key={dept.id}
            dept={dept}
            isDragOver={dragOverIndex === i}
            onEdit={() => { setEditingDept(dept); setDeptError(null) }}
            onDelete={() => handleDeleteDept(dept.id)}
            onAddRole={() => { setCreatingRole({ deptId: dept.id }); setRoleError(null) }}
            onEditRole={(r) => { setEditingRole({ role: r, deptId: dept.id }); setRoleError(null) }}
            onDeleteRole={handleDeleteRole}
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i) }}
            onDrop={() => handleDrop(i)}
            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
          />
        ))}
      </div>

      <button onClick={() => { setCreatingDept(true); setDeptError(null) }} style={{ padding: '0.6rem 1.4rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.3)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.05em' }}>
        + Add department
      </button>

      {creatingDept && <DeptModal initial={{ name: '', description: '', icon: '' }} onSave={handleCreateDept} onClose={() => setCreatingDept(false)} saving={deptSaving} error={deptError} />}
      {editingDept && <DeptModal initial={{ name: editingDept.name, description: editingDept.description ?? '', icon: editingDept.icon ?? '' }} onSave={(f) => handleUpdateDept(editingDept, f)} onClose={() => setEditingDept(null)} saving={deptSaving} error={deptError} />}
      {creatingRole && <RoleModal initial={blankRoleForm()} onSave={(f) => handleCreateRole(creatingRole.deptId, f)} onClose={() => setCreatingRole(null)} saving={roleSaving} error={roleError} />}
      {editingRole && (
        <RoleModal
          initial={{
            name: editingRole.role.name,
            description: editingRole.role.description ?? '',
            capacity: editingRole.role.capacity,
            purpose: editingRole.role.purpose ?? '',
            responsibilities_before: editingRole.role.responsibilities_before ?? '',
            responsibilities_during: editingRole.role.responsibilities_during ?? '',
            ideal_for: editingRole.role.ideal_for ?? '',
            commitment: editingRole.role.commitment ?? '',
            commitment_period: editingRole.role.commitment_period ?? '',
            requires_approval: editingRole.role.requires_approval ?? false,
          }}
          onSave={(f) => handleUpdateRole(editingRole.role, f)}
          onClose={() => setEditingRole(null)}
          saving={roleSaving}
          error={roleError}
        />
      )}
    </div>
  )
}
