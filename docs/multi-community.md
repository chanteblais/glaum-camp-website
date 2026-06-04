# Multi-Community Roadmap

This document tracks the evolution of the Glåüm camp platform toward a **reusable service** that can support many communities — camps, retreats, festivals, volunteer groups, and intentional communities — while each community retains its own identity, terminology, and workflows.

Glåüm is the first community on the platform.

---

## Guiding principles

- **Don't abstract without a second use case.** Generalise when there are two real communities to validate against, not before.
- **Use the existing patterns first.** `page_content`, `lib/site-config.ts`, and the form-config system can carry a lot before multi-tenancy is needed.
- **Preserve all current Glåüm functionality.** Every change should be invisible to existing members.
- **Simplicity over theoretical scalability.** Three similar configurations are fine; a premature abstraction is worse.

---

## What each community will eventually be able to configure

- Name, tagline, logo, hero imagery
- Brand colors and typography
- Application form questions, steps, and agreement text
- Role departments and role names
- Schedule structure and event categories
- Terminology (what this platform calls "attunement", "shifts", "contributions", etc.)
- Member-facing copy throughout the site
- Badge design and font

---

## Phase 0 — Completed

Lowest-risk changes that establish correct patterns without requiring a second community.

### Done

**`lib/site-config.ts`** — new file. Community identity driven by env vars:
- `NEXT_PUBLIC_SITE_NAME` (default: `"Glåüm"`)
- `NEXT_PUBLIC_EVENT_NAME` (default: `"What If 2026"`)
- `NEXT_PUBLIC_SITE_DESCRIPTION`

Also exports default fallbacks for configurable option lists:
- `DEFAULT_AGREEMENT_ITEMS` — agreement checkbox items (overridable via `page_content` key `member_acknowledgements`)
- `DEFAULT_ATTENDANCE_OPTIONS` — attendance radio options (overridable via `page_content` key `member_attendance_options`)
- `DEFAULT_MEMBERSHIP_TYPE_OPTIONS` — membership type dropdown options

**`app/layout.tsx`** — site metadata now reads from site-config env vars instead of hardcoded strings.

**`tailwind.config.ts`** — color token namespace renamed `glaum.*` → `brand.*`.

**Migration 025** — five community-specific `applications` columns renamed to generic equivalents:

| Old name | New name |
|---|---|
| `glaum_acceptance` | `community_acceptance` |
| `attunement_status` | `onboarding_status` |
| `attunement_status_other` | `onboarding_status_other` |
| `draws_to_glaum` | `draws_to_community` |
| `camp_relationship` | `membership_type` |

All TypeScript references updated to match across: `lib/form-config.ts`, `lib/application-options.ts`, `app/api/apply/route.ts`, `app/apply/ApplyWizard.tsx`, `app/apply/page.tsx`, `app/profile/ProfileSettings.tsx`, `app/admin/OverviewSection.tsx`, `app/admin/page.tsx`, `app/admin/[id]/page.tsx`.

**Configurable content via `page_content`** — agreement items and attendance options now flow from `page_content` with fallback to constants. `apply/page.tsx` fetches and passes them to `ApplyWizard` as props.

### Still uses Glåüm-specific content (intentionally left for Phase 1+)

- Terminology: "Attunement", "Many Hands", step subtitles in the form wizard
- The final "Shrimp" question step (`shrimp_relationship` DB column) — will move to `custom_answers` in a future migration
- Badge design: `TokyoDreams` font + `badge_base.png` base image
- All public-facing copy (homepage, about, participate) — already in `page_content`, editable by admins
- `DEPT_OPTIONS` list in `ApplyWizard.tsx` — department interest checkboxes; these should come from the `departments` table (or a `page_content` key) rather than being hardcoded

---

## Phase 1 — When a second community joins

These changes require a real second community to validate design decisions. Do not implement speculatively.

### Database

Add a `communities` table:
```sql
CREATE TABLE communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,       -- URL-safe identifier (e.g. 'glaum', 'wildwood')
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Add `community_id UUID FK → communities.id` to:
- `applications`
- `volunteers`
- `departments`
- `roles`
- `schedule_events`
- `camp_signups`
- `announcements`
- `polls`
- `page_content`
- `messages`

Row-level security policies filter by `community_id` on every query.

### Community config table

Store branding and terminology per community instead of env vars:
```sql
CREATE TABLE community_config (
  community_id UUID FK → communities.id,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (community_id, key)
);
```

Keys: `site_name`, `event_name`, `badge_font_url`, `badge_base_url`, `brand_color_gold`, `brand_color_purple`, `brand_color_ink`, `term_onboarding` (what Glåüm calls "Attunement"), `term_membership_unit` (what Glåüm calls a "shift"), etc.

### Auth

Evaluate Clerk Organizations for community-scoped admin roles. Alternatively: add `community_id` to `publicMetadata` and verify it in admin middleware.

### Badge

Make `/api/badge` community-aware: load font and base image from community config URLs rather than local filesystem paths.

### Storage

Prefix Supabase Storage paths with `community_id/` to namespace uploads per community.

---

## Phase 2 — At scale

- Per-community custom domains (Vercel rewrites or separate deployments)
- Community-level theming via CSS custom properties injected at the layout level
- Self-service community onboarding (admin UI to create and configure a new community)
- Community admin roles separate from platform super-admin

---

## Hardcoded things to watch

When adding new features, avoid introducing new hardcoded community-specific values. Common failure modes:

| Pattern to avoid | Pattern to use instead |
|---|---|
| String literal `"Glåüm"` in UI | `SITE_NAME` from `lib/site-config.ts` |
| String literal `"What If 2026"` | `EVENT_NAME` from `lib/site-config.ts` |
| Hardcoded option list in a form | JSON in `page_content` with fallback constant |
| Hardcoded copy in a component | Key in `page_content` fetched at render time |
| Community-specific field names in DB schema | Generic names; community-specific labels in form-config |
| New DB column with culture-specific meaning | Consider `custom_answers JSONB` instead |
