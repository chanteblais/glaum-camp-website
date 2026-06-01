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

---

## Database (key tables)

| Table | Purpose |
|---|---|
| `applications` | Camp member applications. `status`: `pending/approved/rejected/cancelled`. Has `setup_preference TEXT[]` ('Setup','Teardown','Decor','Other'), `avatar_url`, `pronouns`, arrival/departure, etc. `contributions TEXT[]` is **legacy** — use `setup_preference`. |
| `volunteers` | Outside volunteers. `status`: `pending/active/cancelled/removed`. Has `signup_intent TEXT[]`. |
| `departments` | Role groups. `icon` = emoji or image path (starts with `/` → rendered as `<img>`). Name max 40 chars. |
| `roles` | Roles within departments. Name max 28 chars. `capacity` INT. |
| `schedule_events` | Public schedule. `event_type`: `null`/`'all_hands'`/`'camp_tending'`/`'service'`. `contribution_type TEXT`: 'Setup'/'Teardown'/'Decor' — shows on personal schedule for matching members. |
| `camp_signups` | One row per approved member's role+shift. `role_approval_status`. No FK to `applications`. |
| `role_suggestions` | Member-submitted dept/role ideas. `status`: `pending/approved/rejected`. (Migration 017 — may need to be applied.) |
| `admin_notifications` | Admin bell notifications. `read_at` NULL = unread. |
| `user_notifications` | Member bell notifications. Same pattern. |

**Storage buckets:** `avatars` (profile photos), `schedule-icons` (custom event icons) — both must be public.

**Migrations:** 001–016 confirmed applied. `017_role_suggestions.sql` may be pending.

---

## Key files

```
app/
  page.tsx                        Homepage
  apply/page.tsx                  Apply (4 states: no app / pending+rejected / approved / volunteer)
  apply/ApplyForm.tsx             Full application form
  volunteer/VolunteerForm.tsx     Volunteer signup form
  profile/page.tsx                Member profile hub (max-width 1100px)
  profile/AttunementStatus.tsx    Checklist card; dispatches glaum:open-settings event
  profile/SignupSection.tsx       Role/shift picker + "Suggest a role" button
  profile/SuggestRoleModal.tsx    Role suggestion form → POST /api/role-suggestions
  profile/ProfileSettings.tsx     Gear-icon edit modal; listens for glaum:open-settings
  profile/CommitmentsSection.tsx  Role + shift display
  profile/PersonalScheduleCalendar.tsx  Personal schedule (day tabs mobile, grid desktop)
  members/page.tsx                Member directory (approved only)
  members/[id]/page.tsx           Individual member view
  admin/page.tsx                  Admin dashboard
  admin/DepartmentsManager.tsx    Dept/role CRUD
  admin/RoleSuggestionsSection.tsx  Review suggestions
  admin/NotificationsSection.tsx  Bell notifications
  api/badge/route.tsx             Badge PNG via next/og (Node runtime)

components/
  HeaderClient.tsx                Nav; clears localStorage on sign-out
  AvatarUpload.tsx                260px circular avatar, gold border #6F491F, id="avatar-upload"
  ScheduleCalendarClient.tsx      Public schedule
  UserNotificationBell.tsx        Member bell

lib/
  supabase.ts                     Lazy Proxy supabaseAdmin
  profile-auth.ts                 Shared auth helper
  application-options.ts          Form option constants
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
