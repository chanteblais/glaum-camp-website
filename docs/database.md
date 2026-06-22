# Database Schema

All tables live in a Supabase (Postgres) project. The base schema is in `supabase-schema.sql`; migrations in `supabase-migrations/` document incremental changes (latest: `029`). Confirm `025` (column renames), and `029` (the `application-files` bucket) are applied before relying on those features.

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
| `attendance` | TEXT | How they plan to participate |
| `arrival_date` | TEXT | |
| `departure_date` | TEXT | |
| `membership_type` | TEXT | Camping on site / staying nearby / visiting socially / etc. Renamed from `camp_relationship` in migration `025`. Options configurable via `page_content` key `member_membership_types`. |
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
| `community_acceptance` | TEXT | "Yes / Not Yet / It's Complicated". Renamed from `glaum_acceptance` in migration `025`. Label configurable via form-config. |
| `onboarding_status` | TEXT[] | Self-reported onboarding/attunement status. Renamed from `attunement_status` in migration `025`. |
| `onboarding_status_other` | TEXT | Free-text when `onboarding_status = 'Other'`. Renamed from `attunement_status_other` in migration `025`. |
| `draws_to_community` | TEXT | What drew them to this community. Renamed from `draws_to_glaum` in migration `025`. |
| `healthy_community` | TEXT | |
| `acknowledgements` | TEXT[] | The agreement items they checked. Items are configurable via `page_content` key `member_acknowledgements`. |
| `shrimp_relationship` | TEXT | Glåüm-specific fun question — will move to `custom_answers` in a future migration. |
| `avatar_url` | TEXT | Supabase Storage URL |
| `custom_answers` | JSONB | Answers to admin-added custom fields/sections. Added in migration `023`. |
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
| `event_date` | DATE | Actual calendar date. Used to filter Upcoming Gatherings to next 14 days. NULL = always show |
| `event_category` | TEXT | `'at_camp'` (default) / `'pre_camp'` — splits dashboard into separate sections |

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

### `announcements`

Admin-posted updates shown to all approved members on the dashboard.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `body` | TEXT | Optional detail text |
| `pinned` | BOOL | Pinned items sort first. Default `false` |
| `visible` | BOOL | Whether shown to members. Default `true` |
| `expires_at` | TIMESTAMPTZ | Auto-hides after this date. NULL = show indefinitely |
| `created_at` | TIMESTAMPTZ | |

---

### `page_content`

Admin-editable copy for the homepage. One row per key.

| Column | Type | Notes |
|---|---|---|
| `key` | TEXT PK | e.g. `home_tagline`, `home_quote`, `home_about_heading` |
| `value` | TEXT | The content |
| `updated_at` | TIMESTAMPTZ | |

