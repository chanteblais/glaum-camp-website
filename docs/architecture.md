# Architecture

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth | Clerk v7 |
| Database + Storage | Supabase (Postgres + Storage) |
| Styling | Tailwind CSS + custom CSS |
| Language | TypeScript |
| Deployment | Vercel |

---

## Data Fetching Pattern

**Server components** fetch directly using `supabaseAdmin` (service role key). No auth check needed — server-only code never reaches the client.

**Client components** never import Supabase directly. They call internal API routes (`/api/...`) which are server-side and can safely use the service role key.

```
Server Component  →  supabaseAdmin (direct)
Client Component  →  fetch('/api/...')  →  API Route  →  supabaseAdmin
```

`lib/supabase.ts` exports `supabaseAdmin` via a lazy Proxy pattern that defers instantiation until first use, avoiding build-time errors when env vars aren't available.

---

## Auth

Auth is handled by **Clerk v7**. The Clerk middleware runs on all routes via `middleware.ts`.

- Admin role is set in Clerk Dashboard → User → `publicMetadata.role = 'admin'`
- `lib/profile-auth.ts` provides a shared helper to verify auth in server components and API routes
- Admin routes check for `role === 'admin'` in `publicMetadata`
- `RememberSignedIn` component writes a localStorage flag so `HeaderClient` can show the right nav state without a round-trip
- `/api/nav-auth` trusts only Clerk-verified sessions (`auth()`); an earlier unverified `__session`-cookie fallback was removed 2026-07-02 — post-sign-in flakiness is covered by `HeaderClient`'s retry loop instead
- `/api/sign-out` resolves the user for session revocation from `auth()` first, falling back only to `verifyToken` (networkless JWKS check) on the raw `__session` cookie; an earlier unverified base64 parse of the JWT was removed 2026-07-02 (a forged `sub` could revoke any known user's sessions). Cookie-clearing runs regardless, so sign-out still works mid-broken-session
- **Member lookup (perf):** `lib/members.ts` → `resolveMemberForUser` / `getApprovedMember` is the standard "who is this signed-in user" check for pages and API routes. It queries `members` by `clerk_user_id` first (every production row has it) and only falls back to Clerk's `currentUser()` + email match when no row is found — `currentUser()` is a ~200–500ms Backend-API round-trip, so it must never sit on the hot path. Found-by-email rows get `clerk_user_id` backfilled. When a route genuinely needs `currentUser()` (e.g. `publicMetadata` on the homepage), run it inside `Promise.all` alongside the first DB query, never before it.
- **Query batching:** server components and API-route GETs batch independent Supabase queries with `Promise.all` (see `app/page.tsx`, `app/profile/page.tsx`, `/api/signup`, `/api/shift-signups`). Latency is dominated by round-trip count, not row volume — a new query should join an existing batch, not be awaited on its own line.

Sign-out flow:
1. User clicks sign out
2. `GET /api/sign-out` revokes the user's Clerk sessions (verified identity only) and clears session cookies
3. `HeaderClient` clears localStorage on nav-auth confirmation

---

## Routing

```
/                        Public homepage (schedule, about) / Member dashboard (if approved)
/apply                   Application form (4 states, see Features doc)
/volunteer               Outside volunteer signup
/profile                 Logged-in member profile (designation, commitments, distinctions)
/participate             Participate page: role + shift pickers, Bring Something (resources), Your Groups (renamed from /signup 2026-07-02; /signup permanently redirects here via next.config.js)
/roles                   Registry of Roles — full departments + roles documentation, claimable in place
/members                 Member directory (approved members only)
/members/[id]            Individual member view
/messages                Member messaging inbox (DMs + group threads, filterable)
/messages/[userId]       Direct-message thread with a specific member
/messages/g/[groupId]    Group thread (members of that group only)
/schedule                Full public camp schedule (accessible to approved members)
/sign-in                 Clerk sign-in (catch-all route)
/sign-out                Sign-out redirect page
/admin                   Admin dashboard (role-gated)
/admin/[id]              Admin view of a specific application
/admin/overview          Admin overview / stats
/admin/configure         Application Builder — configure member + volunteer forms
```

---

## API Routes

### Public / Member-facing

| Route | Method | Purpose |
|---|---|---|
| `/api/apply` | POST | Submit application |
| `/api/volunteer` | POST | Submit volunteer signup |
| `/api/signup` | GET/POST | Fetch departments/roles + upsert member **role** selection. Sets `role_approval_status = 'pending'` for roles with `requires_approval = true`. (Shift halves are legacy — shifts moved to `/api/shift-signups`.) |
| `/api/shift-signups` | GET/POST/DELETE | **Multi-shift signup** (shifts redesign): GET slots + owed hour requirements (incl. `lead_names`/`held_role`), POST sign up for a slot (capacity + signup-open enforced, admin notified; optional `role: 'member'\|'lead'` — omitted keeps the existing role), DELETE cancel (also clears the legacy `camp_signups.schedule_event_id`). Backed by `member_shift_signups`. |
| `/api/groups/membership` | GET/POST | Self-service opt-in groups for the current member. GET lists groups whose **collection has `self_join` on** (migration `044`; no collection ⇒ not self-joinable) + the member's joined state, **grouped by collection** (each group carries `collection_id`/`collection_name`, ordered by collection `sort_order`); POST `{ group_id, joined }` joins (`source='application'`) or leaves (re-checks the same gate). Separate from the apply form's `group_select` fields, from `show_on_profile` (profile display), and from group `visibility` (Find-a-group). Powers the **Your Groups** section on `/participate`. |
| `/api/resources` | GET | Shared resources, member view: **visible** lists (empty ones included — they're offer targets) with items, community claimed totals, the caller's own claim quantity (`mine`), and offer attribution (`offered_by_name`/`offered_by_me`). Powers the **Bring Something** section on `/participate`. |
| `/api/resources/claims` | POST | Set my claim on a resource: `{ resource_id, quantity }` — quantity ≥1 upserts the single per-member claim row (clamped 1–99), 0 removes it. Removing the last claim on **your own offer** deletes the offer row too (retraction). Rejects items on hidden lists. |
| `/api/resources/offers` | POST | Offer unlisted gear: `{ list_id, name, note }` → creates an open-callout item (`quantity_needed NULL`, `offered_by` = caller, migration `053`) + the offerer's ×1 claim. Visible lists only. |
| `/api/profile/application` | PATCH | Update profile fields |
| `/api/profile/avatar` | POST | Upload avatar to Supabase Storage |
| `/api/profile/cancel` | POST | Cancel own application |
| `/api/role-suggestions` | POST | Submit a dept/role suggestion |
| `/api/shoutouts` | GET/POST | List visible shoutouts / post one (approved members) |
| `/api/shoutouts/[id]` | DELETE | Delete a shoutout (author or admin only) |
| `/api/notifications` | GET/PATCH | Fetch + mark-read user notifications |
| `/api/messages` | GET/POST | Inbox (direct + group conversations) / send a DM. Backed by the conversations model (`lib/conversations.ts`); the inbox summary lives in `lib/inbox.ts`, shared with the server-rendered `/messages` page (the route is the client's refresh path). |
| `/api/messages/[userId]` | GET | Direct thread with a member (`lib/inbox.ts` `getDirectThreadMessages`, shared with the server-rendered thread page; the route is the client's poll path) |
| `/api/messages/[userId]/read` | POST | Mark a direct thread read (advances my `last_read_at`) |
| `/api/messages/g/[groupId]` | GET/POST | Group thread fetch / post (members-only). POST parses `@mentions` → in-app notification + throttled email. |
| `/api/messages/g/[groupId]/read` | POST | Mark a group thread read |
| `/api/messages/g/[groupId]/me` | PATCH | Set my per-thread prefs (`muted`, `email_opt_in`) |
| `/api/messages/unread` | GET | Unread count (direct + group, excludes muted) for the nav badge |
| `/api/groups/joinable` | GET | Open + listed groups I can self-join (Find-a-group picker) |
| `/api/groups/[id]/join` | POST | Self-join an open group |
| `/api/groups/[id]/leave` | POST | Leave an open group (admin-assigned groups → 403) |
| `/api/nav-auth` | GET | Lightweight auth check for nav (returns `isSignedIn`, `isApproved`, name, email, avatarUrl) |
| `/api/sign-out` | GET | Revoke Clerk sessions (verified identity) + clear session cookies |
| `/api/badge` | GET | Generate role badge PNG (OG image) |

### Admin-only

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/[id]/approve` | POST | Approve application (sets status, in-app notification, approval email). Returns `emailWarning` when the email send fails so the admin UI can surface it — the approval itself still succeeds. |
| `/api/admin/[id]/reject` | POST | Reject application |
| `/api/admin/departments` | GET/POST | List / create departments |
| `/api/admin/departments/[id]` | PATCH/DELETE | Update / delete department |
| `/api/admin/roles` | GET/POST | List / create roles |
| `/api/admin/roles/[id]` | PATCH/DELETE | Update / delete role |
| `/api/admin/groups` | GET/POST | List (with member counts) / create groups |
| `/api/admin/groups/[id]` | PATCH/DELETE | Update / delete group |
| `/api/admin/groups/[id]/members` | GET/POST/DELETE | Group roster / add member / remove member (`?clerk_user_id=`) |
| `/api/admin/groups/[id]/icon` | POST/DELETE | Upload / clear a group's icon image (`group-badges` bucket, `groups/` prefix; sets `groups.icon_image`). Mirrors the avatar route. |
| `/api/admin/resources` | GET/POST | Shared resources, admin view: all lists (hidden included; `steward_name` resolved from the group/department/role FK) with items, claimed totals, **and claimant names** (via `memberDisplayNames`) / create a list (at most one steward id enforced) |
| `/api/admin/resources/[id]` | PATCH/DELETE | Update / delete a resource list (items + claims cascade) |
| `/api/admin/resources/items` | POST | Add an item to a list |
| `/api/admin/resources/items/[id]` | PATCH/DELETE | Update / delete an item (claims cascade) |
| `/api/admin/resources/items/[id]/icon` | POST | Upload a resource item icon (`group-badges` bucket, `resources/` prefix; returns URL, stored in `resources.icon`). Mirrors the departments icon route. |
| `/api/admin/distinctions/[id]/icon` | POST | Upload distinction medal art (`group-badges` bucket, `distinctions/` prefix; returns URL, stored in `config_distinctions`). Used by the shared `AssetImagePicker`. |
| `/api/admin/departments/[id]/icon` | POST | Upload a department icon (`group-badges` bucket, `departments/` prefix; returns URL, stored in `departments.icon`). `[id]` is the row id or a client-generated key for not-yet-saved departments. |
| `/api/admin/schedule` | GET/POST | List / create schedule events |
| `/api/admin/schedule/[id]` | PATCH/DELETE | Update / delete event |
| `/api/admin/schedule/icon` | POST | Upload custom event icon |
| `/api/admin/schedule/rosters` | GET | Per-event shift rosters for the schedule editor (`member_shift_signups` ∪ legacy `camp_signups`, deduped; names + lead role + `legacy_only` flag) |
| `/api/admin/shifts` | GET/POST | **Dead** — legacy of the removed original `shifts` table; nothing calls it (removed in the shifts-redesign cleanup) |
| `/api/admin/shift-types` | GET/POST | List / create shift types (the configurable registry; `/[id]` PATCH/DELETE to edit) |
| `/api/admin/signups/[userId]` | GET/PATCH | View / manage member signups |
| `/api/admin/role-requests` | GET | List pending role requests |
| `/api/admin/role-requests/[userId]` | PATCH | Approve / reject role request |
| `/api/admin/role-suggestions` | GET | List role suggestions |
| `/api/admin/role-suggestions/[id]` | PATCH | Approve / reject suggestion |
| `/api/admin/volunteer/[id]` | GET/PATCH | View / manage volunteer |
| `/api/admin/volunteer/[id]/approve` | POST | Approve volunteer |
| `/api/admin/notifications` | GET/PATCH/DELETE | Admin notification management |
| `/api/admin/notifications/[id]` | PATCH/DELETE | Per-notification actions |
| `/api/admin/announcements` | GET/POST | List visible announcements / create new |
| `/api/admin/announcements/all` | GET | List all announcements including hidden (admin only) |
| `/api/admin/announcements/[id]` | PATCH/DELETE | Update / delete announcement |
| `/api/admin/page-content` | GET/PATCH | Read / upsert any `page_content` row — used for homepage copy (`home_*`) and form configs (`config_member_form`, `config_volunteer_form`) |

### Cron (Vercel Cron)

Scheduled jobs are declared in `vercel.json` (`crons`) and hit API routes under `/api/cron/*`. Vercel authenticates each invocation with `Authorization: Bearer ${CRON_SECRET}` — the `CRON_SECRET` env var must be set in Vercel (and `.env.local` for local testing); the routes fail closed without it. Cron schedules use **UTC**. Crons only run on the production deployment and activate on the next deploy after `vercel.json` changes.

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/attunement-nudges` | daily 16:00 UTC (9am PT) | Email approved members their outstanding attunement checklist (same `buildAttunementChecklist` as home/profile). Per-member cadence from `config_attunement_nudge_days` (Off/1/2/3/7 days, default 2; **Reminder emails** select in the Attunement Tasks manager) — the cron fires daily, each member is emailed only once their cadence cooldown lapses (`attunement_nudges` ledger). Also skips: attuned members, opt-outs (`notification_preferences.email_attunement_nudges`), no-email rows. Sends are spaced 600ms apart (Resend rate limit); `maxDuration = 60`. A logged-in **admin** can also GET the route in a browser: **dry-run by default** (JSON report of who'd get what), `?send=1` to really send. |

---

## Storage Buckets (Supabase)

See [database.md → Storage Buckets](database.md#storage-buckets) for the canonical list (`avatars`, `schedule-icons`, `application-files`, `group-badges`) and which migration creates each.

---

## Badge Generation

`/api/badge` is a Next.js OG image route (`next/og`, Node.js runtime) that composites role + department text over `public/badge_base.png`.

- Query params: `?role=` and `?dept=`.
- Role name renders one word per line; dept name wraps normally; font size auto-scales (`fitFontSize()`) to fit.
- Cached for a day (`max-age=86400`).
- Exact image dimensions, text-zone offsets, and the profile display transform live in the route + the profile/member layouts — read them there rather than trusting numbers copied here.

---

## Key Conventions

- **Shared `<Header />`** — all member-facing pages use the shared `Header` component (`components/Header.tsx` → `components/HeaderClient.tsx`). Pages no longer manage their own header rows.
- **Mobile nav breakpoint** — detected in JS via `window.innerWidth < 768`
- **`overflow-x: hidden`** on `html`/`body` to prevent mobile horizontal scroll
- **Camp signups join** — always fetch `applications` and `camp_signups` separately and join in JS; Supabase can't resolve the FK via nested select
- **Lazy Supabase client** — `lib/supabase.ts` uses Proxy to avoid build-time env var errors
- **Form config system** — `lib/form-config.ts` defines `MemberFormConfig` and `VolunteerFormConfig` types, default step/field definitions, and `mergeMemberConfig`/`mergeVolunteerConfig` helpers. Configs are fetched from `page_content` as JSON and merged with defaults on every request. The member merge **preserves the saved order of all sections** (built-in + custom — a custom section can be first), merges built-in field overrides (label, description, visible, required, width, options), keeps custom fields/elements as-is, and re-injects only missing *locked* core fields (deleted non-core fields stay deleted; "Reset to defaults" restores). Field types: text/textarea/radio/checkbox/file/agreement/group_select, plus divider & text-block elements. (`group_select` is member-form only — a checklist of Groups the applicant can opt into; the field's `options` hold the offered group ids, unset = all.) The Application Builder (`/admin/configure`) writes to `page_content` via `PATCH /api/admin/page-content`; everything autosaves (debounced).

---

## Multi-Community Architecture

> See [multi-community.md](multi-community.md) for the full roadmap.

This codebase is being evolved toward a **multi-community platform**. Glåüm is the first community. As features are added, follow these patterns to keep the platform generalisable:

### Community identity — `lib/site-config.ts`

Site name, event name, and description are driven by env vars (`NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_EVENT_NAME`, `NEXT_PUBLIC_SITE_DESCRIPTION`). Use these constants anywhere a community name appears in source code rather than hardcoding `"Glåüm"`.

### Configurable content — `page_content` table

`page_content` is the primary mechanism for community-specific text and option lists. Before hardcoding a string in source, ask whether it belongs in `page_content`. Currently configurable via this pattern:

- Homepage copy (`home_*`)
- Form field labels, step titles, custom fields (`config_member_form`)
- Agreement checkbox items (`member_acknowledgements`)
- Attendance options (`member_attendance_options`)
- Any text editable via the inline page editor

The pattern for each: fetch the key from `page_content` in the server component, parse JSON, pass down as a prop. Fall back to constants in `lib/site-config.ts` if the key is absent.

### What is NOT yet community-scoped

These are explicitly deferred until a second community exists:

- **Database rows** — all tables are currently single-community. There is no `community_id` column.
- **Clerk** — single Clerk instance, single admin role. No org-level isolation.
- **Storage** — single `avatars` / `schedule-icons` bucket shared by all.
- **Badge** — font (`TokyoDreams`) and base image (`badge_base.png`) are Glåüm-specific.
- **Branding** — colors, fonts, and design system are Glåüm's. Per-community theming is deferred.

When adding a feature that would need to be community-specific: implement it for a single community first using `page_content` or `lib/site-config.ts` defaults. The multi-tenancy layer comes later.
