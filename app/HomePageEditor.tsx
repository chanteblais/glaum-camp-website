'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────
type Content = Record<string, string>

const WIDGET_LABELS: Record<string, string> = {
  announcements: 'Announcements',
  polls:         'Polls',
  events:        'Gatherings',
  spotlight:     'Meet a Member',
  activity:      'Recent Activity',
}

// Copy fields shown in the slide-in text panel
const COPY_FIELDS = [
  { key: 'home_tagline',             label: 'Hero Tagline',           multiline: false },
  { key: 'home_quote',               label: 'Hero Quote Card',        multiline: false },
  { key: 'home_about_heading',       label: 'About — Heading',        multiline: false },
  { key: 'home_about_body',          label: 'About — Body',           multiline: true  },
  { key: 'home_participate_heading', label: 'Participate — Heading',  multiline: false },
  { key: 'home_participate_body',    label: 'Participate — Body',     multiline: true  },
]

// ── Helpers ───────────────────────────────────────────────────────
function getWidgetEls(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-widget-id]'))
}

function getCurrentOrder(): string[] {
  return getWidgetEls().map(el => el.dataset.widgetId!)
}

function getSavedHidden(initialContent: Content): string[] {
  try {
    const raw = initialContent['dashboard_layout']
    if (raw) return JSON.parse(raw).hidden ?? []
  } catch {}
  return []
}

// ── Text panel (slide-in for copy fields) ────────────────────────
const inputBase: React.CSSProperties = {
  width: '100%', backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(200,168,72,0.35)', borderRadius: '0.5rem',
  padding: '0.65rem 0.85rem', color: '#F3EDE6', fontSize: '0.875rem',
  fontFamily: 'var(--font-libre-baskerville), Georgia, serif',
  outline: 'none', lineHeight: 1.6, resize: 'vertical' as const, boxSizing: 'border-box' as const,
}

function TextPanel({ initialContent, onClose }: { initialContent: Content; onClose: () => void }) {
  const [content, setContent] = useState<Content>(initialContent)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true); setError(null)
    const res = await fetch('/api/admin/page-content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => { onClose(); window.location.reload() }, 500) }
    else setError((await res.json()).error ?? 'Failed')
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: '380px', maxWidth: '100vw', height: '100vh',
      overflowY: 'auto', zIndex: 300, background: 'rgba(12,4,24,0.98)',
      borderLeft: '1px solid rgba(200,168,72,0.2)', boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid rgba(200,168,72,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#C8A848', margin: 0 }}>Edit Text</p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#F3EDE6', opacity: 0.4, cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem 3rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {COPY_FIELDS.map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, marginBottom: '0.4rem' }}>{f.label}</label>
            {f.multiline
              ? <textarea value={content[f.key] ?? ''} onChange={e => { setContent(p => ({ ...p, [f.key]: e.target.value })); setSaved(false) }} rows={4} style={inputBase} />
              : <input type="text" value={content[f.key] ?? ''} onChange={e => { setContent(p => ({ ...p, [f.key]: e.target.value })); setSaved(false) }} style={inputBase} />
            }
          </div>
        ))}
        {error && <p style={{ fontSize: '0.8rem', color: '#ff6b6b' }}>{error}</p>}
        <button onClick={handleSave} disabled={saving} style={{ padding: '0.7rem', borderRadius: '0.55rem', border: '1px solid rgba(200,168,72,0.45)', background: saved ? 'rgba(100,200,120,0.1)' : 'rgba(200,168,72,0.08)', color: saved ? '#7dcf8e' : '#FFFACD', fontFamily: 'TokyoDreams, serif', fontSize: '0.82rem', letterSpacing: '0.1em', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Text'}
        </button>
      </div>
    </div>
  )
}

