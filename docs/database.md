# Database Schema

All tables live in a Supabase (Postgres) project. The base schema is in `supabase-schema.sql`; migrations in `supabase-migrations/` document incremental changes (latest: `035`). Confirm `025` (column renames), `029` (the `application-files` bucket), `033` (group messaging), `034` (group icon images + `group-badges` bucket), and `035` (rename `badge_image` → `icon_image`) are applied before relying on those features.

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
| `setup_preference` | TEXT[] | **Legacy / frozen** as of migration `030` — superseded by the `groups`/`group_members` tables. No longer written or read by the app (historical values remain for backfill). |
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

### `groups`

Configurable groups members belong to (e.g. Setup, Teardown, Decor). Added in migration `030`. **Replaced** the old contribution-types (`setup_preference`) mechanism: members are admin-assigned via Admin → Groups. Applicants can also opt in if an admin adds a **Group selection** field (`type: 'group_select'`) to the member application in the Application Builder. Each such field carries its own configurable list of offered groups in `FieldConfig.options` (group ids; **unset = all groups**, picked via a checklist in the builder). Picks write to `group_choices` → `group_members` (source `'application'`) on submit; `/api/apply` independently re-validates choices against the visible group_select fields' configured ids. Member-facing "contributions" (profile Commitments, attunement task, personal-schedule filtering, members directory) and the admin overview/registry now read group membership via `lib/groups.ts` (`getMemberGroups`, `getGroupNamesByUser`).

