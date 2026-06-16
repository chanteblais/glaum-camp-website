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
/messages                Member messaging inbox
/messages/[userId]       Conversation thread with a specific member
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
| `/api/profile/application` | PATCH | Update profile fields |
| `/api/profile/avatar` | POST | Upload avatar to Supabase Storage |
| `/api/profile/cancel` | POST | Cancel own application |
| `/api/role-suggestions` | POST | Submit a dept/role suggestion |
| `/api/notifications` | GET/PATCH | Fetch + mark-read user notifications |
| `/api/messages` | GET/POST | Fetch inbox conversations / send a message |
| `/api/messages/[userId]` | GET | Fetch thread with a specific member (marks messages read) |
| `/api/messages/unread` | GET | Unread message count for nav badge |
| `/api/nav-auth` | GET | Lightweight auth check for nav (returns `isSignedIn`, `isApproved`, name, email, avatarUrl) |
| `/api/sign-out` | POST | Sign out |
| `/api/badge` | GET | Generate role badge PNG (OG image) |

### Admin-only

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/[id]/approve` | POST | Approve application |
| `/api/admin/[id]/reject` | POST | Reject application |
| `/api/admin/departments` | GET/POST | List / create departments |
| `/api/admin/departments/[id]` | PATCH/DELETE | Update / delete department |
| `/api/admin/roles` | GET/POST | List / create roles |
| `/api/admin/roles/[id]` | PATCH/DELETE | Update / delete role |
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

| Bucket | Contents | Access |
|---|---|---|
| `avatars` | Member profile photos | Public |
| `schedule-icons` | Custom schedule event icons | Public (must be set) |

---

## Badge Generation

`/api/badge` is a Next.js OG image route using `next/og` (Node.js runtime).

- Takes `?role=` and `?dept=` query params
- Base image: `public/badge_base.png` (365×424), rendered at 2× for crispness
- Text zones: dept name above gold divider (~top: 135px), role name below (~top: 258px)
- Role name renders one word per line; dept name wraps normally
- Font size auto-scales via `fitFontSize()` — min 11px
- Cache: `public, max-age=86400`
- Displayed at 175×203px with `transform: translate(-40px, -28px)` + `drop-shadow`

---

## Key Conventions

- **Shared `<Header />`** — all member-facing pages use the shared `Header` component (`components/Header.tsx` → `components/HeaderClient.tsx`). Pages no longer manage their own header rows.
- **Mobile nav breakpoint** — detected in JS via `window.innerWidth < 768`
- **`overflow-x: hidden`** on `html`/`body` to prevent mobile horizontal scroll
- **Camp signups join** — always fetch `applications` and `camp_signups` separately and join in JS; Supabase can't resolve the FK via nested select
- **Lazy Supabase client** — `lib/supabase.ts` uses Proxy to avoid build-time env var errors
- **Form config system** — `lib/form-config.ts` defines `MemberFormConfig` and `VolunteerFormConfig` types, default step/field definitions, and `mergeMemberConfig`/`mergeVolunteerConfig` helpers. Configs are fetched from `page_content` as JSON and merged with defaults on every request. Custom steps and admin-added fields survive the merge; built-in fields are updated with saved overrides only (label, description, visible, required). The Application Builder (`/admin/configure`) writes to `page_content` via `PATCH /api/admin/page-content`.

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
