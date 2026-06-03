# New Session Prompt — Glåüm Camp Website

Paste this at the start of a new Claude session when working on this project.

---

**Project: Glåüm Camp Website**
`/Users/chante/Documents/Glaum/website/glaum-camp-website`

**Stack:** Next.js 14 App Router · Clerk v7 (auth) · Supabase (Postgres + Storage) · Tailwind CSS · TypeScript · Deployed on Vercel.

Design docs live in `docs/` — read them when you need detail:
- `docs/architecture.md` — data fetching, auth, API routes, badge generation
- `docs/database.md` — all tables, columns, relationships, migrations
- `docs/features.md` — all pages and features
- `docs/design-system.md` — colors, fonts, CSS classes, component patterns

---

## Architecture in brief

**Data fetching:**
- Server components → `supabaseAdmin` directly (service role key)
- Client components → `fetch('/api/...')` → API route → `supabaseAdmin`
- `lib/supabase.ts` uses a lazy Proxy to avoid build-time env var errors

**Auth:** Clerk v7. Admin role = `publicMetadata.role === 'admin'` in Clerk dashboard. `lib/profile-auth.ts` is the shared auth helper.

**Key conventions:**
- No shared layout header — each page manages its own header row
- Mobile nav breakpoint detected in JS: `window.innerWidth < 768`
- `overflow-x: hidden` on `html`/`body`
- Always fetch `applications` and `camp_signups` separately and join in JS — no FK Supabase can resolve via nested select
- `rm -rf .next` restart sometimes needed after significant module changes
- Inline `<style>` tags with attribute selectors must use `dangerouslySetInnerHTML` to avoid React hydration mismatches (quote encoding)

**Mobile responsive breakpoints:**
- `≤ 680px` — dashboard: `.dash-grid` (attunement/commitments row) stacks, `.dash-hero-inner` stacks and reduces padding, `.dash-spotlight` (5fr/7fr grid) stacks, `.dash-quicklinks` stacks; all widgets forced to full width
- `≤ 768px` — apply wizard: two-column form grids collapse to single column; sidebar becomes horizontal step-indicator strip
- `≤ 560px` — profile page: `.profile-main-grid` / `.profile-info-grid` / `.profile-badge-row` all stack

---

## Database (key tables)

| Table | Purpose |
|---|---|
| `applications` | Camp member applications. `status`: `pending/approved/rejected/cancelled`. Has `setup_preference TEXT[]`, `avatar_url`, `pronouns`, arrival/departure, etc. `custom_answers JSONB` stores answers to admin-added form fields (migration 023). |
| `volunteers` | Outside volunteers. `status`: `pending/active/cancelled/removed`. Has `signup_intent TEXT[]`. |
| `departments` | Role groups. `icon` = emoji or image path (starts with `/` → rendered as `<img>`). Name max 40 chars. |
| `roles` | Roles within departments. Name max 28 chars. `capacity` INT. |
| `schedule_events` | Public schedule. `event_type`: `null`/`'all_hands'`/`'camp_tending'`/`'service'`. `contribution_type TEXT`: 'Setup'/'Teardown'/'Decor'. `event_date DATE`. `event_category TEXT`: `'at_camp'` / `'pre_camp'`. |
| `camp_signups` | One row per approved member's role+shift. `role_approval_status`. No FK to `applications`. |
| `announcements` | Admin-posted updates shown to all approved members. `pinned BOOL`, `visible BOOL`, `expires_at TIMESTAMPTZ`. |
| `page_content` | Key/value store. Homepage copy (`home_*`), form configs, and `dashboard_layout` JSON. |
| `polls` | Admin-created member polls. `question TEXT`, `options JSONB` (string array), `visible BOOL`, `allow_multiple BOOL`, `expires_at`. Migration 024. |
| `poll_votes` | One row per member per option voted. `poll_id`, `clerk_user_id`, `option_index`. Unique on `(poll_id, clerk_user_id, option_index)`. Votes replaced on change. Migration 024. |
| `role_suggestions` | Member-submitted dept/role ideas. `status`: `pending/approved/rejected`. |
| `admin_notifications` | Admin bell notifications. `read_at` NULL = unread. |
| `user_notifications` | Member bell notifications. Same pattern. |
| `messages` | Direct messages between approved members. `sender_clerk_id`, `recipient_clerk_id`, `body` (max 2000 chars), `read_at`. Migration 022. |

**Storage buckets:** `avatars` (profile photos), `schedule-icons` (custom event icons) — both must be public.

**Migrations:** 001–024 applied.

---

## Member dashboard layout (homepage when signed in + approved)

