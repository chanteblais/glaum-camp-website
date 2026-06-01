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
/                        Public homepage (schedule, about)
/apply                   Application form (4 states, see Features doc)
/volunteer               Outside volunteer signup
/profile                 Logged-in member profile + role/shift picker
/members                 Member directory (approved members only)
/members/[id]            Individual member view
/sign-in                 Clerk sign-in (catch-all route)
/sign-out                Sign-out redirect page
/admin                   Admin dashboard (role-gated)
/admin/[id]              Admin view of a specific application
/admin/overview          Admin overview / stats
```

---

## API Routes

### Public / Member-facing

| Route | Method | Purpose |
|---|---|---|
| `/api/apply` | POST | Submit application |
| `/api/volunteer` | POST | Submit volunteer signup |
| `/api/signup` | POST/DELETE | Claim or drop a role+shift |
| `/api/profile/application` | PATCH | Update profile fields |
| `/api/profile/avatar` | POST | Upload avatar to Supabase Storage |
| `/api/profile/cancel` | POST | Cancel own application |
| `/api/role-suggestions` | POST | Submit a dept/role suggestion |
| `/api/notifications` | GET/PATCH | Fetch + mark-read user notifications |
| `/api/nav-auth` | GET | Lightweight auth check for nav |
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
| `/api/admin/page-content` | GET/PATCH | Read / upsert homepage editable copy |

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

- **No shared layout header** — each page manages its own header row
- **Mobile nav breakpoint** — detected in JS via `window.innerWidth < 768`
- **`overflow-x: hidden`** on `html`/`body` to prevent mobile horizontal scroll
- **Camp signups join** — always fetch `applications` and `camp_signups` separately and join in JS; Supabase can't resolve the FK via nested select
- **Lazy Supabase client** — `lib/supabase.ts` uses Proxy to avoid build-time env var errors
