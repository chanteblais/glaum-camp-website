# Glåüm Camp Website — Session Brief

Paste at the start of a new Claude session. Deliberately short; the detailed docs in `docs/` are read on demand.

**Path:** `/Users/chante/Documents/Glaum/website/glaum-camp-website`
**Stack:** Next.js 14 (App Router) · TypeScript · Clerk v7 (auth) · Supabase (Postgres + Storage) · Tailwind · deployed on Vercel.

## Detailed docs — read only when relevant, don't preload
- `docs/architecture.md` — data fetching, auth, API routes, badge generation
- `docs/database.md` — tables, columns, `page_content` keys, migrations, storage buckets
- `docs/features.md` — every page & feature, incl. the modular application builder
- `docs/design-system.md` — colors, fonts, CSS classes, component patterns

## Conventions & gotchas
- **Branching (start here, every session):** before your first edit, create your own branch — `type/slug` (`feat/` `fix/` `ux/` `docs/` `chore/`) or `session/YYYY-MM-DD-<topic>` if scope is unclear. `main` = deployable (push = prod deploy). Verify (`tsc` + local click-through), merge `--no-ff`, delete the branch. Tiny tweaks (log/doc one-liners) may go straight to `main`. Claude never pushes. Full rules: `docs/branching.md`.
- **Review server (standing task):** once a change is implemented, **start the dev server and leave it running** so Chante can view the change (`npm run dev -- -p 3001`, background). Port **3000 is Chante's — never start/stop anything on it**; Claude uses 3001 (pick another free port only if 3001 is taken, and say which). Tell her the URL + which pages to look at. Don't kill her review server at the end of the session; only stop servers Claude started for its *own* intermediate verification.
- **Generalizability log (standing task):** This is a dogfood toward a multi-community SaaS. During **any** iteration, when you hardcode/encounter a Glåüm- or What-If–specific value (name, term, color, copy, option list, image, font, domain) or single-community assumption, **append a row to `docs/generalizability-log.md`** (log it, don't necessarily fix it; prefer config-first when you do touch it). What If is July 23, 2026 — ship single-tenant until then; the log feeds the post–What If multi-tenant foundation. See `docs/multi-community.md`.
- **Data:** server components → `supabaseAdmin` directly (service key); client components → `fetch('/api/...')` → API route → `supabaseAdmin`. `lib/supabase.ts` is a lazy Proxy so missing env vars don't break the build. Env in `.env.local`.
- **Auth:** Clerk v7. Admin = `publicMetadata.role === 'admin'`. Shared helper `lib/profile-auth.ts`.
- No shared layout header — each page owns its header row. Mobile nav breakpoint in JS (`window.innerWidth < 768`). `overflow-x: hidden` on html/body.
- Fetch `applications` and `camp_signups` separately and join in JS (no resolvable FK).
- **Stale dev bundles ("page renders but clicks die") — root cause found & fixed 2026-07-02:** the PWA service worker cached same-origin `.js` cache-first, which poisons dev (stable chunk paths, no content hashes). Now `sw.js` no-ops on localhost and `ServiceWorkerRegister` unregisters + clears caches in dev. If a browser still serves stale code once, reload twice (first load swaps in the fixed worker). `rm -rf .next` + restart remains the fallback for genuine HMR staleness.
- Inline `<style>` with attribute selectors must use `dangerouslySetInnerHTML` (avoids hydration mismatch).

## Key files
- `app/page.tsx` — homepage (marketing + member dashboard) · `app/HomePageEditor.tsx` — inline page editor · `app/ShoutoutWidget.tsx` — member shoutouts dashboard widget
- `app/apply/page.tsx`, `apply/ApplyWizard.tsx` — config-driven member application · `apply/TrackPicker.tsx` — member/volunteer chooser
- `app/admin/configure/ApplicationBuilder.tsx` — the form builder · `lib/form-config.ts` — form config types, defaults, `mergeMemberConfig`
- `app/admin/page.tsx` + `admin/*` managers · `app/admin/[id]/page.tsx` — application detail (incl. Additional Responses)
- `app/profile/`, `app/members/`, `app/messages/` (inbox + DM thread `[userId]` + group thread `g/[groupId]`)
- `lib/supabase.ts` · `lib/site-config.ts` (defaults + `page_content` parsers) · `lib/attunement.ts` (`buildAttunementChecklist` — shared by home dashboard + profile) · `lib/notify-admin.ts` · `lib/send-email.ts` · `lib/conversations.ts` (conversations model backing DMs + group threads)
- `api/admin/page-content/route.ts` — GET/PATCH for all `page_content` keys (form configs, homepage copy, dashboard layout)

## Application form — fully modular (recent focus; full spec in `docs/features.md`)
Admins build the member application in **Admin → Application Builder** (`/admin/configure`); config saved to `page_content.config_member_form` (JSON), reconciled by `mergeMemberConfig`. Sections + fields are reorderable (custom sections can sit anywhere, incl. first), width-adjustable (half/full pairing), editable, hideable, deletable. Field types: short/long text, single/multiple choice (with optional "Other" fill-in), file upload, **agreement** (clause checklist), **group selection** (`group_select` — applicant opt-in to admin-defined Groups; the field configures which groups it offers), plus **divider** and **text-block** elements (text blocks render markdown-lite: paragraphs, ✦ bullets, links, bold). Only Basic Info's four core fields are locked (First/Last/Email/Phone; Photo locked but Required toggleable). Everything autosaves (debounced). Track-card copy on the apply page is editable too.

## Groups (replaced contribution-types / `setup_preference`)
Admin-configurable groups (e.g. Setup/Teardown/Decor) in **Admin → Groups** (`GroupsManager.tsx`): create/reorder, assign members, view rosters, **upload a per-group icon image** (`groups.icon_image`, migrations `034`+`035`, public `group-badges` bucket). Tables `groups` + `group_members` (migration `030`). Members are admin-assigned; applicants can opt in via a `group_select` form field, and approved members can self-join groups whose **collection has Self-join on** (`group_collections.self_join`, migration `044`; per-group `apply_selectable` is dormant) via the **Your Groups** section on `/signup` (`GroupCommitments` → `/api/groups/membership`) — a gate separate from the apply form's `group_select`. Member-facing "contributions" (the profile **Active Commitments** card — groups + held-shift rows, each using the group's emoji `icon` / uploaded `icon_image` / `✦`; collection attunement tasks; derived shift requirements (`groups.required_shift_type_id`); overview/registry) read group membership via `lib/groups.ts`. Shifts themselves are many-to-many (`member_shift_signups`) — see `docs/shifts-redesign.md` + `docs/features.md` → Shifts. Full spec in `docs/features.md` → Groups.

