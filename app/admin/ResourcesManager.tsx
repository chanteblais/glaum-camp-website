'use client'

import { useState, useEffect } from 'react'
import { LoadError } from './LoadError'
import { AssetImagePicker } from './AssetImagePicker'
import { isImageIcon } from '@/lib/icon-src'
import { useConfirm } from '../components/ConfirmDialog'

type Claimant = { name: string; quantity: number }
type ResourceItem = {
  id: string
  list_id: string
  name: string
  note: string | null
  // NULL = open callout (member offer, or an admin-authored no-target ask) — migration 053.
  quantity_needed: number | null
  icon: string | null
  offered_by_name: string | null
  sort_order: number
  claimed: number
  claimants: Claimant[]
}
export type ResourceList = {
  id: string
  title: string
  description: string | null
  group_id: string | null
  department_id: string | null
  role_id: string | null
  steward_name: string | null
  visible: boolean
  sort_order: number
  items: ResourceItem[]
}
// The steward dropdown's option pools (at most one steward per list — migration 052).
export type StewardOptions = {
  groups: { id: string; name: string }[]
  departments: { id: string; name: string }[]
  roles: { id: string; name: string; department_name: string | null }[]
}

// Steward encoded as one select value: '' | 'group:<id>' | 'department:<id>' | 'role:<id>'.
type ListDraft = { title: string; description: string; steward: string; visible: boolean }
type ItemDraft = { name: string; note: string; quantity_needed: number | ''; icon: string }

const stewardValue = (l: { group_id: string | null; department_id: string | null; role_id: string | null }) =>
  l.group_id ? `group:${l.group_id}` : l.department_id ? `department:${l.department_id}` : l.role_id ? `role:${l.role_id}` : ''

// '' → all three null; 'group:<id>' → { group_id: <id>, department_id: null, role_id: null }; etc.
const stewardFields = (steward: string) => {
  const [kind, id] = steward.split(':')
  return {
    group_id: kind === 'group' ? id : null,
    department_id: kind === 'department' ? id : null,
    role_id: kind === 'role' ? id : null,
  }
}

const blankList = (): ListDraft => ({ title: '', description: '', steward: '', visible: true })
const blankItem = (): ItemDraft => ({ name: '', note: '', quantity_needed: 1, icon: '' })

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,168,72,0.2)',
  borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#F3EDE6', fontSize: '0.875rem',
  fontFamily: 'var(--font-libre-baskerville), Georgia, serif', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase',
  color: '#C8A848', opacity: 0.65, display: 'block', marginBottom: '0.35rem',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', userSelect: 'none' }}>
      <span
        onClick={() => onChange(!checked)}
        style={{
          display: 'inline-block', width: '36px', height: '20px', borderRadius: '9999px', flexShrink: 0,
          background: checked ? '#C8A848' : 'rgba(255,255,255,0.1)',
          border: `1px solid ${checked ? '#C8A848' : 'rgba(200,168,72,0.2)'}`,
          position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
        }}
      >
        <span style={{
          position: 'absolute', top: '2px', left: checked ? '17px' : '2px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: '#F3EDE6', transition: 'left 0.2s',
        }} />
      </span>
      <span style={{ opacity: 0.75 }}>{label}</span>
    </label>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(95vw, 520px)', maxHeight: '88vh', overflowY: 'auto',
        background: '#1A0A24', border: '1px solid rgba(200,168,72,0.25)',
        borderRadius: '1rem', padding: '1.5rem', zIndex: 50,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.15rem', color: '#C8A848', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#C8A848', fontSize: '1.4rem', cursor: 'pointer', opacity: 0.7 }}>×</button>
        </div>
        {children}
      </div>
    </>
  )
}

function ModalActions({ onCancel, onSave, saving, disabled, saveLabel }: {
  onCancel: () => void; onSave: () => void; saving: boolean; disabled: boolean; saveLabel: string
}) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
      <button onClick={onCancel} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7 }}>
        Cancel
      </button>
      <button onClick={onSave} disabled={saving || disabled} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.05em', opacity: saving || disabled ? 0.5 : 1 }}>
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}