Fixed top (not reorderable):
1. **Hero banner** — greeting, countdown, tagline (`home_tagline`, editable inline in edit mode)
2. **Attunement + Commitments** — side-by-side (`dash-grid` 1fr 1fr)

Configurable widgets (order/visibility/width stored in `dashboard_layout` in `page_content`):

| ID | Label | Content |
|---|---|---|
| `announcements` | Announcements | Visible non-expired admin posts; pinned first. Hidden if none |
| `polls` | Polls | Active polls; member votes inline. Hidden if none |
| `events` | Upcoming Gatherings | Pre-camp + at-camp events in next 14 days |
| `spotlight` | Meet a Member | Rotating member card (left) + upcoming gatherings list (right) |
| `activity` | Recent Activity | Member joins + profile updates, up to 6 items |

Fixed bottom: Role & Shift + Many Hands quick-link grid.

**Widget layout:** `display: flex; flex-wrap: wrap; gap: 1.25rem`. Full = `flex: 0 0 100%`, half = `flex: 0 0 calc(50% - 0.625rem)`. Two consecutive halves sit side by side. Mobile (≤ 680px): all full width.

**`dashboard_layout` JSON shape:** `{ "order": string[], "hidden": string[], "widths": Record<string, "half" | "full"> }`

---

## Inline page editor

Admin-only floating **"✎ Edit Page"** button (bottom-right).

Enters inline edit mode — no panel opens. Instead:
- **Top bar** — `Editing · [+ Poll] [Edit Text] [Save] [✕]`
- Widgets get gold dashed outlines; hovering reveals a `⠿ Label [½]` handle (top-right)
- **Drag handle** — card goes `position: fixed` and follows cursor; dashed placeholder holds the drop slot; items reorder live in the DOM
- **`½` button** — toggles widget between full/half width (live, no reload needed)
- **Gold-underlined text** (tagline) — click to edit `contenteditable` inline
- **`+ Poll`** — slide-in panel to create a poll
- **`Edit Text`** — slide-in panel for `home_tagline`, `home_quote`, About, Participate copy
- **Save** — writes `{ order, hidden, widths }` + text edits to `page_content` → reload

**Key file:** `app/HomePageEditor.tsx`  
**API:** `PATCH /api/admin/page-content` (upserts arbitrary keys into `page_content`)

---

## Key files

```
app/
  page.tsx                        Homepage (public marketing + member dashboard)
  HomePageEditor.tsx              Inline page editor (client component, admin only)
  PollWidget.tsx                  Poll voting widget for member dashboard
  apply/page.tsx                  Apply — TrackPicker or ApplyWizard; reads config_member_form
  apply/ApplyWizard.tsx           6-step multi-step form driven by MemberFormConfig
  apply/TrackPicker.tsx           Choose member or volunteer track
  volunteer/page.tsx              Volunteer page — reads config_volunteer_form
  volunteer/VolunteerForm.tsx     Volunteer signup form driven by VolunteerFormConfig
  admin/page.tsx                  Admin dashboard
  admin/overview/page.tsx         Admin overview — stats, hours, setup teams, rideshare, poll results
  admin/configure/page.tsx        Application Builder (server component — fetches configs)
  admin/configure/ApplicationBuilder.tsx  Full builder UI (client component)
  admin/AnnouncementsManager.tsx  Create/edit/delete announcements
  admin/PollsManager.tsx          Create/edit/delete/toggle polls
  admin/DepartmentsManager.tsx    Dept/role CRUD
  admin/ScheduleManager.tsx       Schedule event CRUD
  admin/RoleSuggestionsSection.tsx  Review suggestions
  admin/NotificationsSection.tsx  Bell notifications
  admin/[id]/page.tsx             Individual application detail — shows role/shift + full answers
  admin/MemberSignupCard.tsx      Role & shift display with Remove role / Remove shift / Approve role buttons
  profile/page.tsx                Member profile hub (max-width 1100px)
  profile/AttunementStatus.tsx    Checklist card; dispatches glaum:open-settings event
  profile/SignupSection.tsx       Role/shift picker + "Suggest a role" button
  profile/CommitmentsSection.tsx  Role + shift display
  profile/PersonalScheduleCalendar.tsx  Personal schedule. PX_PER_HOUR = 40
  members/page.tsx                Member directory (approved only)
  members/[id]/page.tsx           Individual member view
  messages/page.tsx               Messaging inbox
  messages/[userId]/page.tsx      Thread page
  api/apply/route.ts              POST — submit application (includes custom_answers)
  api/badge/route.tsx             Badge PNG via next/og (Node runtime)
  api/admin/page-content/route.ts GET+PATCH — homepage copy + form configs + dashboard_layout
  api/admin/polls/route.ts        GET+POST polls (admin)
  api/admin/polls/[id]/route.ts   PATCH+DELETE poll (admin)
  api/polls/[id]/vote/route.ts    POST vote (authenticated members)
  api/admin/schedule/             GET+POST / [id] PATCH+DELETE / icon upload
  api/admin/signups/[userId]/route.ts  PATCH — clear role ({clear_role:true}) or shift ({clear_shift:true})
  api/signup/route.ts             GET+POST — member role+shift selection. IMPORTANT: when isRoleChange is false, preserves existing role_approval_status (prevents shift-only updates from wiping a pending approval)

components/
  HeaderClient.tsx                Nav; clears localStorage on sign-out
  AvatarUpload.tsx                260px circular avatar, gold border #6F491F
  ScheduleCalendarClient.tsx      Public schedule calendar (used on /schedule and dashboard)
  UserNotificationBell.tsx        Member bell

lib/
  supabase.ts                     Lazy Proxy supabaseAdmin
  form-config.ts                  MemberFormConfig + VolunteerFormConfig types, defaults, merge helpers
  profile-auth.ts                 Shared auth helper
  notify-admin.ts                 Helper to create admin_notifications rows
```

