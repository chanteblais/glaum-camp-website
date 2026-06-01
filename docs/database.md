# Database Schema

All tables live in a Supabase (Postgres) project. The base schema is in `supabase-schema.sql`; migrations `001`–`017` in `supabase-migrations/` document incremental changes. Migrations `001`–`016` are confirmed applied; `017_role_suggestions.sql` may be pending.

---

## Tables

### `applications`

One row per person who has submitted a camp application.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `submitted_at` | TIMESTAMPTZ | Defaults to NOW() |
| `first_name` | TEXT NOT NULL | Max 50 chars (enforced in form) |
| `last_name` | TEXT NOT NULL | Max 50 chars |
| `preferred_name` | TEXT | |
| `pronouns` | TEXT | |
| `email` | TEXT NOT NULL | |
| `phone` | TEXT NOT NULL | |
| `instagram` | TEXT | |
| `location` | TEXT | |
| `camped_before` | TEXT | |
| `attendance` | TEXT | "What If" plans |
| `arrival_date` | TEXT | |
| `departure_date` | TEXT | |
| `camp_relationship` | TEXT | |
| `vehicle` | TEXT | |
| `space_requirements` | TEXT | |
| `structures` | TEXT | |
| `rideshare` | TEXT | |
| `contributions` | TEXT[] | **Legacy** — superseded by `setup_preference` |
| `setup_preference` | TEXT[] | Values: `'Setup'`, `'Teardown'`, `'Decor'`, `'Other'` |
| `setup_limitations` | TEXT | |
| `setup_notes` | TEXT | |
| `energizing_participation` | TEXT | |
| `support_needs` | TEXT | |
| `accessibility` | TEXT | |
| `capacity` | TEXT | |
| `participation_style` | TEXT | |
| `draws_to_glaum` | TEXT | |
| `healthy_community` | TEXT | |
| `acknowledgements` | TEXT[] | |
| `shrimp_relationship` | TEXT | Fun question |
| `avatar_url` | TEXT | Supabase Storage URL |
| `status` | TEXT | `pending` / `approved` / `rejected` / `cancelled` |
| `clerk_user_id` | TEXT | Set after Clerk account created |
| `admin_notes` | TEXT | Internal only |
| `reviewed_at` | TIMESTAMPTZ | |
| `reviewed_by` | TEXT | |
| `cancel_reason` | TEXT | |
| `cancelled_at` | TIMESTAMPTZ | |
| `profile_updated_at` | TIMESTAMPTZ | |

**Status flow:** `pending` → `approved` or `rejected`. Approved members can `cancel` (→ `cancelled`).

---

### `volunteers`

One row per outside volunteer (non-member who signs up to help).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `submitted_at` | TIMESTAMPTZ | |
| `first_name` | TEXT NOT NULL | Max 50 chars |
| `last_name` | TEXT NOT NULL | Max 50 chars |
| `preferred_name` | TEXT | |
| `pronouns` | TEXT | |
| `email` | TEXT NOT NULL | |
| `phone` | TEXT NOT NULL | |
| `signup_intent` | TEXT[] | What they want to help with |
| `status` | TEXT | `pending` / `active` / `cancelled` / `removed` |
| `clerk_user_id` | TEXT | |

---

### `departments`

Groups of related camp roles.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT | Max 40 chars |
| `description` | TEXT | |
| `icon` | TEXT | Emoji or image path (e.g. `/dusk_attendant.png`). Rendered as `<img>` everywhere if starts with `/` |
| `sort_order` | INT | |

---

### `roles`

Individual camp roles within a department.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `department_id` | UUID FK → `departments.id` | |
| `name` | TEXT | Max 28 chars |
| `description` | TEXT | |
| `capacity` | INT | Max number of people for this role |
| `sort_order` | INT | |

---

### `schedule_events`

