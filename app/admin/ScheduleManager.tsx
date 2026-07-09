'use client'

import { useState, useEffect, useRef } from 'react'
import { EventIcon } from '@/components/EventIcon'
import { AssetImagePicker } from './AssetImagePicker'
import { LoadError } from './LoadError'
import { isImageIcon } from '@/lib/icon-src'
import { rangeTo24h } from '@/lib/time-format'
import { shiftDurationHours, formatShiftRange, parseHHMM, weekdayFromISO } from '@/lib/shift-hours'
import { buildScheduleDays, type ScheduleDay } from '@/lib/schedule-days'
import { ScheduleWeekView } from './ScheduleWeekView'
import { useConfirm } from '../components/ConfirmDialog'
import { TimeField } from '../components/TimeField'

export type ScheduleEvent = {
  id: string
  day: string
  time: string
  title: string
  subtitle: string | null
  detail_desc: string | null
  icon_type: string
  sort_order: number
  visible: boolean
  highlight: boolean
  is_recurring: boolean
  capacity: number | null
  event_date: string | null
  participation_type: 'general' | 'shift' | 'mandatory'
  shift_type_id: string | null
  requires_ack: boolean
  start_time: string | null
  end_time: string | null
  needs_lead: boolean
  // Recurring only: NULL = every day; an array of ISO dates = just those days.
  recurrence_days: string[] | null
  // Off = kept off the schedule page + home teaser (still signable/ackable).
  show_on_schedule: boolean
}

// Shift types offered when an event is a Shift (Configure → Shift Types registry).
export type ShiftTypeOption = { id: string; name: string }

// One holder of a shift, from GET /api/admin/schedule/rosters (member_shift_signups).
export type RosterEntry = { clerk_user_id: string; application_id: string | null; name: string; role: 'member' | 'lead'; occurrence_date: string | null }

// Weekday fallback order — only used to sort legacy UNDATED rows among themselves.
const DAY_ORDER: Record<string, number> = {
  Wednesday: 0, Thursday: 1, Friday: 2, Saturday: 3, Sunday: 4, Monday: 5, Tuesday: 6,
}

// Parse a time string like "7:00 PM" or "7:00 PM – 10:00 PM" to minutes since midnight
function parseStartMinutes(time: string): number {
  if (!time) return 9999
  const token = time.split(/[–—-]/)[0].trim()
  const m = token.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!m) {
    if (/midnight/i.test(token)) return 24 * 60
    if (/noon/i.test(token)) return 12 * 60
    return 9999
  }
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2] ?? '0', 10)
  const period = m[3]?.toLowerCase()
  if (period === 'pm' && h < 12) h += 12
  if (period === 'am' && h === 12) h = 0
  return h * 60 + min
}

// Time orders rows within a day; title breaks ties so the order is stable.
// Structured start_time wins; the free-text parse only covers legacy rows
// that haven't been re-saved (or backfilled by migration 054) yet.
function startMinutes(e: ScheduleEvent): number {
  return parseHHMM(e.start_time) ?? parseStartMinutes(e.time)
}
function sortByTime(evs: ScheduleEvent[]): ScheduleEvent[] {
  return [...evs].sort((a, b) =>
    startMinutes(a) - startMinutes(b) || a.title.localeCompare(b.title)
  )
}

const blank = (): Omit<ScheduleEvent, 'id' | 'sort_order'> => ({
  day: '', time: '', title: '', subtitle: '', detail_desc: '',
  icon_type: '/asset-library/icons/star.webp', visible: true, highlight: false, is_recurring: false, capacity: null, event_date: null, participation_type: 'general', shift_type_id: null, requires_ack: false, start_time: null, end_time: null, needs_lead: false, recurrence_days: null, show_on_schedule: true,
})

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

