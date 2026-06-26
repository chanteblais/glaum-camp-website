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

Sign-out flow:
1. User clicks sign out
2. `POST /api/sign-out` clears session
3. `HeaderClient` clears localStorage on nav-auth confirmation

---

## Routing

```
/                        Public homepage (schedule, about) / Member dashboard (if approved)
/apply                   Application form (4 states, see Features doc)
/volunteer               Outside volunteer signup
/profile                 Logged-in member profile + role/shift picker
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
| `/api/signup` | GET/POST | Fetch departments/roles/shifts + upsert member role+shift selection. Sets `role_approval_status = 'pending'` for roles with `requires_approval = true`. Preserves existing approval status on shift-only updates. |
| `/api/groups/membership` | GET/POST | Self-service opt-in groups for the current member. GET lists the groups offered by the member form's visible `group_select` fields (unset list = all) + the member's joined state; POST `{ group_id, joined }` joins (`source='application'`) or leaves. Powers the **Your Contributions** section on `/signup`. |
| `/api/profile/application` | PATCH | Update profile fields |
| `/api/profile/avatar` | POST | Upload avatar to Supabase Storage |
| `/api/profile/cancel` | POST | Cancel own application |
| `/api/role-suggestions` | POST | Submit a dept/role suggestion |
| `/api/shoutouts` | GET/POST | List visible shoutouts / post one (approved members) |
| `/api/shoutouts/[id]` | DELETE | Delete a shoutout (author or admin only) |
| `/api/notifications` | GET/PATCH | Fetch + mark-read user notifications |
| `/api/messages` | GET/POST | Inbox (direct + group conversations) / send a DM. Backed by the conversations model (`lib/conversations.ts`). |
| `/api/messages/[userId]` | GET | Direct thread with a member |
| `/api/messages/[userId]/read` | POST | Mark a direct thread read (advances my `last_read_at`) |
| `/api/messages/g/[groupId]` | GET/POST | Group thread fetch / post (members-only). POST parses `@mentions` → in-app notification + throttled email. |
| `/api/messages/g/[groupId]/read` | POST | Mark a group thread read |
| `/api/messages/g/[groupId]/me` | PATCH | Set my per-thread prefs (`muted`, `email_opt_in`) |
| `/api/messages/unread` | GET | Unread count (direct + group, excludes muted) for the nav badge |
| `/api/groups/joinable` | GET | Open + listed groups I can self-join (Find-a-group picker) |
| `/api/groups/[id]/join` | POST | Self-join an open group |
| `/api/groups/[id]/leave` | POST | Leave an open group (admin-assigned groups → 403) |
| `/api/nav-auth` | GET | Lightweight auth check for nav (returns `isSignedIn`, `isApproved`, name, email, avatarUrl) |
| `/api/sign-out` | POST | Sign out |
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
| `/api/admin/groups/[id]/icon` | POST/DELETE | Upload / clear a group's icon image (`group-badges` bucket; sets `groups.icon_image`). Mirrors the avatar route. |
| `/api/admin/schedule` | GET/POST | List / create schedule events |
| `/api/admin/schedule/[id]` | PATCH/DELETE | Update / delete event |
| `/api/admin/schedule/icon` | POST | Upload custom event icon |
| `/api/admin/shifts` | GET/POST | List / create shifts |
| `/api/admin/shifts/[id]` | PATCH/DELETE | Update / delete shift |
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