**Post-approval self-service:** approved members can join/leave the same offered groups after the fact via the **Your Contributions** section on `/signup` (Participate), backed by `GET/POST /api/groups/membership` (which derives the selectable set from the form's `group_select` fields — the legacy `apply_selectable` column is *not* used). **Icon images:** an optional per-group `icon_image` (migration `034`, renamed from `badge_image` in `035`) is the circle icon of the member's **Active Commitments** row on the profile (`CommitmentsSection.tsx` via `groupCommitmentMeta`), and can be reused as **distinction medal art**; admins upload it in the Groups edit modal.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `description` | TEXT | Shown to applicants when the group is offered by a Group selection field |
| `icon` | TEXT | Emoji |
| `icon_image` | TEXT | Optional public URL of a patch-style icon image (in the `group-badges` bucket — legacy bucket name). Added as `badge_image` in migration `034`, renamed to `icon_image` in `035`. Used as the circle icon of the member's Active Commitments row (`CommitmentsSection.tsx`) and reusable as distinction medal art; admin-uploaded via the Groups edit modal (`POST/DELETE /api/admin/groups/[id]/icon`). |
| `apply_selectable` | BOOL | **Legacy/unused.** Which groups appear on the application (and in member self-service) is now controlled per-field by the **Group selection** field's `options` (see below), not this column. |
| `sort_order` | INT | |
| `join_policy` | TEXT | Governance, added in `033`. `'admin_assigned'` (default — admin manages membership; today's crews) or `'open'` (members self-join/leave). (`'request'` is reserved for when leads exist.) Set in GroupsManager; `open` enables self-join via **Messages → Find a group** (`/api/groups/[id]/join` · `/leave`). |
| `visibility` | TEXT | Added in `033`. `'listed'` (default — open groups appear in the Find-a-group picker) or `'hidden'` (invite/admin-add only, not discoverable). Set in GroupsManager. |
| `created_at` | TIMESTAMPTZ | |

Each group also gets a message **thread** — one `conversations` row (`type='group'`, `group_id` set), created on group creation (`POST /api/admin/groups`) and backfilled for existing groups by migration `033`. See [group-messaging.md](group-messaging.md) and the Group Threads feature.

Managed via Admin → **Groups** (`GroupsManager.tsx`). API: `/api/admin/groups` (GET/POST), `/api/admin/groups/[id]` (PATCH/DELETE).

---

### `group_members`

One row per member assigned to a group. Added in migration `030`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `group_id` | UUID FK → `groups.id` ON DELETE CASCADE | |
| `clerk_user_id` | TEXT NOT NULL | Member identity (join to `applications` in JS, no FK) |
| `source` | TEXT | How they joined: `'admin'` (assigned) or `'application'` (opted in on apply form). Default `'admin'` |
| `role` | TEXT | `'member'` (default) or `'lead'`. Added in `033` for a future leads feature; **unused in v1** (any member can post). |
| `created_at` | TIMESTAMPTZ | |

**Unique constraint:** `(group_id, clerk_user_id)`. Adds use upsert with `ignoreDuplicates`. Roster API: `/api/admin/groups/[id]/members` (GET roster enriched from `applications`, POST add, DELETE remove via `?clerk_user_id=`). Application opt-ins are inserted in `/api/apply`, validated against the offered group ids of the visible `group_select` fields in the saved member-form config.

This table is the **source of truth for group thread access** — group messaging derives "which groups can I see/post in" directly from `group_members`, so adding/removing a member here immediately changes their inbox with no extra wiring.

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
| `contribution_type` | TEXT | A **group name** (e.g. `'Setup'` / `'Teardown'` / `'Decor'`) — shows the event on the personal schedule of members in that group (matched by group name in `lib/groups.ts`) |
| `event_date` | DATE | Actual calendar date. Used to filter Upcoming Gatherings to next 14 days. NULL = always show |
| `event_category` | TEXT | `'at_camp'` (default) / `'pre_camp'` — splits dashboard into separate sections |

`event_type` drives event color coding — see [design-system.md → Event Type Colors](design-system.md#event-type-colors).

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
| `event_type` | TEXT | e.g. `application_approved`/`_rejected`, `role_suggestion_*`, `role_request_*`, `volunteer_approved`, `new_message`, `group_mention`. `UserNotificationBell` maps each to a deep link. |
| `message` | TEXT | |
| `details` | JSONB | Event payload, e.g. `{ senderId }` for `new_message`, `{ groupId, messageId }` for `group_mention` |
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
- `dashboard_layout` — JSON blob controlling the member dashboard widget layout. Shape: `{ order: string[], hidden: string[], widths: Record<string, 'half' | 'full'> }`. Managed by the inline page editor. Widget IDs: `announcements`, `shoutouts`, `polls`, `events`, `spotlight`, `activity`.
- `member_acknowledgements` — JSON array of strings. **Legacy** source for the Many Hands Agreement clauses — now superseded by the `acknowledgements` field's `options` in `config_member_form` (the Agreement field type, edited in the builder). Still read as a fallback when that field has no options. Falls back to `DEFAULT_AGREEMENT_ITEMS` in `lib/site-config.ts`.
- `member_attendance_options` — JSON array of strings. Radio options for the attendance question in the application form. Falls back to `DEFAULT_ATTENDANCE_OPTIONS` in `lib/site-config.ts`.
- `member_membership_types` — JSON array of strings. Options for the membership type dropdown in profile settings. Falls back to `MEMBERSHIP_TYPE_OPTIONS` in `lib/application-options.ts`.
- `community_contribution_types` — **Retired** in migration `030` (Groups replaced contribution types). No longer read; the Application Builder "Contribution Types" tab and the `setup_preference` application field were removed. Any existing row is orphaned/harmless. `parseContributionTypes`/`DEFAULT_CONTRIBUTION_TYPES` remain in `lib/application-options.ts` only as the `ContributionType` shape (`{ value, icon, description }`) reused for group commitment metadata.
- `config_attunement_tasks` — JSON array of `AttunementTask` objects (`{ id, label, requirement, enabled }`) driving the profile **Attunement Status** checklist. `requirement` is one of `role | shift | contribution | photo | approved` and auto-completes the item (logic in `app/profile/page.tsx`). Managed via Admin → Manage → Attunement Tasks (`AttunementTasksManager.tsx`). Falls back to `DEFAULT_ATTUNEMENT_TASKS` in `lib/site-config.ts` (mirrors the original five items).
- `config_shift_signup_open` — string `'true'`/`'false'` (defaults open when absent). When `'false'`, the `/signup` shift picker is hidden behind a "times not confirmed" notice, `/api/signup` POST rejects new/changed shift selections (cancelling an existing shift is still allowed), and any `shift`-requirement attunement task is hidden from the profile checklist (`app/profile/page.tsx`). Toggled via Admin → Manage → Schedule (`ShiftSignupToggle.tsx`). Read by `app/api/signup/route.ts` (returns `shiftSignupOpen` on GET).
- `config_distinctions` — JSON array of `DistinctionRule` objects (`{ id, label, description?, image?, glyph?, yearFact?, conditions[], enabled }`) driving the profile **Cabinet of Distinctions**. Each rule's `conditions` (`{ fact, op, value }`, all must pass) are evaluated against derived member facts — **earned medals are never stored** (see [features.md](features.md#distinctions)). Managed via Admin → Distinctions (`DistinctionsManager.tsx`). Parsed/evaluated by `lib/distinctions.ts` (`parseDistinctions`/`evaluateDistinctions`); facts come from `lib/member-facts.ts` (`buildMemberFacts`). Falls back to `DEFAULT_DISTINCTIONS`.

---

### `messages`

Messages in both **direct (1:1)** and **group** threads. Originally 1:1 only (migration `022`); migration `033` attached every message to a `conversation` and added reply support (group messaging — see [group-messaging.md](group-messaging.md)).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `conversation_id` | UUID FK → `conversations.id` ON DELETE CASCADE | The thread this message belongs to. Added in `033`; backfilled for existing DMs. |
| `sender_clerk_id` | TEXT NOT NULL | Sender's Clerk user ID |
| `recipient_clerk_id` | TEXT | The other party in a **direct** message. **Now nullable** (`033`) — NULL for group messages. Vestigial; kept for legacy DM reads, dropped in a later cleanup. |
| `parent_message_id` | UUID FK → `messages.id` ON DELETE CASCADE | Reply support (`033`). NULL = top-level; set = a reply in that message's thread. **One level only** — replies can't have replies (enforced in the group POST route). Used by group threads. |
| `body` | TEXT NOT NULL | Message content. Max 2,000 chars (DB-enforced CHECK) |
| `sender_name` | TEXT | Snapshot of the sender's display name (`preferred_name`/`first_name`) at send time. Added in migration `032`. Lets a thread keep a readable name after the sender's application is deleted; used as a fallback by the inbox + thread when no profile resolves. |
| `read_at` | TIMESTAMPTZ | **DM-era column.** Per-message read flag for 1:1. Read state is now tracked per-participant on `conversation_participants.last_read_at` (groups can't use a single row-level flag); the DM thread derives `read`/`read_at` from the recipient's `last_read_at`. |
| `created_at` | TIMESTAMPTZ NOT NULL | Defaults to NOW() |

Indexed on `(conversation_id, created_at)`, plus the original `(recipient_clerk_id, …)` / `(sender_clerk_id, …)` indexes.

**Privacy:** direct messages are private to the two parties; group messages are visible to group members only. Admins have no special read access. No FK to `applications` — join in JS using `clerk_user_id`.

---

### `conversations`

One row per thread. A **direct** conversation is a 2-participant DM; a **group** conversation is bound to a group. Added in migration `033`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `type` | TEXT NOT NULL | `'direct'` or `'group'` (CHECK) |
| `group_id` | UUID FK → `groups.id` ON DELETE CASCADE | Set iff `type='group'` (one conversation per group — unique partial index). Deleting a group cascades its thread away. |
| `direct_key` | TEXT | Set iff `type='direct'` — the two clerk ids sorted + joined (`"a\|b"`), unique partial index. Maps each unordered DM pair to exactly one conversation (idempotency + resolve-or-create). |
| `created_at` | TIMESTAMPTZ NOT NULL | |

CHECK constraints keep `group_id`/`direct_key` consistent with `type`. Helpers in `lib/conversations.ts` (`getOrCreateDirectConversation`, `findGroupConversation`/`getOrCreateGroupConversation`, `getMyConversations`, `getUnreadCount`).

---

### `conversation_participants`

Per-user state in a conversation. For **direct** conversations both parties get a row (created with the conversation). For **group** conversations these rows are a **lazily-created cache** — group *membership* is derived from `group_members` (the source of truth), and a participant row is created on first read/post to hold the read cursor. Added in migration `033`.

| Column | Type | Notes |
|---|---|---|
| `conversation_id` | UUID FK → `conversations.id` ON DELETE CASCADE | PK part |
| `clerk_user_id` | TEXT NOT NULL | PK part |
| `last_read_at` | TIMESTAMPTZ | Read cursor. A message is unread for me if `created_at > last_read_at` and I'm not the sender. Advanced by the `…/read` routes. |
| `muted` | BOOL | Per-thread mute, toggled from the group thread's overflow menu (`PATCH …/me`). Muted threads don't contribute to the unread badge. Default `false`. |
| `email_opt_in` | BOOL | Opt in to email for **all** activity in this thread (group thread overflow menu). Group threads are quiet by default, so `false`; when on, the post route emails the member, throttled per quiet period. |
| `joined_at` | TIMESTAMPTZ NOT NULL | |

**Primary key:** `(conversation_id, clerk_user_id)`.

---

### `shoutouts`

Member-posted shoutouts shown on the home-page member dashboard (the `shoutouts` widget). Added in migration `031`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `clerk_user_id` | TEXT NOT NULL | Author identity (join to `applications` in JS for avatar; no FK) |
| `author_name` | TEXT NOT NULL | Display name snapshot at post time (preferred/first name) |
| `body` | TEXT NOT NULL | Post content. 1–250 chars (DB-enforced CHECK) |
| `visible` | BOOL | Reserved for future moderation. Default `true` |
| `created_at` | TIMESTAMPTZ | Defaults to NOW() |

**Who can post:** any approved member (`POST /api/shoutouts`). **Who can delete:** the author or an admin (`DELETE /api/shoutouts/[id]`). The widget (`app/ShoutoutWidget.tsx`) is part of the admin-configurable `dashboard_layout` (widget id `shoutouts`), so it can be reordered/hidden/widened like the others. Avatars are joined in JS from `applications` by `clerk_user_id` at render time (so they stay current).

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
| `group-badges` | Per-group icon images (`/api/admin/groups/[id]/icon` → `groups.icon_image`) | Public — **must be created** (migration `034`, or create in the Supabase dashboard like `avatars`) |

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
| `030_groups.sql` | `groups` + `group_members` tables. Backfills groups from distinct `setup_preference` values and memberships from approved members' selections. **Must be applied** before the Groups feature works. Idempotent. |
| `031_shoutouts.sql` | `shoutouts` table — member-posted shoutouts on the home dashboard. **Must be applied** before the Shoutouts widget works. |
| `032_message_sender_name.sql` | `sender_name` column on `messages` (snapshot of sender display name) + backfill from current application names. Lets conversations survive sender deletion. |
| `033_conversations.sql` | **Group messaging.** Adds `conversations` + `conversation_participants` tables; `messages.conversation_id` + `parent_message_id` (and makes `recipient_clerk_id` nullable); group governance columns (`join_policy`/`visibility` on `groups`, `role` on `group_members`). Backfills a conversation per group and per existing DM pair (preserving read state). Additive + idempotent; **must be applied** before group messaging works. |
| `034_group_badge_image.sql` | `badge_image` column on `groups` (later renamed to `icon_image` by `035`) + public `group-badges` storage bucket and read policy. Additive + idempotent. |
| `035_rename_group_badge_to_icon.sql` | Renames `groups.badge_image` → `groups.icon_image` (the per-group uploaded image, now called an "icon" in the UI/code; the emoji field stays `groups.icon`). Data preserved; bucket keeps its `group-badges` name. **Must be applied** — the profile + Groups admin select `icon_image`. |

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