function ListModal({ initial, isCreate, stewards, onSave, onClose, saving, error }: {
  initial: ListDraft
  isCreate: boolean
  stewards: StewardOptions
  onSave: (form: ListDraft) => void
  onClose: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof ListDraft, v: unknown) => setForm(p => ({ ...p, [k]: v }))
  return (
    <Modal title={isCreate ? 'New resource list' : 'Edit resource list'} onClose={onClose}>
      <Field label="Title">
        <input style={inputStyle} value={form.title} placeholder="e.g. Shared Kitchen" onChange={e => set('title', e.target.value)} />
      </Field>
      <Field label="Description (optional)">
        <textarea rows={2} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} value={form.description} placeholder="What this gear is for" onChange={e => set('description', e.target.value)} />
      </Field>
      <Field label="Steward (optional)">
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.steward} onChange={e => set('steward', e.target.value)}>
          <option value="">— None —</option>
          {stewards.groups.length > 0 && (
            <optgroup label="Groups">
              {stewards.groups.map(g => <option key={g.id} value={`group:${g.id}`}>{g.name}</option>)}
            </optgroup>
          )}
          {stewards.departments.length > 0 && (
            <optgroup label="Departments">
              {stewards.departments.map(d => <option key={d.id} value={`department:${d.id}`}>{d.name}</option>)}
            </optgroup>
          )}
          {stewards.roles.length > 0 && (
            <optgroup label="Roles">
              {stewards.roles.map(r => <option key={r.id} value={`role:${r.id}`}>{r.name}{r.department_name ? ` (${r.department_name})` : ''}</option>)}
            </optgroup>
          )}
        </select>
      </Field>
      <div style={{ marginBottom: '1.25rem' }}>
        <Toggle checked={form.visible} onChange={v => set('visible', v)} label="Visible to members" />
      </div>
      {error && <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}
      <ModalActions onCancel={onClose} onSave={() => onSave(form)} saving={saving} disabled={!form.title.trim()} saveLabel="Save list" />
    </Modal>
  )
}

function ItemModal({ initial, isCreate, itemId, onSave, onClose, saving, error }: {
  initial: ItemDraft
  isCreate: boolean
  // Row id for existing items; new items get a generated storage key so an
  // icon can be uploaded before the row exists (departments-icon idiom).
  itemId: string | null
  onSave: (form: ItemDraft) => void
  onClose: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const [uploadKey] = useState(() => itemId ?? `new-${Math.random().toString(36).slice(2, 10)}`)
  const set = (k: keyof ItemDraft, v: unknown) => setForm(p => ({ ...p, [k]: v }))
  return (
    <Modal title={isCreate ? 'New item' : 'Edit item'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '0 1rem' }}>
        <Field label="Item">
          <input style={inputStyle} value={form.name} placeholder="e.g. Camping stove" onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Needed">
          <input
            style={inputStyle} type="number" min={1} max={99} value={form.quantity_needed} placeholder="—"
            onChange={e => set('quantity_needed', e.target.value === '' ? '' : Math.max(1, Math.min(99, Math.floor(Number(e.target.value) || 1))))}
          />
        </Field>
      </div>
      <Field label="Note (optional)">
        <input style={inputStyle} value={form.note} placeholder="e.g. two-burner, with propane" onChange={e => set('note', e.target.value)} />
      </Field>
      <Field label="Icon (optional)">
        <AssetImagePicker
          value={form.icon || undefined}
          onChange={v => set('icon', v ?? '')}
          uploadUrl={`/api/admin/resources/items/${encodeURIComponent(uploadKey)}/icon`}
          primaryCategory="icon"
          label="Item icon"
        />
      </Field>
      <p style={{ fontSize: '0.72rem', opacity: 0.4, margin: '-0.5rem 0 1rem', lineHeight: 1.5 }}>
        Leave “Needed” blank for an open callout (no set target). Setting a number on a member offer turns it into a tracked need — claims stay attached.
      </p>
      {error && <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}
      <ModalActions onCancel={onClose} onSave={() => onSave(form)} saving={saving} disabled={!form.name.trim()} saveLabel="Save item" />
    </Modal>
  )
}