Public camp schedule entries.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `day` | TEXT | Day label (e.g. `"Thursday"`) |
| `time` | TEXT | Display time string |
| `title` | TEXT | |
| `subtitle` | TEXT | |
| `detail_desc` | TEXT | Expanded description |
| `icon_type` | TEXT | Emoji or icon identifier |
| `visible` | BOOL | Whether shown on public schedule |
| `highlight` | BOOL | Whether visually highlighted |
| `is_recurring` | BOOL | |
| `capacity` | INT | |
| `event_type` | TEXT | `null` (general) / `'all_hands'` / `'camp_tending'` / `'service'` |
| `sort_order` | INT | |
| `contribution_type` | TEXT | `'Setup'` / `'Teardown'` / `'Decor'` — shows event on personal schedule for matching members |

**Color coding by `event_type`:**
- `null` → purple
- `'all_hands'` → teal
- `'camp_tending'` → gold/amber
- `'service'` → purple/pink

---

### `camp_signups`

One row per approved camper's role+shift assignment.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `clerk_user_id` | TEXT | |
| `role_id` | UUID FK → `roles.id` | |
| `schedule_event_id` | UUID FK → `schedule_events.id` | |
| `role_approval_status` | TEXT | Approval state for the specific role claim |

> **Note:** There is no Supabase FK between `camp_signups` and `applications`. Always fetch both tables separately and join in JS.

---

### `admin_notifications`

Bell notifications shown to admins.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `application_id` | UUID FK → `applications.id` ON DELETE CASCADE | Optional link to an application |
| `event_type` | TEXT | Category of notification |
| `message` | TEXT | Display text |
| `details` | JSONB | Extra structured data |
| `created_at` | TIMESTAMPTZ | |
| `read_at` | TIMESTAMPTZ | NULL = unread |

---

### `user_notifications`

Bell notifications shown to individual members.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `clerk_user_id` | TEXT | Recipient |
| `event_type` | TEXT | |
| `message` | TEXT | |
| `details` | JSONB | |
| `created_at` | TIMESTAMPTZ | |
| `read_at` | TIMESTAMPTZ | NULL = unread |

---

### `role_suggestions`

Member-submitted suggestions for new departments or roles. Added in migration `017`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `clerk_user_id` | TEXT NOT NULL | Submitter |
| `applicant_name` | TEXT | Display name at time of submission |
| `dept_name` | TEXT NOT NULL | Suggested department name |
| `role_name` | TEXT NOT NULL | Suggested role name |
| `notes` | TEXT | Optional context from member |
| `status` | TEXT | `pending` / `approved` / `rejected` |
| `created_at` | TIMESTAMPTZ | |
| `reviewed_at` | TIMESTAMPTZ | |

**Approval flow:**
1. Member submits via `SuggestRoleModal` → `POST /api/role-suggestions` → creates `admin_notifications` entry
2. Admin reviews in "Role Suggestions" section → `PATCH /api/admin/role-suggestions/[id]`
3. Approve: finds or creates department (case-insensitive name match), creates role, sends `user_notifications` to member
4. Reject: sends `user_notifications` to member

---

## Storage Buckets

| Bucket | Used for | Bucket access |
|---|---|---|
| `avatars` | Member profile photos (uploaded via `AvatarUpload`) | Public |
| `schedule-icons` | Custom icons for schedule events | Public (must be configured) |

---

## Migrations Reference

| File | What it adds |
|---|---|
| `004_roles_shifts.sql` | `roles`, `shifts` tables |
| `005_departments.sql` | `departments` table |
| `006_role_detail_fields.sql` | Role description, capacity |
| `007_shift_date.sql` | Date field on shifts |
| `008_event_capacity_signup.sql` | Event capacity, `camp_signups` |
| `009_role_approval.sql` | `role_approval_status` on signups |
| `010_application_new_fields.sql` | `setup_preference`, `setup_limitations`, `setup_notes`, `avatar_url`, `pronouns`, etc. |
| `011_volunteer_new_fields.sql` | `preferred_name`, `pronouns` on volunteers |
| `012_schedule_all_hands.sql` | `is_recurring`, `highlight` on schedule events |
| `013_event_type.sql` | `event_type` column |
| `014_volunteer_signup_intent.sql` | `signup_intent` on volunteers (text) |
| `015_volunteer_signup_intent_array.sql` | Converts to `TEXT[]` |
| `016_schedule_contribution_type.sql` | `contribution_type` on schedule events |
| `017_role_suggestions.sql` | `role_suggestions` table, `user_notifications` table |