**Known keys:**
- `home_tagline` — hero tagline (shown on public page + logged-in dashboard). Editable inline in page edit mode.
- `home_quote` — quote card text in logged-in hero banner
- `home_about_heading` / `home_about_body` — About section (public page)
- `home_participate_heading` / `home_participate_body` — Participate section (public page)
- `config_member_form` — JSON blob (`MemberFormConfig`) for the camp member application. Set by Application Builder. `mergeMemberConfig` (in `lib/form-config.ts`) reconciles it with defaults on every load: preserves the saved order of **all** sections (built-in + custom, so a custom section can be first), merges built-in field overrides, keeps custom fields/elements as-is, and re-injects only missing *locked* core fields. Field option lists and **agreement clauses** now live in each field's `options` here (editable in the builder).
- `config_volunteer_form` — JSON blob (`VolunteerFormConfig`) for the volunteer signup. Same pattern (flat field list, no custom sections).
- `config_track_picker` — JSON `{ memberTitle, memberDesc, volunteerTitle, volunteerDesc }` for the `/apply` TrackPicker cards. Edited in the Application Builder (Member/Volunteer tabs). Falls back to `DEFAULT_TRACK_COPY` in `lib/site-config.ts`.
- `dashboard_layout` — JSON blob controlling the member dashboard widget layout. Shape: `{ order: string[], hidden: string[], widths: Record<string, 'half' | 'full'> }`. Managed by the inline page editor. Widget IDs: `announcements`, `polls`, `events`, `spotlight`, `activity`.
- `member_acknowledgements` — JSON array of strings. **Legacy** source for the Many Hands Agreement clauses — now superseded by the `acknowledgements` field's `options` in `config_member_form` (the Agreement field type, edited in the builder). Still read as a fallback when that field has no options. Falls back to `DEFAULT_AGREEMENT_ITEMS` in `lib/site-config.ts`.
- `member_attendance_options` — JSON array of strings. Radio options for the attendance question in the application form. Falls back to `DEFAULT_ATTENDANCE_OPTIONS` in `lib/site-config.ts`.
- `member_membership_types` — JSON array of strings. Options for the membership type dropdown in profile settings. Falls back to `MEMBERSHIP_TYPE_OPTIONS` in `lib/application-options.ts`.
- `community_contribution_types` — JSON array of `ContributionType` objects. Defines the communal responsibilities members can sign up for (stored in `setup_preference`). Each object has `value` (string, stored in DB), `icon` (emoji), `description` (shown in commitments card), and `autoForDeptKeyword` (optional — if a member's dept name contains this keyword, the contribution is auto-added). Managed via Admin → Application Builder → Contribution Types tab. Falls back to `DEFAULT_CONTRIBUTION_TYPES` in `lib/application-options.ts`.

---

### `messages`

Direct messages between approved camp members. Added in migration `022`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `sender_clerk_id` | TEXT NOT NULL | Sender's Clerk user ID |
| `recipient_clerk_id` | TEXT NOT NULL | Recipient's Clerk user ID |
| `body` | TEXT NOT NULL | Message content. Max 2,000 chars (DB-enforced CHECK) |
| `read_at` | TIMESTAMPTZ | NULL = unread |
| `created_at` | TIMESTAMPTZ NOT NULL | Defaults to NOW() |

Indexed on `(recipient_clerk_id, created_at DESC)` and `(sender_clerk_id, created_at DESC)` for fast inbox + thread queries.

**Privacy:** messages are private — only sender and recipient can access them. Admins have no read access. No FK to `applications` — join in JS using `clerk_user_id`.

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
| `avatars` | Member profile photos (uploaded via `AvatarUpload`; also the application Photo field → `/api/profile/avatar`) | Public |
| `schedule-icons` | Custom icons for schedule events | Public (must be configured) |
| `application-files` | Attachments for admin-added **File upload** application fields (`/api/apply/file`) | Public — **must be created** (migration `029`, or create in the Supabase dashboard like `avatars`) |

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
| `018_page_content.sql` | `page_content` table |
| `019_schedule_event_date.sql` | `event_date DATE` on `schedule_events` |
| `020_announcements.sql` | `announcements` table |
| `021_event_category.sql` | `event_category TEXT` on `schedule_events` (default `'at_camp'`) |
| `022_messages.sql` | `messages` table with sender/recipient/body/read_at + indexes |
| `023_custom_answers.sql` | `custom_answers JSONB` on `applications` for admin-added form fields |
| `024_polls.sql` | `polls` and `poll_votes` tables |
| `025_rename_community_fields.sql` | Renames five community-specific columns on `applications` to generic equivalents: `glaum_acceptance → community_acceptance`, `attunement_status → onboarding_status`, `attunement_status_other → onboarding_status_other`, `draws_to_glaum → draws_to_community`, `camp_relationship → membership_type`. **Must be applied before next deploy.** |
| `026_notification_preferences.sql` | `notification_preferences` table |
| `027_messages_read.sql` | Message read/notification tracking on `messages` |
| `028_event_rsvps.sql` | `event_rsvps` table |
| `029_application_files_bucket.sql` | Public `application-files` storage bucket + read policy (for File-upload fields). **Must be applied** (or create the bucket manually). |

---

### `polls`

Admin-created polls shown to approved members on the dashboard.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `question` | TEXT NOT NULL | The poll question |
| `options` | JSONB NOT NULL | Array of option strings e.g. `["Yes", "No", "Maybe"]` |
| `visible` | BOOL NOT NULL | Whether shown to members. Default `true` |
| `allow_multiple` | BOOL NOT NULL | Allow members to select more than one option. Default `false` |
| `expires_at` | TIMESTAMPTZ | Auto-closes after this date. NULL = open indefinitely |
| `created_at` | TIMESTAMPTZ NOT NULL | |

---

### `poll_votes`

One row per member per option voted on.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `poll_id` | UUID FK → `polls.id` ON DELETE CASCADE | |
| `clerk_user_id` | TEXT NOT NULL | Voter |
| `option_index` | INT NOT NULL | Zero-based index into `polls.options` |
| `created_at` | TIMESTAMPTZ NOT NULL | |

**Unique constraint:** `(poll_id, clerk_user_id, option_index)` — one vote per option per member. Votes are replaced (not accumulated) when a member changes their answer: the API deletes existing votes for that poll+user then re-inserts.
