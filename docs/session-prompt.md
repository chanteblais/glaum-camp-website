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
- **Data:** server components → `supabaseAdmin` directly (service key); client components → `fetch('/api/...')` → API route → `supabaseAdmin`. `lib/supabase.ts` is a lazy Proxy so missing env vars don't break the build. Env in `.env.local`.
- **Auth:** Clerk v7. Admin = `publicMetadata.role === 'admin'`. Shared helper `lib/profile-auth.ts`.
- No shared layout header — each page owns its header row. Mobile nav breakpoint in JS (`window.innerWidth < 768`). `overflow-x: hidden` on html/body.
- Fetch `applications` and `camp_signups` separately and join in JS (no resolvable FK).
- **After significant module changes, `rm -rf .next` + restart the dev server** — HMR goes stale and the page renders but clicks die (broken hydration / `page.js` 404). Same fix if interactivity mysteriously breaks.
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
Admin-configurable groups (e.g. Setup/Teardown/Decor) in **Admin → Groups** (`GroupsManager.tsx`): create/reorder, assign members, view rosters. Tables `groups` + `group_members` (migration `030`). Members are admin-assigned; applicants can also opt in via a `group_select` form field. Member-facing "contributions" (Commitments card, attunement task, personal-schedule filtering, overview/registry) read group membership via `lib/groups.ts`. Full spec in `docs/features.md` → Groups.

**Group messaging (migration `033`, Phases 1–5 built; Phase 6 = join/leave + mute/opt-in + leads):** every group has a thread in the `/messages` inbox (filterable All/Direct/Groups), with one-level replies and `@mention` email. DMs + group threads share the `conversations`/`conversation_participants` model (`lib/conversations.ts`); group access derives from `group_members`. Full spec in `docs/group-messaging.md`.

## Design system (brief; full in `docs/design-system.md`)
Ink `#1A0A24` background · Gold `#C8A848` headings/links/dividers · Purple `#D239F8` accent · Cream `#F3EDE6` body text. Display font TokyoDreams (`.font-tokyo`), body Libre Baskerville. Badge: `public/badge_base.png` rendered 2× via `next/og`.

> Other features (member dashboard widgets + inline editor, polls, announcements, messaging, schedule, role suggestions, attunement checklist, badge) are documented in `docs/features.md` — pull in only what a task needs.