## Profile — Designation / Commitments / Distinctions (recent focus; full spec in `docs/features.md` → Profile + Distinctions)
`/profile` reads like a ceremonial registry. Three-column header (`profile-header-grid`): **Designation** (role + department as text + ornaments, left), **portrait** (`AvatarUpload` with a `size` prop, the focal point, center), **Member Information** (name, pill, email + an at-a-glance **stat list**: Member since / Active Commitments / Distinctions Earned / Attunement Status, right). Below: **Active Commitments** (`CommitmentsSection` with `hideRole`) and **Attunement Status** cards, kept equal height; then the full-width **Cabinet of Distinctions** (`CabinetOfDistinctions.tsx`) — engraved medals, honours not buttons. **Architecture: store facts, derive medals** — `buildMemberFacts` (`lib/member-facts.ts`, derive-only) + `evaluateDistinctions` (`lib/distinctions.ts`) against admin rules in `page_content.config_distinctions` (Admin → Distinctions, `DistinctionsManager.tsx`). Earned distinctions are never persisted. (`ContributionBadges.tsx` scatter was removed in this refactor.)

**Profile detail fields** (Admin → Configure → **Profile Fields**, `ProfileFieldsManager`, `config_profile_fields` via `lib/profile-fields.ts`): the configurable per-member data (`bio`, `quote`, + admin-added), stored in `member_profiles.values`. The `public` flag shows as a **"Visible"** toggle — off = **admin-only** (surfaced on `/admin/[id]` → Profile Details, never public). These fields tie into the Application Builder via `profileFieldKey`. On `/profile`, `bio` renders as an **About** card and `quote` under the name; the editable **Profile Details** card (`ProfileDetails.tsx`) covers Visible/editable fields. A field's `key` is stable — renaming a label never re-keys it (so saved answers aren't orphaned). A layout-builder experiment here was built then **reverted** (2026-06-30).

**Group messaging (migration `033`, built — Phases 1–6):** every group has a thread in the `/messages` inbox (filterable All/Direct/Groups), with one-level collapsible replies and `@mention` (autocomplete + email + highlighted profile-linked pills). DMs + group threads share the `conversations`/`conversation_participants` model (`lib/conversations.ts`); group access derives from `group_members`. Admin sets `join_policy`/`visibility`; members self-join open groups via "Find a group" and get per-thread mute / email-opt-in / leave. Still to come: leads (`group_members.role`), `request` join policy, home teaser, digests. Full spec in `docs/group-messaging.md`.

## Design system (brief; full in `docs/design-system.md`)
Ink `#1A0A24` background · Gold `#C8A848` headings/links/dividers · Purple `#D239F8` accent · Cream `#F3EDE6` body text. Display font TokyoDreams (`.font-tokyo`), body Libre Baskerville. Badge: `public/badge_base.png` rendered 2× via `next/og`.

> Other features (member dashboard widgets + inline editor, polls, announcements, messaging, schedule, role suggestions, attunement checklist, badge) are documented in `docs/features.md` — pull in only what a task needs.
