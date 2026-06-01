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
| `applications` | Camp member applications. `status`: `pending/approved/rejected/cancelled`. Has `setup_preference TEXT[]`, `avatar_url`, `pronouns`, arrival/departure, etc. `custom_answers JSONB` stores answers to admin-added form fields (migration 023). |
| `volunteers` | Outside volunteers. `status`: `pending/active/cancelled/removed`. Has `signup_intent TEXT[]`. |
| `departments` | Role groups. `icon` = emoji or image path (starts with `/` → rendered as `<img>`). Name max 40 chars. |
| `roles` | Roles within departments. Name max 28 chars. `capacity` INT. |
| `schedule_events` | Public schedule. `event_type`: `null`/`'all_hands'`/`'camp_tending'`/`'service'`. `contribution_type TEXT`: 'Setup'/'Teardown'/'Decor'. `event_date DATE`. `event_category TEXT`: `'at_camp'` / `'pre_camp'`. |
| `camp_signups` | One row per approved member's role+shift. `role_approval_status`. No FK to `applications`. |
| `announcements` | Admin-posted updates shown to all approved members. `pinned BOOL`, `visible BOOL`, `expires_at TIMESTAMPTZ`. |
| `page_content` | Key/value store. Homepage copy (`home_*`), form configs (`config_member_form`, `config_volunteer_form` as JSON blobs). |
| `role_suggestions` | Member-submitted dept/role ideas. `status`: `pending/approved/rejected`. |
| `admin_notifications` | Admin bell notifications. `read_at` NULL = unread. |
| `user_notifications` | Member bell notifications. Same pattern. |
| `messages` | Direct messages between approved members. `sender_clerk_id`, `recipient_clerk_id`, `body` (max 2000 chars), `read_at`. Migration 022. |

**Storage buckets:** `avatars` (profile photos), `schedule-icons` (custom event icons) — both must be public.

**Migrations:** 001–023 applied.

---

## Member dashboard layout (homepage when signed in + approved)

Widget order (top to bottom):
1. **Hero banner** — greeting, countdown, quote card (`home_quote`), tagline (`home_tagline`)
2. **Attunement + Commitments** — side-by-side (`dash-grid` 1fr 1fr)
3. **Announcements** — visible non-expired admin posts; pinned first. Hidden if none
4. **Pre-Camp Gatherings** — `event_category = 'pre_camp'` events in next 14 days. Hidden if none
5. **Upcoming Gatherings** — `event_category = 'at_camp'` events in next 14 days. Hidden if none
6. **Meet a Member + Your Schedule** — side-by-side (`5fr 7fr`). Member rotates every minute
7. **Recent Activity** — member joins + profile updates, up to 6 items
8. **Many Hands link** — shortcut to `/members`

---

## Key files

```
app/
  page.tsx                        Homepage (public marketing + member dashboard)
  apply/page.tsx                  Apply — TrackPicker or ApplyWizard; reads config_member_form
  apply/ApplyWizard.tsx           6-step multi-step form driven by MemberFormConfig
  apply/TrackPicker.tsx           Choose member or volunteer track
  volunteer/page.tsx              Volunteer page — reads config_volunteer_form
  volunteer/VolunteerForm.tsx     Volunteer signup form driven by VolunteerFormConfig
  admin/page.tsx                  Admin dashboard; "Configure Applications →" link
  admin/configure/page.tsx        Application Builder (server component — fetches configs)
  admin/configure/ApplicationBuilder.tsx  Full builder UI (client component)
  admin/AnnouncementsManager.tsx  Create/edit/delete announcements
  admin/DepartmentsManager.tsx    Dept/role CRUD
  admin/ScheduleManager.tsx       Schedule event CRUD
  admin/RoleSuggestionsSection.tsx  Review suggestions
  admin/NotificationsSection.tsx  Bell notifications
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
  api/admin/page-content/route.ts GET+PATCH — homepage copy + form configs (config_member_form, config_volunteer_form)
  api/admin/schedule/             GET+POST / [id] PATCH+DELETE / icon upload

components/
  HeaderClient.tsx                Nav; clears localStorage on sign-out
  AvatarUpload.tsx                260px circular avatar, gold border #6F491F
  ScheduleCalendarClient.tsx      Public schedule
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

## Announcements flow

Admin → Admin Dashboard → Announcements → New announcement  
Stored in `announcements` table. Visible to all approved members on dashboard (widget 3).  
Supports: title, body, pinned, visible toggle, optional expiry date.  
API: `POST /api/admin/announcements`, `PATCH/DELETE /api/admin/announcements/[id]`

---

## Homepage editable copy

Admin → floating "Edit Page" button (bottom-right, visible when signed in as admin)  
Opens `HomePageEditor` slide-in panel. Saves to `page_content` via `PATCH /api/admin/page-content`.  
Fields: Hero Tagline, Hero Quote Card, About heading/body, Participate heading/body.  
`home_tagline` renders on both the public page and the logged-in hero banner.  
`home_quote` renders in the quote card on the logged-in hero banner.