function EventModal({
  initial,
  days,
  onSave,
  onClose,
  onDelete,
  saving,
  error,
  shiftTypes,
}: {
  initial: Omit<ScheduleEvent, 'id' | 'sort_order'>
  days: ScheduleDay[]
  onSave: (form: Omit<ScheduleEvent, 'id' | 'sort_order'>) => void
  onClose: () => void
  // Edit mode only — deleting an event that doesn't exist yet is meaningless.
  onDelete?: () => void
  shiftTypes: ShiftTypeOption[]
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }))

  // The weekday derives from the picked date — no separate Day dropdown to get
  // out of sync (picking the wrong Wednesday used to be an easy mistake).
  const derivedDay = weekdayFromISO(form.event_date)

  // Recurring day chips: NULL means every day (all chips lit); toggling off a
  // day materialises the subset. Re-selecting everything folds back to NULL so
  // "every day" keeps auto-covering days if the event range later grows.
  const toggleRecurrenceDay = (iso: string) => {
    const all = days.map(d => d.iso)
    const current = form.recurrence_days ?? all
    const next = current.includes(iso) ? current.filter(x => x !== iso) : [...current, iso].sort()
    set('recurrence_days', all.every(a => next.includes(a)) ? null : next)
  }

  // Non-recurring events need a real date so the schedule can place them.
  // Every event needs a start time (no free-text times); shifts also need an
  // end so their hours can be counted. Recurring subsets need ≥ 1 day.
  const canSave = !!form.title
    && (form.is_recurring || !!form.event_date)
    && !!form.start_time
    && (form.participation_type !== 'shift' || !!form.end_time)
    && (!form.is_recurring || form.recurrence_days == null || form.recurrence_days.length > 0)
  const missing = !form.title ? 'a title'
    : (!form.is_recurring && !form.event_date) ? 'a date'
    : !form.start_time ? 'a start time'
    : (form.participation_type === 'shift' && !form.end_time) ? 'an end time (shift hours need it)'
    : (form.is_recurring && form.recurrence_days != null && form.recurrence_days.length === 0) ? 'at least one repeat day'
    : null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(95vw, 580px)', maxHeight: '88vh', overflowY: 'auto',
        background: '#1A0A24', border: '1px solid rgba(200,168,72,0.25)',
        borderRadius: '1rem', padding: '1.5rem', zIndex: 50,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'TokyoDreams, serif', fontSize: '1.15rem', color: '#C8A848', margin: 0 }}>
            {initial.title ? 'Edit event' : 'New event'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#C8A848', fontSize: '1.4rem', cursor: 'pointer', opacity: 0.7 }}>×</button>
        </div>

        <Field label="Title">
          <input style={inputStyle} value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>

        {/* Date first — the weekday derives from it, shown as instant feedback. */}
        {!form.is_recurring && (
          <Field label="Date">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <input
                style={{ ...inputStyle, width: '180px' }}
                type="date"
                value={form.event_date ?? ''}
                onChange={e => set('event_date', e.target.value || null)}
              />
              <span style={{ fontSize: '0.85rem', color: derivedDay ? '#C8A848' : 'rgba(243,237,230,0.35)', letterSpacing: '0.04em', fontStyle: derivedDay ? 'normal' : 'italic' }}>
                {derivedDay ?? 'pick a date'}
              </span>
            </div>
          </Field>
        )}

        {/* Every event carries structured times — the display string derives
            from them on save. End is optional except for shifts (hours math). */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0 1rem', alignItems: 'end' }}>
          <Field label="Start">
            <TimeField value={form.start_time} onChange={v => set('start_time', v)} />
          </Field>
          <Field label={form.participation_type === 'shift' ? 'End' : 'End (optional)'}>
            <TimeField value={form.end_time} onChange={v => set('end_time', v)} durationFrom={form.start_time} />
          </Field>
          <div style={{ marginBottom: '1rem', paddingBottom: '0.6rem', fontSize: '0.82rem', color: '#C8A848', opacity: 0.75, whiteSpace: 'nowrap' }}>
            {shiftDurationHours(form.start_time, form.end_time) > 0 ? `${shiftDurationHours(form.start_time, form.end_time)}h` : '—'}
          </div>
        </div>

        {/* Recurring events pick their days here (no single date to pick above).
            All chips lit = every day, incl. days added to the range later. */}
        {form.is_recurring && (
          <Field label="Repeats on">
            {days.length === 0 ? (
              <p style={{ fontSize: '0.78rem', opacity: 0.45, lineHeight: 1.5, margin: 0 }}>
                Every day. Set the event dates in Configure → Event Dates to choose specific days.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {days.map(d => {
                    const selected = form.recurrence_days == null || form.recurrence_days.includes(d.iso)
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => toggleRecurrenceDay(d.iso)}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '9999px', cursor: 'pointer',
                          fontSize: '0.7rem', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                          border: `1px solid ${selected ? 'rgba(200,168,72,0.6)' : 'rgba(200,168,72,0.2)'}`,
                          background: selected ? 'rgba(200,168,72,0.12)' : 'transparent',
                          color: '#C8A848', opacity: selected ? 1 : 0.45,
                        }}
                      >
                        {d.short} {d.date}
                      </button>
                    )
                  })}
                </div>
                <p style={{ fontSize: '0.72rem', opacity: 0.4, lineHeight: 1.5, margin: '0.4rem 0 0' }}>
                  {form.recurrence_days == null
                    ? 'Every day — including any days later added to the event range.'
                    : `${form.recurrence_days.length} day${form.recurrence_days.length === 1 ? '' : 's'} selected.`}
                </p>
              </>
            )}
          </Field>
        )}

        {!form.is_recurring && (
          <Field label="Subtitle — shown in the At a Glance table">
            <textarea rows={2} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} value={form.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} placeholder="Short italic line under the event title in the schedule table" />
          </Field>
        )}

        <Field label={form.is_recurring ? 'Description' : 'Details — shown in the Event Details cards'}>
          <textarea rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} value={form.detail_desc ?? ''} onChange={(e) => set('detail_desc', e.target.value)} placeholder="Longer description" />
        </Field>

        <Field label="Icon">
          <AssetImagePicker
            value={isImageIcon(form.icon_type) ? form.icon_type : undefined}
            onChange={v => set('icon_type', v ?? 'star')}
            uploadUrl="/api/admin/schedule/icon"
            primaryCategory="icon"
            label="Event icon"
          />
        </Field>

        <Field label="Participation">
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.participation_type}
            onChange={e => set('participation_type', e.target.value)}
          >
            <option value="general">General — just happening, optional</option>
            <option value="shift">Shift — members sign up</option>
            <option value="mandatory">Mandatory — everyone attends</option>
          </select>
        </Field>

        {form.participation_type === 'shift' && (
          <>
            <Field label="Shift type">
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.shift_type_id ?? ''}
                onChange={e => set('shift_type_id', e.target.value || null)}
              >
                <option value="">Select…</option>
                {shiftTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <p style={{ fontSize: '0.72rem', opacity: 0.4, lineHeight: 1.5, margin: '0.35rem 0 0' }}>
                Kinds are defined in Configure → Shift Types. Requirements (who owes hours) live on groups/roles or attunement tasks.
              </p>
            </Field>
            <Field label="Lead role">
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={form.needs_lead}
                  onChange={e => set('needs_lead', e.target.checked)}
                  style={{ marginTop: '0.2rem', accentColor: '#C8A848', cursor: 'pointer' }}
                />
                <span style={{ opacity: 0.75, lineHeight: 1.5 }}>
                  This shift has a lead ✦ — members are offered &ldquo;I&rsquo;d like to be the shift lead&rdquo; when they sign up
                </span>
              </label>
            </Field>
            <Field label="Capacity per slot (optional — blank = unlimited)">
              <input
                style={{ ...inputStyle, width: '120px' }}
                type="number"
                min={1}
                placeholder="e.g. 20"
                value={form.capacity ?? ''}
                onChange={e => set('capacity', e.target.value === '' ? null : parseInt(e.target.value) || null)}
              />
            </Field>
          </>
        )}

        {form.participation_type === 'mandatory' && (
          <div style={{ marginBottom: '1rem' }}>
            <Toggle checked={form.requires_ack} onChange={(v) => set('requires_ack', v)} label="Requires acknowledgement (members tap “I'll be there”)" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem', marginBottom: '1.25rem' }}>
          <Toggle checked={form.visible} onChange={(v) => set('visible', v)} label="Visible" />
          <Toggle checked={form.highlight} onChange={(v) => set('highlight', v)} label="Highlight day" />
          <Toggle checked={form.is_recurring} onChange={(v) => set('is_recurring', v)} label="Recurring" />
          {/* Off = not on the schedule page / home teaser, but members can
              still sign up or acknowledge it (unlike Visible, which hides it
              from members everywhere). */}
          <Toggle checked={form.show_on_schedule} onChange={(v) => set('show_on_schedule', v)} label="Show on schedule page" />
        </div>

        {error && <p style={{ color: '#ff8a8a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* Delete lives here too — from the week view the modal is the only
              way to reach an event, so it can't be list-row-only. */}
          {onDelete && (
            <button onClick={onDelete} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(255,100,100,0.25)', background: 'transparent', color: '#ff8a8a', cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7, marginRight: 'auto' }}>
              Delete
            </button>
          )}
          {missing && (
            <span style={{ fontSize: '0.72rem', color: '#C8A848', opacity: 0.55, fontStyle: 'italic', marginRight: onDelete ? undefined : 'auto' }}>
              Needs {missing}
            </span>
          )}
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.2)', background: 'transparent', color: '#F3EDE6', cursor: 'pointer', fontSize: '0.82rem', opacity: 0.7 }}>
            Cancel
          </button>
          <button onClick={() => onSave(form)} disabled={saving || !canSave} style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.45)', background: 'transparent', color: '#FFFACD', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.05em', opacity: (saving || !canSave) ? 0.5 : 1 }}>
            {saving ? 'Saving…' : 'Save event'}
          </button>
        </div>
      </div>
    </>
  )
}

const PARTICIPATION_BADGE: Record<string, string> = { general: '#8fb0d0', shift: '#D239F8', mandatory: '#C8A848' }

// Drag-reorder only exists where order is real: recurring events render in
// sort_order on the member schedule. Dated events order by date + time, so
// their rows aren't draggable.
type DragHandlers = {
  isDragOver: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}

function EventRow({
  event,
  shiftTypeName,
  showDay,
  subLabel,
  drag,
  roster,
  onEdit,
  onDelete,
  onToggleVisible,
}: {
  event: ScheduleEvent
  shiftTypeName?: string
  showDay?: boolean
  subLabel?: string
  drag?: DragHandlers
  roster?: React.ReactNode
  onEdit: () => void
  onDelete: () => void
  onToggleVisible: () => void
}) {
  return (
    <div
      draggable={!!drag}
      onDragStart={drag?.onDragStart}
      onDragOver={drag?.onDragOver}
      onDrop={drag?.onDrop}
      onDragEnd={drag?.onDragEnd}
      style={{
        padding: '0.6rem 1rem', borderRadius: '0.65rem',
        border: drag?.isDragOver
          ? '1px solid rgba(200,168,72,0.5)'
          : '1px solid rgba(200,168,72,0.12)',
        background: drag?.isDragOver
          ? 'rgba(200,168,72,0.07)'
          : event.visible ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.005)',
        opacity: event.visible ? 1 : 0.5,
        cursor: drag ? 'grab' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
    {/* flexWrap: on phone widths the badge/action cluster drops to its own
        right-aligned line instead of shoving Edit/✕ past the viewport edge */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      {/* Drag handle (recurring only) */}
      {drag && (
        <div style={{ color: '#C8A848', opacity: 0.25, flexShrink: 0, fontSize: '1rem', lineHeight: 1, userSelect: 'none' }}>
          ⠿
        </div>
      )}

      {/* Time column — aligned down the day, so the eye reads a timetable */}
      <div style={{ width: '6.2rem', flexShrink: 0, fontSize: '0.72rem', lineHeight: 1.4, color: '#C8A848', opacity: event.time ? 0.75 : 0.3 }}>
        {event.time || '—'}
      </div>

      {/* Icon */}
      <div style={{ color: '#C8A848', opacity: 0.45, flexShrink: 0 }}>
        <EventIcon type={event.icon_type} size={18} />
      </div>

      {/* Title (+ weekday name for undated legacy rows) — the 10rem basis is
          what triggers the wrap before the title column gets crushed */}
      <div style={{ flex: '1 1 10rem', minWidth: 0 }}>
        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F3EDE6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.title}
          {event.highlight && <span style={{ color: '#C8A848', opacity: 0.7, marginLeft: '0.4rem' }}>✦</span>}
        </p>
        {(subLabel ?? (showDay && event.day ? event.day : null)) && (
          <p style={{ fontSize: '0.68rem', color: '#C8A848', opacity: 0.5, margin: '0.1rem 0 0', letterSpacing: '0.06em' }}>{subLabel ?? event.day}</p>
        )}
      </div>

      {/* Participation badge — shift shows its shift-type name */}
      {event.participation_type !== 'general' && (
        <span style={{ fontSize: '0.6rem', color: PARTICIPATION_BADGE[event.participation_type] ?? '#C8A848', opacity: 0.9, border: `1px solid ${(PARTICIPATION_BADGE[event.participation_type] ?? '#C8A848')}55`, borderRadius: '9999px', padding: '0.1rem 0.5rem', flexShrink: 0, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          {event.participation_type === 'shift' ? (shiftTypeName ?? 'Shift') : 'Mandatory'}
        </span>
      )}
      {!event.show_on_schedule && (
        <span
          title="Not shown on the schedule page or home teaser (members can still sign up / acknowledge)"
          style={{ fontSize: '0.6rem', color: '#C8A848', opacity: 0.55, border: '1px dashed rgba(200,168,72,0.35)', borderRadius: '9999px', padding: '0.1rem 0.5rem', flexShrink: 0, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}
        >
          off schedule
        </span>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, marginLeft: 'auto' }}>
        <button
          onClick={onToggleVisible}
          title={event.visible ? 'Visible to members — click to hide' : 'Hidden from members — click to show'}
          aria-label={event.visible ? 'Visible to members — click to hide' : 'Hidden from members — click to show'}
          style={{ background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.6 }}
        >
          {event.visible ? '●' : '○'}
        </button>
        <button onClick={onEdit} style={{ background: 'none', border: '1px solid rgba(200,168,72,0.2)', borderRadius: '0.4rem', color: '#C8A848', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.6 }}>
          Edit
        </button>
        <button onClick={onDelete} style={{ background: 'none', border: '1px solid rgba(255,100,100,0.2)', borderRadius: '0.4rem', color: '#ff8a8a', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', opacity: 0.5 }}>
          ✕
        </button>
      </div>
    </div>
    {roster}
    </div>
  )
}

// Compact roster under a shift row: count vs capacity, then one chip per holder
// (✦ = lead). Chips toggle lead/member with the same set_shift_role PATCH the
// member page uses — so the digest's "full but no lead" flag is fixable right
// here. Legacy-only holds can't carry a role, so their chip is inert. A
// recurring shift breaks out one line per night (each is a regular shift).
function ShiftRosterLine({ event, entries, label, busyKey, onToggleLead }: {
  event: ScheduleEvent
  entries: RosterEntry[]
  label: string | null
  busyKey: string | null
  onToggleLead: (entry: RosterEntry) => void
}) {
  const n = entries.length
  const hasLead = entries.some(e => e.role === 'lead')
  const full = event.capacity != null && n >= event.capacity
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
      {label && (
        <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.7, whiteSpace: 'nowrap', minWidth: '3.4rem' }}>
          {label}
        </span>
      )}
      <span style={{ fontSize: '0.68rem', color: full ? '#C8A848' : '#F3EDE6', opacity: full ? 0.85 : 0.4, whiteSpace: 'nowrap' }}>
        {n}{event.capacity != null ? ` / ${event.capacity}` : ''} signed up
      </span>
      {event.needs_lead && n > 0 && !hasLead && (
        <span style={{ fontSize: '0.62rem', color: '#C8A848', border: '1px solid rgba(200,168,72,0.4)', borderRadius: '9999px', padding: '0.08rem 0.5rem', whiteSpace: 'nowrap' }}>
          ✦ no lead yet
        </span>
      )}
      {entries.map(e => {
        const busy = busyKey === `${event.id}|${e.clerk_user_id}|${e.occurrence_date ?? ''}`
        const lead = e.role === 'lead'
        return (
          <span key={`${e.clerk_user_id}|${e.occurrence_date ?? ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
            <button
              onClick={() => onToggleLead(e)}
              disabled={busy}
              title={lead ? 'Demote to member' : 'Make shift lead ✦'}
              style={{
                background: 'none', borderRadius: '9999px', padding: '0.12rem 0.55rem',
                fontSize: '0.68rem', whiteSpace: 'nowrap',
                border: `1px solid ${lead ? 'rgba(200,168,72,0.45)' : 'rgba(255,255,255,0.12)'}`,
                color: lead ? '#C8A848' : '#F3EDE6',
                cursor: 'pointer',
                opacity: busy ? 0.35 : lead ? 0.95 : 0.65,
              }}
            >
              {lead && <span style={{ marginRight: '0.3rem' }}>✦</span>}
              {e.name}
            </button>
            {e.application_id && (
              <a
                href={`/admin/${e.application_id}`}
                title={`View ${e.name}'s application`}
                style={{ fontSize: '0.6rem', color: '#C8A848', opacity: 0.4, textDecoration: 'none' }}
              >
                ↗
              </a>
            )}
          </span>
        )
      })}
    </div>
  )
}

function ShiftRoster({ event, entries, busyKey, error, onToggleLead }: {
  event: ScheduleEvent
  entries: RosterEntry[]
  busyKey: string | null
  error: string | null
  onToggleLead: (entry: RosterEntry) => void
}) {
  // Non-recurring: one line (occurrence null). Recurring: one line per night
  // that has holders, labelled by date, ordered chronologically.
  const nights = event.is_recurring
    ? Array.from(new Set(entries.map(e => e.occurrence_date ?? ''))).sort()
    : ['']
  return (
    <div style={{ marginTop: '0.5rem', paddingLeft: '6.95rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {nights.map(night => {
        const lineEntries = entries.filter(e => (e.occurrence_date ?? '') === night)
        if (event.is_recurring && lineEntries.length === 0) return null
        const label = event.is_recurring && night
          ? (() => { const d = new Date(`${night}T12:00:00`); return isNaN(d.getTime()) ? night : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })()
          : null
        return (
          <ShiftRosterLine
            key={night || 'single'}
            event={event}
            entries={lineEntries}
            label={label}
            busyKey={busyKey}
            onToggleLead={onToggleLead}
          />
        )
      })}
      {error && <span style={{ fontSize: '0.68rem', color: '#ff8a8a' }}>{error}</span>}
    </div>
  )
}

// Section header shared by the day groups: label · count · hairline · add.
function GroupHeader({ label, sub, count, onAdd, addLabel, color = '#C8A848' }: {
  label: string
  sub?: string
  count?: number
  onAdd?: () => void
  addLabel?: string
  color?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.6rem' }}>
      <span style={{ fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color, opacity: 0.75, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {sub && <span style={{ fontSize: '0.68rem', color: '#F3EDE6', opacity: 0.35, whiteSpace: 'nowrap' }}>{sub}</span>}
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: '0.68rem', color: '#F3EDE6', opacity: 0.3 }}>{count}</span>
      )}
      <span style={{ flex: 1, height: '1px', alignSelf: 'center', background: `linear-gradient(90deg, ${color}26, transparent)` }} />
      {onAdd && (
        <button
          onClick={onAdd}
          style={{ background: 'none', border: 'none', color, cursor: 'pointer', fontSize: '0.72rem', letterSpacing: '0.06em', opacity: 0.55, padding: 0, whiteSpace: 'nowrap' }}
        >
          {addLabel ?? '+ Add'}
        </button>
      )}
    </div>
  )
}