---

## Design system in brief

**Colors (Tailwind `glaum.*`):**
- Ink `#1A0A24` — background
- Gold `#C8A848` — headings, links, dividers
- Purple `#D239F8` — accent, focus rings
- Plum `#5D2B7A` — mid-tone fills
- Lavender `#D9B3FF` — light purple accents
- Cream `#FFFACD`

**Text:** default `#F3EDE6` (warm off-white). Headings: gold + `text-shadow: 0 2px 8px rgba(0,0,0,0.8)`.

**Fonts:**
- `TokyoDreams` — display/heading (local, `font-tokyo` class; weight 400 = Plain, 700 = Bold)
- `Libre Baskerville` — body serif (`--font-libre-baskerville`, `font-baskerville`)
- `Marcellus` — supporting serif (`--font-marcellus`)
- `Cormorant Garamond` — supporting serif (`--font-cormorant-garamond`)

**Reusable CSS classes:** `.site-shell`, `.gold-divider`, `.purple-glow`, `.shimmer`, `.font-tokyo`

**Background:** layered — ink base + purple radial gradient at top + fixed gold dot grid (`::before`).

**Avatar gold border:** `#6F491F` (darker than palette gold).

**Badge:** `public/badge_base.png` (365×424), rendered 2× via `next/og`. Dept text above gold divider, role text below (one word per line). Auto-scaling font via `fitFontSize()`, min 11px. Displayed at 175×203px with `transform: translate(-40px, -28px)`.

---

## Attunement checklist (profile page)

1. Application Approved — always done
2. Photo Uploaded — checks `avatar_url`
3. Contribution Selected — checks `contributions.length > 0`; click opens ProfileSettings → contributions
4. Role Selected — checks `campSignup.role_id` (non-pending)
5. Shift Assigned — checks `campSignup.schedule_event_id`

---

## Role suggestion flow

Member → `SuggestRoleModal` → `POST /api/role-suggestions` → `admin_notifications`
Admin → `PATCH /api/admin/role-suggestions/[id]`
- Approve: finds/creates dept (case-insensitive), creates role, sends `user_notifications`
- Reject: sends `user_notifications`

---

## Polls flow

Admin → Admin Dashboard → Polls → New Poll (or "✎ Edit Page" → `+ Poll`)
Stored in `polls` table. Visible to all approved members on dashboard in `polls` widget.
Supports: question, 2–10 options, visible toggle, multiple-choice toggle, optional expiry.
Members vote via `POST /api/polls/[id]/vote`. Changing a vote replaces prior vote.
Results visible to admins in Admin Overview → Poll Results.
API: `POST /api/admin/polls`, `PATCH/DELETE /api/admin/polls/[id]`

---

## Announcements flow

Admin → Admin Dashboard → Announcements → New announcement
Stored in `announcements` table. Visible to all approved members on dashboard (widget `announcements`).
Supports: title, body, pinned, visible toggle, optional expiry date.
API: `POST /api/admin/announcements`, `PATCH/DELETE /api/admin/announcements/[id]`

---

## Homepage editable copy

Admin → floating "✎ Edit Page" button (bottom-right, visible when signed in as admin)
Enters inline edit mode. Text editable directly on the page (`contenteditable`).
"Edit Text" button in the edit bar opens a slide-in panel for fields not visible on the dashboard.
All saves go to `page_content` via `PATCH /api/admin/page-content`.
`home_tagline` renders on both the public page and the logged-in hero banner (editable inline).
`home_quote` renders in the quote card on the logged-in hero banner (editable via text panel).