// Per-item progress pill: gold while short, green once the need is met.
// Over-fulfillment shows as-is (5 of 4) — information, not an error.
// No target (open callout / member offer) → a lavender count of what's coming.
function ProgressPill({ claimed, needed }: { claimed: number; needed: number | null }) {
  if (needed === null) {
    return (
      <span style={{ fontSize: '0.72rem', color: '#D9B8E8', border: '1px solid rgba(210,57,248,0.3)', borderRadius: '9999px', padding: '0.15rem 0.6rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {claimed} offered
      </span>
    )
  }
  const met = claimed >= needed
  const color = met ? '#7dcf8e' : '#C8A848'
  const border = met ? 'rgba(100,200,120,0.35)' : 'rgba(200,168,72,0.3)'
  return (
    <span style={{ fontSize: '0.72rem', color, border: `1px solid ${border}`, borderRadius: '9999px', padding: '0.15rem 0.6rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
      {met ? '✓ ' : ''}{claimed} of {needed}
    </span>
  )
}

export function ResourcesManager({ initialLists, initialStewards }: {
  // Server-rendered pages pass these (docs/architecture.md → Auth → "Server-
  // rendered section data") so the board paints populated; the mount fetch
  // below runs only when they're absent. The API routes stay the refresh path.
  initialLists?: ResourceList[]
  initialStewards?: StewardOptions
} = {}) {
  const [lists, setLists] = useState<ResourceList[]>(initialLists ?? [])
  const [stewards, setStewards] = useState<StewardOptions>(initialStewards ?? { groups: [], departments: [], roles: [] })
  const [loading, setLoading] = useState(initialLists === undefined)
  const [loadError, setLoadError] = useState(false)
  const [modal, setModal] = useState<
    | { kind: 'add-list' }
    | { kind: 'edit-list'; list: ResourceList }
    | { kind: 'add-item'; list: ResourceList }
    | { kind: 'edit-item'; item: ResourceItem }
    | null
  >(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const { confirm, confirmDialog } = useConfirm()

  const load = async () => {
    setLoadError(false)
    try {
      const [rRes, gRes, dRes, roRes] = await Promise.all([
        fetch('/api/admin/resources'),
        fetch('/api/admin/groups'),
        fetch('/api/admin/departments'),
        fetch('/api/admin/roles'),
      ])
      if (!rRes.ok) throw new Error()
      const rJson = await rRes.json()
      setLists(rJson.lists ?? [])
      // Steward option pools — each degrades to empty if its fetch fails.
      const gJson = gRes.ok ? await gRes.json() : {}
      const dJson = dRes.ok ? await dRes.json() : {}
      const roJson = roRes.ok ? await roRes.json() : {}
      const departments = (dJson.departments ?? []).map((d: { id: string; name: string }) => ({ id: d.id, name: d.name }))
      const deptName = Object.fromEntries(departments.map((d: { id: string; name: string }) => [d.id, d.name]))
      setStewards({
        groups: (gJson.groups ?? []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name })),
        departments,
        roles: (roJson.roles ?? []).map((r: { id: string; name: string; department_id: string | null }) => ({
          id: r.id, name: r.name, department_name: r.department_id ? deptName[r.department_id] ?? null : null,
        })),
      })
    } catch {
      setLoadError(true)
    }
    setLoading(false)
  }

  useEffect(() => { if (initialLists === undefined) load() }, [])

  const save = async (url: string, method: 'POST' | 'PATCH', body: unknown) => {
    setSaving(true)
    setModalError(null)
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Save failed') }
      await load()
      setModal(null)
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveList = (form: ListDraft) => {
    const body = { title: form.title, description: form.description, ...stewardFields(form.steward), visible: form.visible }
    if (modal?.kind === 'edit-list') save(`/api/admin/resources/${modal.list.id}`, 'PATCH', body)
    else save('/api/admin/resources', 'POST', body)
  }

  const handleSaveItem = (form: ItemDraft) => {
    if (modal?.kind === 'edit-item') save(`/api/admin/resources/items/${modal.item.id}`, 'PATCH', form)
    else if (modal?.kind === 'add-item') save('/api/admin/resources/items', 'POST', { ...form, list_id: modal.list.id })
  }

  const handleDeleteList = async (list: ResourceList) => {
    const claims = list.items.reduce((s, it) => s + it.claimants.length, 0)
    const ok = await confirm({
      title: `Delete “${list.title}”?`,
      body: `Its ${list.items.length} item${list.items.length === 1 ? '' : 's'}${claims > 0 ? ` and ${claims} member claim${claims === 1 ? '' : 's'}` : ''} will be removed too.`,
      confirmLabel: 'Delete list',
      danger: true,
    })
    if (!ok) return
    await fetch(`/api/admin/resources/${list.id}`, { method: 'DELETE' })
    setLists(prev => prev.filter(l => l.id !== list.id))
  }

  const handleDeleteItem = async (item: ResourceItem) => {
    const ok = await confirm({
      title: `Delete “${item.name}”?`,
      body: item.claimants.length > 0 ? `${item.claimants.length} member claim${item.claimants.length === 1 ? '' : 's'} will be removed too.` : undefined,
      confirmLabel: 'Delete item',
      danger: true,
    })
    if (!ok) return
    await fetch(`/api/admin/resources/items/${item.id}`, { method: 'DELETE' })
    setLists(prev => prev.map(l => l.id === item.list_id ? { ...l, items: l.items.filter(i => i.id !== item.id) } : l))
  }

  const handleToggleVisible = async (list: ResourceList) => {
    await fetch(`/api/admin/resources/${list.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !list.visible }),
    })
    setLists(prev => prev.map(l => l.id === list.id ? { ...l, visible: !l.visible } : l))
  }

  const smallBtn: React.CSSProperties = {
    background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem',
    color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.55rem', fontSize: '0.7rem', opacity: 0.6,
  }

  if (loading) return <p style={{ opacity: 0.4, fontStyle: 'italic', fontSize: '0.875rem' }}>Loading…</p>
  if (loadError) return <LoadError onRetry={() => { setLoading(true); load() }} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.55, margin: 0 }}>
          Resource Lists — {lists.length}
        </p>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.25)', background: 'transparent', color: '#C8A848', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.06em', opacity: 0.75 }}
          onClick={() => { setModal({ kind: 'add-list' }); setModalError(null) }}
        >
          + Add list
        </button>
      </div>

      <p style={{ fontSize: '0.78rem', opacity: 0.45, lineHeight: 1.6, margin: '0 0 1rem' }}>
        The gear the community needs members to bring — stoves, coolers, tools. Members claim items
        on the Participate page (“I&rsquo;ll bring one”); totals and names update here as they do.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {lists.length === 0 && <p style={{ opacity: 0.35, fontStyle: 'italic', fontSize: '0.82rem' }}>No resource lists yet.</p>}
        {lists.map(list => (
          <div key={list.id} style={{
            borderRadius: '0.75rem', border: '1px solid rgba(200,168,72,0.15)',
            background: 'rgba(255,255,255,0.02)', overflow: 'hidden',
            opacity: list.visible ? 1 : 0.55,
          }}>
            {/* List header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: list.items.length > 0 ? '1px solid rgba(200,168,72,0.1)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#C8A848', margin: 0 }}>
                  {list.title}
                  {!list.visible && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#F3EDE6', opacity: 0.45, border: '1px solid rgba(243,237,230,0.2)', borderRadius: '9999px', padding: '0.1rem 0.5rem', verticalAlign: 'middle' }}>
                      Hidden
                    </span>
                  )}
                </p>
                <p style={{ fontSize: '0.7rem', opacity: 0.45, margin: '0.15rem 0 0' }}>
                  {[list.description, list.steward_name ? `Stewarded by ${list.steward_name}` : null].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button style={smallBtn} onClick={() => { setModal({ kind: 'add-item', list }); setModalError(null) }}>+ Item</button>
                <button style={smallBtn} onClick={() => handleToggleVisible(list)} title={list.visible ? 'Visible to members — click to hide' : 'Hidden from members — click to show'}>
                  {list.visible ? '●' : '○'}
                </button>
                <button style={smallBtn} onClick={() => { setModal({ kind: 'edit-list', list }); setModalError(null) }}>Edit</button>
                <button style={{ ...smallBtn, border: '1px solid rgba(255,100,100,0.2)', color: '#ff8a8a', opacity: 0.5 }} onClick={() => handleDeleteList(list)}>✕</button>
              </div>
            </div>

            {/* Items */}
            {list.items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', borderTop: '1px solid rgba(200,168,72,0.06)' }}>
                {item.icon && isImageIcon(item.icon) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.icon} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.84rem', color: '#F3EDE6', margin: 0 }}>
                    {item.name}
                    {item.offered_by_name && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#D9B8E8', border: '1px solid rgba(210,57,248,0.3)', borderRadius: '9999px', padding: '0.1rem 0.5rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        offered by {item.offered_by_name}
                      </span>
                    )}
                    {item.note && <span style={{ opacity: 0.45, fontSize: '0.74rem' }}> — {item.note}</span>}
                  </p>
                  {item.claimants.length > 0 && (
                    <p style={{ fontSize: '0.68rem', opacity: 0.45, margin: '0.15rem 0 0' }}>
                      {item.claimants.map(c => c.quantity > 1 ? `${c.name} ×${c.quantity}` : c.name).join(' · ')}
                    </p>
                  )}
                </div>
                <ProgressPill claimed={item.claimed} needed={item.quantity_needed} />
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button style={smallBtn} onClick={() => { setModal({ kind: 'edit-item', item }); setModalError(null) }}>Edit</button>
                  <button style={{ ...smallBtn, border: '1px solid rgba(255,100,100,0.2)', color: '#ff8a8a', opacity: 0.5 }} onClick={() => handleDeleteItem(item)}>✕</button>
                </div>
              </div>
            ))}
            {list.items.length === 0 && (
              <p style={{ fontSize: '0.74rem', opacity: 0.3, fontStyle: 'italic', margin: 0, padding: '0.5rem 1rem 0.75rem' }}>
                No items yet. Visible empty lists still show to members as a place to offer gear.
              </p>
            )}
          </div>
        ))}
      </div>

      {(modal?.kind === 'add-list' || modal?.kind === 'edit-list') && (
        <ListModal
          initial={modal.kind === 'edit-list'
            ? { title: modal.list.title, description: modal.list.description ?? '', steward: stewardValue(modal.list), visible: modal.list.visible }
            : blankList()}
          isCreate={modal.kind === 'add-list'}
          stewards={stewards}
          onSave={handleSaveList}
          onClose={() => setModal(null)}
          saving={saving}
          error={modalError}
        />
      )}

      {confirmDialog}

      {(modal?.kind === 'add-item' || modal?.kind === 'edit-item') && (
        <ItemModal
          initial={modal.kind === 'edit-item'
            ? { name: modal.item.name, note: modal.item.note ?? '', quantity_needed: modal.item.quantity_needed ?? '', icon: modal.item.icon ?? '' }
            : blankItem()}
          isCreate={modal.kind === 'add-item'}
          itemId={modal.kind === 'edit-item' ? modal.item.id : null}
          onSave={handleSaveItem}
          onClose={() => setModal(null)}
          saving={saving}
          error={modalError}
        />
      )}
    </div>
  )
}