export function ScheduleManager({ rangeStart, rangeEnd, initialEvents, initialShiftTypes, initialRosters, children }: {
  rangeStart?: string
  rangeEnd?: string
  // Server-rendered pages pass these (docs/architecture.md → Auth → "Server-
  // rendered section data") so the manager paints populated; the mount fetches
  // below run only when a prop is absent. The API routes stay the refresh path.
  initialEvents?: ScheduleEvent[]
  initialShiftTypes?: ShiftTypeOption[]
  initialRosters?: Record<string, RosterEntry[]>
  children?: React.ReactNode
}) {
  const [events, setEvents] = useState<ScheduleEvent[]>(initialEvents ?? [])
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeOption[]>(initialShiftTypes ?? [])
  const [rosters, setRosters] = useState<Record<string, RosterEntry[]>>(initialRosters ?? {})
  const [rosterBusy, setRosterBusy] = useState<string | null>(null)
  const [rosterError, setRosterError] = useState<{ eventId: string; message: string } | null>(null)
  const [loading, setLoading] = useState(initialEvents === undefined)
  const [loadError, setLoadError] = useState(false)
  const [modal, setModal] = useState<{ mode: 'add'; recurring: boolean; date?: string; time?: string } | { mode: 'edit'; event: ScheduleEvent } | null>(null)
  const [view, setView] = useState<'list' | 'week'>('list')

  // The toggle remembers itself across visits (it kept resetting to List).
  // Read after mount — the server render can't see localStorage.
  useEffect(() => {
    if (localStorage.getItem('admin-schedule-view') === 'week') setView('week')
  }, [])
  const switchView = (v: 'list' | 'week') => {
    setView(v)
    try { localStorage.setItem('admin-schedule-view', v) } catch {}
  }
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const draggedId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const { confirm, confirmDialog } = useConfirm()

  const load = async () => {
    setLoadError(false)
    try {
      const res = await fetch('/api/admin/schedule')
      if (!res.ok) throw new Error()
      const json = await res.json()
      // API order = sort_order, which recurring rows rely on; day groups re-sort by time.
      setEvents(json.events)
    } catch {
      setLoadError(true)
    }
    setLoading(false)
  }

  useEffect(() => { if (initialEvents === undefined) load() }, [])

  useEffect(() => {
    if (initialShiftTypes !== undefined) return
    fetch('/api/admin/shift-types')
      .then(r => r.json())
      .then(d => setShiftTypes((d.shiftTypes ?? []).map((t: ShiftTypeOption) => ({ id: t.id, name: t.name }))))
      .catch(() => setShiftTypes([]))
  }, [])

  useEffect(() => {
    if (initialRosters !== undefined) return
    fetch('/api/admin/schedule/rosters')
      .then(r => r.json())
      .then(d => setRosters(d.rosters ?? {}))
      .catch(() => setRosters({}))
  }, [])

  const dated = events.filter((e) => !e.is_recurring && e.event_date)
  const undated = [...events.filter((e) => !e.is_recurring && !e.event_date)].sort(
    (a, b) => ((DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99)) || (parseStartMinutes(a.time) - parseStartMinutes(b.time))
  )
  const recurring = events.filter((e) => e.is_recurring)

  // Same day model as the member calendar: configured range ∪ every event date.
  const days = buildScheduleDays(dated.map((e) => e.event_date), rangeStart, rangeEnd)
  const eventsOn = (iso: string) => sortByTime(dated.filter((e) => e.event_date === iso))

  const jumpTo = (key: string) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSave = async (form: Omit<ScheduleEvent, 'id' | 'sort_order'>) => {
    setSaving(true)
    setModalError(null)
    // The display `time` derives from structured start/end for every event —
    // the modal requires a start, so the fallback to the old text only guards
    // against an empty result ever wiping a legacy display line.
    const time = formatShiftRange(form.start_time, form.end_time) || form.time
    const normalised = { ...form, time }
    try {
      let res: Response
      if (modal?.mode === 'edit') {
        res = await fetch(`/api/admin/schedule/${modal.event.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(normalised),
        })
      } else {
        res = await fetch('/api/admin/schedule', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(normalised),
        })
      }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      await load()
      setModal(null)
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  // Returns whether the event was actually deleted, so the edit modal knows
  // whether to close (a cancelled confirm keeps it open).
  const handleDelete = async (id: string): Promise<boolean> => {
    const ev = events.find(e => e.id === id)
    const ok = await confirm({
      title: `Delete ${ev ? `“${ev.title}”` : 'this event'}?`,
      confirmLabel: 'Delete event',
      danger: true,
    })
    if (!ok) return false
    await fetch(`/api/admin/schedule/${id}`, { method: 'DELETE' })
    setEvents((prev) => prev.filter((e) => e.id !== id))
    return true
  }

  // Drop from the week grid: same-shape PATCH as the modal (structured times +
  // derived display string; the server re-derives `day` from event_date).
  // Optimistic — the block stays where it landed, and snaps back on failure.
  const handleMove = async (id: string, dateIso: string, start: string, end: string | null) => {
    const ev = events.find(e => e.id === id)
    if (!ev) return
    const prev = events
    const time = formatShiftRange(start, end) || ev.time
    setMoveError(null)
    setEvents(p => p.map(e => e.id === id
      ? { ...e, event_date: dateIso, day: weekdayFromISO(dateIso) ?? e.day, start_time: start, end_time: end, time }
      : e))
    try {
      const res = await fetch(`/api/admin/schedule/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_date: dateIso, start_time: start, end_time: end, time }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error) }
    } catch (e: unknown) {
      setEvents(prev)
      setMoveError(e instanceof Error && e.message ? e.message : 'Something went wrong — the event snapped back')
    }
  }

  const handleToggleVisible = async (event: ScheduleEvent) => {
    await fetch(`/api/admin/schedule/${event.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !event.visible }),
    })
    setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, visible: !e.visible } : e))
  }

  // Reorder within the recurring group (the only group where sort_order shows).
  const handleDropRecurring = async (targetId: string) => {
    const fromId = draggedId.current
    if (!fromId || fromId === targetId) return
    setDragOverId(null)
    draggedId.current = null

    const fromIdx = recurring.findIndex((e) => e.id === fromId)
    const toIdx = recurring.findIndex((e) => e.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return

    const reordered = [...recurring]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setEvents((prev) => [...prev.filter((e) => !e.is_recurring), ...reordered])

    await Promise.all(
      reordered.map((e, i) =>
        fetch(`/api/admin/schedule/${e.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: i + 1 }),
        })
      )
    )
  }

  const dragHandlersFor = (ev: ScheduleEvent): DragHandlers => ({
    isDragOver: dragOverId === ev.id,
    onDragStart: () => { draggedId.current = ev.id },
    onDragOver: (e) => { e.preventDefault(); setDragOverId(ev.id) },
    onDrop: () => handleDropRecurring(ev.id),
    onDragEnd: () => { draggedId.current = null; setDragOverId(null) },
  })

  const openAdd = (date?: string, time?: string) => { setModal({ mode: 'add', recurring: false, date, time }); setModalError(null) }
  // Legacy rows (pre-054, or unparseable by the backfill) may have only the
  // free-text `time` — prefill Start/End from it so editing doesn't demand
  // retyping a time the row already knows.
  const openEdit = (ev: ScheduleEvent) => {
    const legacy = ev.start_time ? { start: ev.start_time, end: ev.end_time } : (() => {
      const r = rangeTo24h(ev.time)
      return { start: r.start, end: ev.end_time ?? r.end }
    })()
    setModal({ mode: 'edit', event: { ...ev, start_time: legacy.start, end_time: legacy.end } })
    setModalError(null)
  }

  // Promote/demote a lead right on the roster — same endpoint as the member
  // page's "Make lead" (PATCH /api/admin/signups/[userId], set_shift_role).
  const handleToggleLead = async (eventId: string, entry: RosterEntry) => {
    setRosterBusy(`${eventId}|${entry.clerk_user_id}|${entry.occurrence_date ?? ''}`)
    setRosterError(null)
    const role = entry.role === 'lead' ? 'member' : 'lead'
    try {
      const res = await fetch(`/api/admin/signups/${entry.clerk_user_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        // occurrence_date scopes the lead to the specific night held.
        body: JSON.stringify({ set_shift_role: { schedule_event_id: eventId, role, occurrence_date: entry.occurrence_date } }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setRosters(prev => ({
        ...prev,
        [eventId]: (prev[eventId] ?? []).map(e =>
          e.clerk_user_id === entry.clerk_user_id && e.occurrence_date === entry.occurrence_date ? { ...e, role } : e),
      }))
    } catch (e: unknown) {
      setRosterError({ eventId, message: e instanceof Error ? e.message : 'Something went wrong' })
    } finally {
      setRosterBusy(null)
    }
  }

  // "Every day" or the picked dates ("Jul 22 · Jul 24") under a recurring row.
  const recurrenceLabel = (ev: ScheduleEvent) => ev.recurrence_days == null
    ? 'Every day'
    : [...ev.recurrence_days].sort().map(iso => {
        const d = new Date(`${iso}T12:00:00`)
        return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }).join(' · ') || 'No days selected'

  const rowProps = (ev: ScheduleEvent) => ({
    event: ev,
    shiftTypeName: shiftTypes.find((t) => t.id === ev.shift_type_id)?.name,
    roster: ev.participation_type === 'shift' ? (
      <ShiftRoster
        event={ev}
        entries={rosters[ev.id] ?? []}
        busyKey={rosterBusy}
        error={rosterError?.eventId === ev.id ? rosterError.message : null}
        onToggleLead={(entry) => handleToggleLead(ev.id, entry)}
      />
    ) : undefined,
    onEdit: () => openEdit(ev),
    onDelete: () => handleDelete(ev.id),
    onToggleVisible: () => handleToggleVisible(ev),
  })

  const chipStyle = (color = '#C8A848'): React.CSSProperties => ({
    flexShrink: 0, padding: '0.35rem 0.8rem', borderRadius: '9999px',
    border: `1px solid ${color}33`, background: 'transparent',
    color, cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.08em',
    whiteSpace: 'nowrap', opacity: 0.75,
  })

  if (loading || loadError) return (
    <div>
      {children}
      {loading
        ? <p style={{ opacity: 0.4, fontStyle: 'italic', fontSize: '0.875rem', marginTop: '0.75rem' }}>Loading…</p>
        : <LoadError onRetry={() => { setLoading(true); load() }} />}
    </div>
  )

  return (
    <div>
      {/* One controls row opens the workspace: the shift-signup pill (rides
          in as children) on the left, view + add on the right. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>{children}</div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* List ⇄ Week: the list is the working roster; the week grid shows
              time as space (overlaps, gaps, lopsided days). */}
          <div style={{ display: 'flex', border: '1px solid rgba(200,168,72,0.25)', borderRadius: '9999px', overflow: 'hidden' }}>
            {(['list', 'week'] as const).map(v => (
              <button
                key={v}
                onClick={() => switchView(v)}
                style={{
                  padding: '0.45rem 0.9rem', border: 'none', cursor: 'pointer',
                  fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'capitalize',
                  background: view === v ? 'rgba(200,168,72,0.15)' : 'transparent',
                  color: '#C8A848', opacity: view === v ? 1 : 0.5,
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '9999px', border: '1px solid rgba(200,168,72,0.25)', background: 'transparent', color: '#C8A848', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.06em', opacity: 0.75 }}
            onClick={() => openAdd()}
          >
            + Add event
          </button>
        </div>
      </div>

      {/* Week view — day columns × hour axis; click empty slot to add there,
          drag a block to move it to a new time/day */}
      {view === 'week' && (
        <div style={{ marginBottom: '1.5rem' }}>
          {moveError && (
            <p style={{ color: '#ff8a8a', fontSize: '0.78rem', margin: '0 0 0.6rem' }}>{moveError}</p>
          )}
          <ScheduleWeekView
            events={events}
            days={days}
            shiftTypes={shiftTypes}
            rosters={rosters}
            onEdit={id => { const ev = events.find(e => e.id === id); if (ev) openEdit(ev) }}
            onAddAt={(iso, time) => openAdd(iso, time)}
            onMove={handleMove}
          />
        </div>
      )}

      {/* Day rail — one chip per day, click to jump */}
      {view === 'list' && (days.length > 1 || undated.length > 0 || recurring.length > 0) && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingBottom: '0.4rem', marginBottom: '1.25rem' }}>
          {days.map((d) => {
            const n = eventsOn(d.iso).length
            return (
              <button key={d.iso} style={{ ...chipStyle(), opacity: n > 0 ? 0.85 : 0.4 }} onClick={() => jumpTo(d.iso)}>
                {d.short} {d.date}
              </button>
            )
          })}
          {undated.length > 0 && (
            <button style={chipStyle('#ff8a8a')} onClick={() => jumpTo('undated')}>Undated</button>
          )}
          {recurring.length > 0 && (
            <button style={chipStyle('#D239F8')} onClick={() => jumpTo('recurring')}>Recurring</button>
          )}
        </div>
      )}

      {/* Day sections */}
      {days.length === 0 && undated.length === 0 && (
        <p style={{ opacity: 0.35, fontStyle: 'italic', fontSize: '0.82rem' }}>
          No events yet. Set the event dates in Configure → Event Dates to lay out the days, or add a dated event.
        </p>
      )}
      {view === 'list' && days.map((d) => {
        const dayEvents = eventsOn(d.iso)
        return (
          <div key={d.iso} ref={(el) => { sectionRefs.current[d.iso] = el }} style={{ marginBottom: '1.5rem', scrollMarginTop: '5.5rem' }}>
            <GroupHeader
              label={`${d.label} · ${d.month} ${d.date}`}
              count={dayEvents.length}
              onAdd={() => openAdd(d.iso)}
            />
            {dayEvents.length === 0 ? (
              <p style={{ opacity: 0.25, fontStyle: 'italic', fontSize: '0.78rem', margin: '0 0 0 1rem' }}>Nothing scheduled.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {dayEvents.map((ev) => <EventRow key={ev.id} {...rowProps(ev)} />)}
              </div>
            )}
          </div>
        )
      })}

      {/* Undated legacy rows — they need a real date to sit on the calendar */}
      {undated.length > 0 && (
        <div ref={(el) => { sectionRefs.current['undated'] = el }} style={{ marginBottom: '1.5rem', scrollMarginTop: '5.5rem' }}>
          <GroupHeader label="Undated" sub="edit each event to give it a date" count={undated.length} color="#ff8a8a" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {undated.map((ev) => <EventRow key={ev.id} {...rowProps(ev)} showDay />)}
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,72,0.15), transparent)', margin: '0 0 1.5rem' }} />

      {/* Recurring events — order here is their display order, so drag persists */}
      <div ref={(el) => { sectionRefs.current['recurring'] = el }} style={{ scrollMarginTop: '5.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D239F8', opacity: 0.55, margin: 0 }}>
            Recurring — {recurring.length}
          </p>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '9999px', border: '1px solid rgba(210,57,248,0.25)', background: 'transparent', color: '#D239F8', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.06em', opacity: 0.75 }}
            onClick={() => { setModal({ mode: 'add', recurring: true }); setModalError(null) }}
          >
            + Add recurring
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {recurring.length === 0 && <p style={{ opacity: 0.35, fontStyle: 'italic', fontSize: '0.82rem' }}>No recurring events yet.</p>}
          {recurring.map((ev) => <EventRow key={ev.id} {...rowProps(ev)} subLabel={recurrenceLabel(ev)} drag={dragHandlersFor(ev)} />)}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <EventModal
          initial={modal.mode === 'edit'
            ? modal.event
            : { ...blank(), is_recurring: modal.recurring, event_date: modal.date ?? null, start_time: modal.time ?? null }}
          days={days}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal.mode === 'edit'
            ? async () => { if (await handleDelete(modal.event.id)) setModal(null) }
            : undefined}
          saving={saving}
          error={modalError}
          shiftTypes={shiftTypes}
        />
      )}

      {confirmDialog}
    </div>
  )
}