// ── New poll inline form ──────────────────────────────────────────
function NewPollPanel({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = question.trim() && options.filter(o => o.trim()).length >= 2

  async function handleCreate() {
    if (!valid) return
    setSaving(true); setError(null)
    const res = await fetch('/api/admin/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options: options.filter(o => o.trim()), allow_multiple: allowMultiple, visible: true }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Failed'); return }
    onCreated()
  }

  const si: React.CSSProperties = { ...inputBase, fontSize: '0.82rem', padding: '0.5rem 0.75rem' }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: '360px', maxWidth: '100vw', height: '100vh',
      overflowY: 'auto', zIndex: 300, background: 'rgba(12,4,24,0.98)',
      borderLeft: '1px solid rgba(210,57,248,0.25)', boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid rgba(210,57,248,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.1rem', color: '#D239F8', margin: 0 }}>New Poll</p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#F3EDE6', opacity: 0.4, cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem 3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, marginBottom: '0.4rem' }}>Question</label>
          <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask the camp something…" rows={2} style={{ ...si, resize: 'vertical' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A848', opacity: 0.6, marginBottom: '0.4rem' }}>Options</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.4rem' }}>
                <input value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n) }} placeholder={`Option ${i + 1}`} style={{ ...si, flex: 1 }} />
                {options.length > 2 && <button onClick={() => setOptions(o => o.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ff8080', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}>×</button>}
              </div>
            ))}
            {options.length < 8 && <button onClick={() => setOptions(o => [...o, ''])} style={{ background: 'none', border: '1px dashed rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: '#C8A848', opacity: 0.5, cursor: 'pointer', padding: '0.3rem', fontSize: '0.72rem' }}>+ Add option</button>}
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} style={{ accentColor: '#C8A848' }} />
          <span style={{ fontSize: '0.78rem', opacity: 0.65 }}>Allow multiple selections</span>
        </label>
        {error && <p style={{ fontSize: '0.75rem', color: '#ff8080' }}>{error}</p>}
        <button onClick={handleCreate} disabled={saving || !valid} style={{ padding: '0.7rem', borderRadius: '0.55rem', border: '1px solid rgba(210,57,248,0.4)', background: 'rgba(210,57,248,0.08)', color: '#D239F8', fontFamily: 'TokyoDreams, serif', fontSize: '0.82rem', cursor: valid ? 'pointer' : 'not-allowed', opacity: saving ? 0.5 : 1 }}>
          {saving ? 'Creating…' : 'Create Poll'}
        </button>
      </div>
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────
export function HomePageEditor({ initialContent }: { initialContent: Content }) {
  const [editMode, setEditMode]     = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [panel, setPanel]           = useState<'text' | 'poll' | null>(null)

  // ── Inject / tear down edit-mode DOM effects ──────────────────
  useEffect(() => {
    if (!editMode) return

    const cleanups: (() => void)[] = []
    const markChanged = () => setHasChanges(true)

    // ── Widget drag handles ────────────────────────────────────
    const widgets = getWidgetEls()

    // Inject global edit-mode styles
    const style = document.createElement('style')
    style.textContent = `
      [data-widget-id] {
        outline: 1px dashed rgba(200,168,72,0.22) !important;
        border-radius: 1rem;
        position: relative;
      }
      [data-editable-key] {
        outline: 1px dashed rgba(200,168,72,0.4) !important;
        border-radius: 3px;
        padding: 1px 3px;
        cursor: text;
        min-width: 8px;
        display: inline-block;
      }
      [data-editable-key]:focus {
        outline: 1px solid rgba(200,168,72,0.75) !important;
        background: rgba(200,168,72,0.04);
      }
    `
    document.head.appendChild(style)
    cleanups.push(() => style.remove())

    // Per-widget: inject handle + drag logic
    widgets.forEach(widget => {
      const id = widget.dataset.widgetId!

      const handle = document.createElement('div')
      handle.style.cssText = `
        position: absolute; top: 8px; right: 8px; z-index: 20;
        display: flex; align-items: center; gap: 5px;
        padding: 4px 8px 4px 6px;
        background: rgba(12,4,24,0.92);
        border: 1px solid rgba(200,168,72,0.35);
        border-radius: 6px;
        cursor: grab;
        color: #C8A848;
        font-size: 11px;
        letter-spacing: 0.07em;
        opacity: 0;
        transition: opacity 0.15s;
        user-select: none;
        touch-action: none;
        backdrop-filter: blur(6px);
        pointer-events: auto;
        font-family: var(--font-libre-baskerville), Georgia, serif;
      `
      handle.innerHTML = `<span style="font-size:15px;opacity:.65;line-height:1">⠿</span><span style="opacity:.55;font-size:10.5px;text-transform:uppercase;letter-spacing:.1em">${WIDGET_LABELS[id] ?? id}</span>`

      widget.appendChild(handle)
      cleanups.push(() => handle.remove())

      // Show on hover
      const show = () => { handle.style.opacity = '1' }
      const hide = () => { if (!isDragging) handle.style.opacity = '0' }
      widget.addEventListener('mouseenter', show)
      widget.addEventListener('mouseleave', hide)
      cleanups.push(() => {
        widget.removeEventListener('mouseenter', show)
        widget.removeEventListener('mouseleave', hide)
      })

      // ── Pointer-capture drag ────────────────────────────────
      let isDragging = false
      let startY = 0
      let offsetY = 0

      handle.addEventListener('pointerdown', (e: PointerEvent) => {
        e.preventDefault()
        handle.setPointerCapture(e.pointerId)
        isDragging = true
        handle.style.cursor = 'grabbing'

        const rect = widget.getBoundingClientRect()
        startY = e.clientY
        offsetY = e.clientY - rect.top

        // Lift the widget visually
        widget.style.zIndex = '10'
        widget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.55)'
        widget.style.opacity = '0.75'
        widget.style.outline = '1px solid rgba(200,168,72,0.5) !important'
        handle.style.opacity = '1'
      })

      handle.addEventListener('pointermove', (e: PointerEvent) => {
        if (!isDragging) return
        const cursorY = e.clientY

        // Only reorder if moved meaningfully
        if (Math.abs(cursorY - startY) < 4) return

        const others = getWidgetEls().filter(w => w !== widget)
        let inserted = false

        for (const other of others) {
          const rect = other.getBoundingClientRect()
          if (cursorY < rect.top + rect.height / 2) {
            if (widget.nextSibling !== other) {
              other.parentNode?.insertBefore(widget, other)
            }
            inserted = true
            break
          }
        }

        if (!inserted) {
          const last = others[others.length - 1]
          if (last && last.nextSibling !== widget) {
            last.after(widget)
          }
        }
      })

      const onDragEnd = () => {
        if (!isDragging) return
        isDragging = false
        handle.style.cursor = 'grab'
        handle.style.opacity = '0'

        // Reset lift
        widget.style.zIndex = ''
        widget.style.boxShadow = ''
        widget.style.opacity = ''
        widget.style.outline = ''

        markChanged()
      }

      handle.addEventListener('pointerup', onDragEnd)
      handle.addEventListener('pointercancel', onDragEnd)
    })

    // ── Editable text ──────────────────────────────────────────
    const editables = Array.from(document.querySelectorAll<HTMLElement>('[data-editable-key]'))
    editables.forEach(el => {
      el.contentEditable = 'true'
      el.addEventListener('input', markChanged)
      cleanups.push(() => {
        el.contentEditable = 'false'
        el.removeEventListener('input', markChanged)
      })
    })

    return () => cleanups.forEach(fn => fn())
  }, [editMode])

  // ── Save ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true); setError(null)

    const order = getCurrentOrder()
    const hidden = getSavedHidden(initialContent)

    const textUpdates: Record<string, string> = {}
    document.querySelectorAll<HTMLElement>('[data-editable-key]').forEach(el => {
      textUpdates[el.dataset.editableKey!] = el.innerText.trim()
    })

    const res = await fetch('/api/admin/page-content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...textUpdates,
        dashboard_layout: JSON.stringify({ order, hidden }),
      }),
    })

    setSaving(false)
    if (res.ok) {
      setEditMode(false)
      setHasChanges(false)
      window.location.reload()
    } else {
      setError((await res.json()).error ?? 'Save failed')
    }
  }, [initialContent])

  // ── Cancel ─────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    setEditMode(false)
    setHasChanges(false)
    setPanel(null)
    // Reload to restore any DOM changes
    window.location.reload()
  }, [])

  return (
    <>
      {/* ── Edit mode top bar ── */}
      {editMode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 250,
          height: '48px',
          padding: '0 1.25rem',
          background: 'rgba(10,2,20,0.97)',
          borderBottom: '1px solid rgba(200,168,72,0.18)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.8, flexShrink: 0 }}>Editing</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.28, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Drag sections to reorder · click gold text to edit inline
          </span>

          {error && <span style={{ fontSize: '0.72rem', color: '#ff8080', flexShrink: 0 }}>{error}</span>}

          {/* Add Poll */}
          <button
            onClick={() => setPanel(p => p === 'poll' ? null : 'poll')}
            style={{ background: panel === 'poll' ? 'rgba(210,57,248,0.12)' : 'none', border: '1px solid rgba(210,57,248,0.3)', borderRadius: '0.4rem', color: '#D239F8', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.06em', flexShrink: 0 }}
          >
            + Poll
          </button>

          {/* Edit Text */}
          <button
            onClick={() => setPanel(p => p === 'text' ? null : 'text')}
            style={{ background: panel === 'text' ? 'rgba(200,168,72,0.1)' : 'none', border: '1px solid rgba(200,168,72,0.25)', borderRadius: '0.4rem', color: '#C8A848', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.06em', flexShrink: 0 }}
          >
            Edit Text
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.35rem 1rem',
              borderRadius: '0.45rem',
              border: '1px solid rgba(200,168,72,0.5)',
              background: hasChanges ? 'rgba(200,168,72,0.18)' : 'rgba(200,168,72,0.07)',
              color: '#C8A848',
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.5 : 1,
              flexShrink: 0,
              fontFamily: 'TokyoDreams, serif',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>

          {/* Cancel */}
          <button
            onClick={handleCancel}
            style={{ background: 'none', border: 'none', color: '#F3EDE6', opacity: 0.35, cursor: 'pointer', fontSize: '0.85rem', padding: '0.2rem 0.1rem', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Offset page content when edit bar is showing */}
      {editMode && (
        <style>{`body { padding-top: 48px !important; }`}</style>
      )}

      {/* ── Floating toggle button ── */}
      {!editMode && (
        <button
          onClick={() => setEditMode(true)}
          style={{
            position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 200,
            padding: '0.55rem 1.1rem', borderRadius: '9999px',
            border: '1px solid rgba(200,168,72,0.4)',
            background: 'rgba(10,0,20,0.85)', color: '#C8A848',
            fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}
        >
          ✎ Edit Page
        </button>
      )}

      {/* ── Side panels ── */}
      {editMode && panel === 'text' && (
        <TextPanel initialContent={initialContent} onClose={() => setPanel(null)} />
      )}
      {editMode && panel === 'poll' && (
        <NewPollPanel
          onCreated={() => { setPanel(null); setHasChanges(true) }}
          onClose={() => setPanel(null)}
        />
      )}
    </>
  )
}
