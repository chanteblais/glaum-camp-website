'use client'

import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type RawConfig = Record<string, string>

// ── Helpers ───────────────────────────────────────────────────────────────────

function bool(config: RawConfig, key: string, defaultVal = true): boolean {
  if (!(key in config)) return defaultVal
  return config[key] !== 'false'
}

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({ checked, disabled, onChange, color = '#C8A848' }: {
  checked: boolean; disabled: boolean; onChange: () => void; color?: string
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-pressed={checked}
      style={{
        width: '40px', height: '22px', borderRadius: '9999px', flexShrink: 0,
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? color : 'rgba(255,255,255,0.12)',
        transition: 'background 0.2s',
        position: 'relative',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '21px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: checked ? '#1A0A24' : 'rgba(255,255,255,0.5)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

// ── StatusBanner ──────────────────────────────────────────────────────────────

function StatusBanner({ open, saving, onToggle }: {
  open: boolean; saving: boolean; onToggle: () => void
}) {
  return (
    <div style={{
      padding: '1rem 1.25rem',
      borderRadius: '0.65rem',
      border: `1px solid ${open ? 'rgba(200,168,72,0.3)' : 'rgba(255,80,80,0.3)'}`,
      background: open ? 'rgba(200,168,72,0.05)' : 'rgba(255,80,80,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem',
      marginBottom: '1.5rem',
    }}>
      <div>
        <p style={{ margin: '0 0 0.15rem', fontSize: '0.88rem', fontWeight: 600, color: open ? '#C8A848' : '#ff8080' }}>
          Applications {open ? 'open' : 'closed'}
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.5 }}>
          {open ? 'New submissions are being accepted.' : 'This form is hidden from new visitors.'}
        </p>
      </div>
      <Toggle checked={open} disabled={saving} onChange={onToggle} color={open ? '#C8A848' : '#ff8080'} />
    </div>
  )
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────

function ToggleRow({ label, description, checked, saving, onToggle }: {
  label: string; description: string; checked: boolean; saving: boolean; onToggle: () => void
}) {
  return (
    <div style={{
      padding: '0.7rem 1rem',
      borderRadius: '0.5rem',
      border: '1px solid rgba(200,168,72,0.1)',
      background: 'rgba(200,168,72,0.02)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem',
    }}>
      <div>
        <p style={{ margin: '0 0 0.1rem', fontSize: '0.83rem', color: '#F3EDE6', opacity: checked ? 1 : 0.5 }}>{label}</p>
        <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.35 }}>{description}</p>
      </div>
      <Toggle checked={checked} disabled={saving} onChange={onToggle} />
    </div>
  )
}

// ── SubSection ────────────────────────────────────────────────────────────────

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <p style={{ fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D9B3FF', opacity: 0.55, margin: '0 0 0.5rem' }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {children}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConfigManager({ initialConfig }: { initialConfig: RawConfig }) {
  const [config, setConfig] = useState<RawConfig>(initialConfig)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'member' | 'volunteer'>('member')

  async function toggle(key: string) {
    const current = bool(config, key)
    const next = !current
    setSaving(key)
    setError(null)
    try {
      const res = await fetch('/api/admin/page-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: String(next) }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save')
      } else {
        setConfig(prev => ({ ...prev, [key]: String(next) }))
      }
    } catch {
      setError('Network error')
    }
    setSaving(null)
  }

  const tab = (id: 'member' | 'volunteer', label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '0.45rem 1.1rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        letterSpacing: '0.08em',
        border: activeTab === id ? '1px solid rgba(210,57,248,0.5)' : '1px solid rgba(200,168,72,0.2)',
        color: activeTab === id ? '#D239F8' : '#F3EDE6',
        background: activeTab === id ? 'rgba(210,57,248,0.08)' : 'transparent',
        cursor: 'pointer',
        opacity: activeTab === id ? 1 : 0.55,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {tab('member', 'Camp Member Application')}
        {tab('volunteer', 'Volunteer Signup')}
      </div>

      {/* ── MEMBER TAB ── */}
      {activeTab === 'member' && (
        <div>
          <StatusBanner
            open={bool(config, 'config_applications_open')}
            saving={saving === 'config_applications_open'}
            onToggle={() => toggle('config_applications_open')}
          />

          <SubSection label="Step I · Basic Information">
            <ToggleRow label="Instagram" description="@handle field" checked={bool(config, 'config_show_instagram')} saving={saving === 'config_show_instagram'} onToggle={() => toggle('config_show_instagram')} />
            <ToggleRow label="Location" description="'Where are you travelling from?' field" checked={bool(config, 'config_show_location')} saving={saving === 'config_show_location'} onToggle={() => toggle('config_show_location')} />
            <ToggleRow label="Referral" description="'Who referred you?' field" checked={bool(config, 'config_show_referral')} saving={saving === 'config_show_referral'} onToggle={() => toggle('config_show_referral')} />
          </SubSection>

          <SubSection label="Step II · Many Hands Registry">
            <ToggleRow label="About you" description="'What are you currently excited about?'" checked={bool(config, 'config_show_about_you')} saving={saving === 'config_show_about_you'} onToggle={() => toggle('config_show_about_you')} />
            <ToggleRow label="Special skills" description="'What special skills do you possess?'" checked={bool(config, 'config_show_special_skills')} saving={saving === 'config_show_special_skills'} onToggle={() => toggle('config_show_special_skills')} />
            <ToggleRow label="Find at camp" description="'What would we find you doing at camp?'" checked={bool(config, 'config_show_find_at_camp')} saving={saving === 'config_show_find_at_camp'} onToggle={() => toggle('config_show_find_at_camp')} />
            <ToggleRow label="Attunement status" description="Current attunement status question" checked={bool(config, 'config_show_attunement')} saving={saving === 'config_show_attunement'} onToggle={() => toggle('config_show_attunement')} />
          </SubSection>

          <SubSection label="Step III · What If Plans">
            <ToggleRow label="Arrival &amp; departure dates" description="Approximate date pickers" checked={bool(config, 'config_show_dates')} saving={saving === 'config_show_dates'} onToggle={() => toggle('config_show_dates')} />
            <ToggleRow label="Vehicle &amp; structures" description="Vehicle info and tent/structure fields" checked={bool(config, 'config_show_vehicle_structures')} saving={saving === 'config_show_vehicle_structures'} onToggle={() => toggle('config_show_vehicle_structures')} />
            <ToggleRow label="Rideshare" description="Rideshare status section" checked={bool(config, 'config_show_rideshare')} saving={saving === 'config_show_rideshare'} onToggle={() => toggle('config_show_rideshare')} />
          </SubSection>

          <SubSection label="Step IV · Participation &amp; Roles">
            <ToggleRow label="Department interests" description="Which departments interest you?" checked={bool(config, 'config_show_dept_interests')} saving={saving === 'config_show_dept_interests'} onToggle={() => toggle('config_show_dept_interests')} />
            <ToggleRow label="Leadership interest" description="Interested in a leadership role?" checked={bool(config, 'config_show_leadership_interest')} saving={saving === 'config_show_leadership_interest'} onToggle={() => toggle('config_show_leadership_interest')} />
            <ToggleRow label="Setup limitations" description="Limitations for setup/teardown participation" checked={bool(config, 'config_show_setup_limitations')} saving={saving === 'config_show_setup_limitations'} onToggle={() => toggle('config_show_setup_limitations')} />
            <ToggleRow label="Participation notes" description="'What brings you to Glåüm this year?'" checked={bool(config, 'config_show_setup_notes')} saving={saving === 'config_show_setup_notes'} onToggle={() => toggle('config_show_setup_notes')} />
          </SubSection>

          <SubSection label="Step VI · Shrimp">
            <ToggleRow label="Shrimp question" description="Show/hide the entire shrimp step" checked={bool(config, 'config_show_shrimp')} saving={saving === 'config_show_shrimp'} onToggle={() => toggle('config_show_shrimp')} />
          </SubSection>
        </div>
      )}

      {/* ── VOLUNTEER TAB ── */}
      {activeTab === 'volunteer' && (
        <div>
          <StatusBanner
            open={bool(config, 'config_volunteer_open')}
            saving={saving === 'config_volunteer_open'}
            onToggle={() => toggle('config_volunteer_open')}
          />

          <SubSection label="Form Fields">
            <ToggleRow label="Days available" description="'What days are you likely available?'" checked={bool(config, 'config_volunteer_show_days')} saving={saving === 'config_volunteer_show_days'} onToggle={() => toggle('config_volunteer_show_days')} />
            <ToggleRow label="Notes" description="'Anything else we should know?'" checked={bool(config, 'config_volunteer_show_notes')} saving={saving === 'config_volunteer_show_notes'} onToggle={() => toggle('config_volunteer_show_notes')} />
          </SubSection>
        </div>
      )}

      {error && (
        <p style={{ fontSize: '0.78rem', color: '#ff8a8a', margin: '0.5rem 0 0' }}>{error}</p>
      )}
    </div>
  )
}
