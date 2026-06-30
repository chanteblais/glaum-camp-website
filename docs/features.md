# Feature Map

---

## Navigation

The site uses a single shared `Header` component (`components/HeaderClient.tsx`) on all pages. Nav links switch based on auth + approval state.

**Unauthenticated / not approved:**
```
Glåüm   About · Participate · Schedule · Apply     [Sign in]
```

**Approved members:**
```
Glåüm   Home · Schedule · Many Hands · Messages · My Profile   [🔔 avatar▾]
```

- `Messages` shows an unread count badge (polled every 30s via `/api/messages/unread`)
- Avatar dropdown: Admin link (admin only) + Sign out
- Mobile: hamburger menu with the same contextual links

Nav links for non-approved signed-in users (pending/rejected) show the public set — `/apply` is the only meaningful destination for them.

---

## Public Pages

### Homepage (`/`)

**Who:** Anyone (public view) / Approved members (dashboard view)  
**What:** Two distinct experiences depending on auth state.

**Public (not signed in):**
- TokyoDreams display heading + camp logo
- Hero tagline (`home_tagline` from `page_content`)
- Embedded public schedule (`ScheduleSection` + `ScheduleCalendarClient`)
  - Mobile: day-tab switcher (< 640px)
  - Desktop: 6-column grid
- About + Participate sections (editable via Admin → Edit Page)
- Footer with hands SVG decorations

**Member dashboard (approved + signed in):**

Fixed top sections (always present, not reorderable):
1. **Hero banner** — welcome greeting, countdown to event, hero tagline (`home_tagline`, editable inline)
2. **Attunement + Commitments** — side-by-side (`dash-grid`)

Configurable widgets (order, visibility, and width controlled by admin via the page editor):

| Widget ID | Default label | Content |
|---|---|---|
| `announcements` | Announcements | Visible, non-expired admin announcements; pinned first. Hidden if empty |
| `shoutouts` | Shoutouts | Member-posted shoutouts (newest first). Approved members post via a "✦ Share a shoutout" button at the bottom that opens an inline composer; authors and admins can delete (✕). See **Shoutouts** under Supporting Features |
| `polls` | Polls | Active, non-expired admin polls. Members vote inline; results visible to everyone (voted or not) |
| `events` | Upcoming Gatherings | Pre-camp + at-camp `schedule_events` in the next 14 days. "View full schedule →" links to `/schedule` |
| `spotlight` | Meet a Member | Left: rotating member spotlight (cycles every minute). Right: Upcoming Gatherings list |
| `activity` | Recent Activity | Mixed feed of member joins + profile updates, up to 6 items |

Fixed bottom section (always present):
- **Role & Shift + Many Hands** — quick-link grid to `/signup` and `/members`

**Widget layout:** widgets wrap in a flex row; each is full-width by default or half-width when configured (two consecutive halves pair side by side). All revert to full width on mobile.

**Dashboard layout** is stored as `dashboard_layout` JSON in `page_content`:
```json
{ "order": ["announcements","shoutouts","polls","events","spotlight","activity"], "hidden": [], "widths": {} }
```

Admin-only: **"✎ Edit Page"** floating button (bottom-right). Clicking enters inline edit mode:
- A top bar appears: `Editing · [+ Poll] [Edit Text] [Save] [✕]`
- All widgets get a gold dashed outline
- Hovering a widget reveals a `⠿ Label [½]` handle in its top-right corner
- **Drag the handle** to reorder widgets — the card physically follows the cursor (`position: fixed`) while a dashed placeholder holds the drop slot
- **Click `½`** on the handle to toggle that widget between full and half width (updates live on the page before saving)
- **Click a gold-underlined text element** (e.g. the hero tagline) to edit it inline (`contenteditable`)
- **`+ Poll`** — opens a slide-in panel to create a new poll
- **`Edit Text`** — opens a slide-in panel for copy fields not visible on the dashboard (quote card, About, Participate)
- **`Save`** — writes new order + widths + any text edits to `page_content` and reloads

---

### Apply (`/apply`)

**Who:** Prospective camp members  
**What:** Multi-step application wizard (`ApplyWizard`) driven by the form config stored in `page_content` (`config_member_form`).

**States:**

| State | Condition | What's shown |
|---|---|---|
| Track picker | Signed in, no application | Choose Member or Volunteer track |
| Wizard | `?track=member` | 6-step (or more) multi-step form |
| Applications closed | `config.open === false` | Closed message |
| Pending / Rejected | `application.status` is `pending` or `rejected` | Redirect to `/profile` |
| Approved | `application.status === 'approved'` | Redirect to `/profile#role-signup` |

**Admin preview:** `?track=member&admin_preview=1` lets admins preview the form even when they already have an approved application. Bypasses redirect checks.

**Wizard steps (default):**

| Step | Key | Title |
|---|---|---|
| I | `basic` | Basic Information |
| II | `registry` | Many Hands Registry |
| III | `plans` | What If Plans |
| IV | `roles` | Participation & Roles |
| V | `agreement` | The Many Hands Agreement |
| VI | `shrimp` | Shrimp |

Steps and fields are fully configurable via the Application Builder (`/admin/configure`). Admin-added custom sections and fields are also supported. Custom field answers are submitted as `custom_answers` (JSONB) alongside the standard fields.

The form config is read fresh from `page_content` on every load — no caching. Step numerals (I, II, III…) are derived from position, not stored.

---

### Schedule (`/schedule`)

**Who:** Approved members  
**What:** Full public camp schedule — same `ScheduleSection` + `ScheduleCalendarClient` as the public homepage, wrapped in the member layout with the shared nav. Accessible via the Schedule nav link or "View full schedule →" / "View full calendar →" links on the dashboard.

---

### Volunteer (`/volunteer`)

**Who:** People who want to help but aren't applying as members  
**What:** Single-page signup form (`VolunteerForm`) driven by the volunteer form config stored in `page_content` (`config_volunteer_form`).

Collects name, contact info, pronouns, photo, signup intent, days available, and notes. All fields are configurable via the Application Builder. If `config.open === false`, shows a "Volunteer Signup Closed" screen instead.

**Admin preview:** `?admin_preview=1` bypasses redirect checks for admins.

---

## Authenticated Member Pages

### Profile (`/profile`)

**Who:** Signed-in users with an approved application  
**What:** The member's personal hub.

The page reads like a ceremonial registry, separating three concepts: **Designation** (identity), **Active Commitments** (what they're doing now), and **Distinctions** (earned honours). Engraved medals are reserved for honours — operational info is plain, legible UI.

Sections (approved members):
- **Header** — a three-column registry band (`profile-header-grid`, `1fr auto 1fr`, within the centered content width): **Designation** (left), **portrait** (center, the focal point), **Member Information** (right). No badges live here.
  - **Designation column** — the role + department as *text*, not a medal: a brass emblem (the department `icon`/`icon_image`, else `/handicon.png`), a "DESIGNATION" kicker, the role name (`TokyoDreams`), a `── ✦ ──` divider, the role purpose/description, then the department ("Department of X" is split onto two lines) closed by a small flourish. Only shown when the member has an approved designation.
  - **Portrait** — `AvatarUpload` at an enlarged size (new `size` prop; 340px here vs the 260px default). Click to change photo.
  - **Member Information column** — "MEMBER" kicker, name + settings gear (`ProfileSettings`), `APPROVED CAMPER` pill, email, then an at-a-glance **stat list** (small gold line-icons + right-aligned values, built inline in `page.tsx` via `StatRow`/`StatIcon`): Member since (`joined_year`), Active Commitments (group + shift count), Distinctions Earned (count), Attunement Status (Fully Attuned / N left).
- **Active Commitments** (`CommitmentsSection.tsx`, left card) — the member's groups + shift as legible list rows: circle icon, title, one-line description, a pill (`GROUP`/`TEAM`/`SHIFT`/`LEAD`) and a chevron affordance. Rendered with the `hideRole` prop so the designation is **not** duplicated here (it lives in the header). Icon/description come from `getMemberGroups` → `groupCommitmentMeta` (`lib/groups.ts`): the row icon is the group's emoji `icon`, else its uploaded `icon_image` (rendered as a circle-filling `<img>`), else `✦`; the description falls back to the matching default contribution one-liner when the group has none. `showManageLink` (profile only) renders the centered "View all commitments ›" footer → `/signup`. Shared with `/members/[id]`, which keeps the role row (`hideRole` defaults false).
- **Attunement Status** (`AttunementStatus.tsx`, right card) — parchment card with checklist. **Fully admin-managed** (Admin → Manage → Attunement Tasks, `AttunementTasksManager.tsx`); the list lives in `page_content.config_attunement_tasks` (JSON), parsed by `parseAttunementTasks` in `lib/site-config.ts`. Each task has a `requirement` that auto-completes it; the filtering + done/action logic lives in `buildAttunementChecklist` (`lib/attunement.ts`), the **single source of truth shared by `app/profile/page.tsx` and `app/page.tsx` (home dashboard banner)** so counts stay in sync. Honours each task's `enabled` flag and drops the `shift` task while shift signup is closed; hidden if no enabled tasks. The Commitments and Attunement cards are kept **equal height** (main grid `align-items: stretch`; each card fills the row and anchors its footer/verdict to the bottom). Requirement types (`ATTUNEMENT_REQUIREMENTS`):
  - `role` — `campSignup.role_id` set & non-pending; links to `/signup`
  - `shift` — `campSignup.schedule_event_id` set; links to `/signup`
  - `contribution` — done when the member is in ≥1 **group** (derived from group membership, not `setup_preference`); status-only. Admins can relabel (e.g. "Group Assigned").
  - `photo` — checks `avatar_url`; opens ProfileSettings photo
  - `approved` — always done on this page (reassuring first step)
  - Default list (when key absent) mirrors the original five hardcoded items.
- **Cabinet of Distinctions** (`CabinetOfDistinctions.tsx`, full-width band below the two cards) — a centered gallery of earned **engraved medals** (honours, *not* controls — nothing is clickable). Each medal is the distinction's `image` (a group `icon_image` or pasted URL) or a `glyph` in a CSS frame, with an uppercase label and optional year. Shown only when ≥1 is earned. Distinctions are **derived, never stored** — see [Distinctions](#distinctions) below.
- **Signup Section** (`SignupSection.tsx`) — role/shift picker; "Suggest a role" opens `SuggestRoleModal`.
- **Personal Schedule** (`PersonalScheduleCalendar.tsx`) — events relevant to the member (`schedule_events.contribution_type` matched against the member's **group names**). "View full calendar →" → `/schedule`.
- **Settings** — gear icon opens `ProfileSettings` (edit profile fields, avatar). Groups are admin-assigned, so not edited here.

Max content width: `1100px`. Layout uses CSS classes (`profile-main-grid` [`1.1fr 1fr`, equal-height], `profile-info-grid`, `profile-header-grid`) for responsive behavior; under 768px the header stacks portrait → identity → designation.

**Custom event:** `ProfileSettings` listens for `glaum:open-settings` dispatched by `AttunementStatus` when member clicks an incomplete item.

---

### Member Directory (`/members`)

**Who:** Approved members only (redirects others to `/profile`)  
**What:** Grid of approved member cards.

Each card shows: circular avatar (gold border), display name, and role name if assigned and approved (gold small-caps). Members without an avatar show a `✦` glyph rather than an initial.

**Equal-height cards (load-bearing):** the role text is always rendered (just hidden when absent) and the grid/flex setup forces uniform card heights across rows. Don't "clean up" the empty role line — it's intentional, removing it makes rows ragged.

Linked from nav as "Many Hands".

---

### Member Profile (`/members/[id]`)

**Who:** Approved members  
**What:** View another member's profile.

- Lookup by `clerk_user_id` (default) or UUID
- Same badge + avatar header layout as `/profile`
- Shows `CommitmentsSection` (role + shift) — `showManageLink` is `false` here
- **"✉ Message" button** — links to `/messages/[clerk_user_id]` to start/continue a conversation
- No editing controls

---

### Messages (`/messages`)

**Who:** Approved members  
**What:** Inbox listing **direct conversations and group threads** together, most recent first.

- Each row shows an avatar (or the **group's icon** for group threads), display name, last message preview, timestamp, and unread count badge. Group rows link to `/messages/g/[groupId]`; DM rows to `/messages/[userId]`.
- **Filter tabs — All / Direct / Groups** (shown only when you have both kinds), each with its own unread badge so groups don't get buried under DMs.
- **Group threads always appear** for groups you belong to — even with no messages yet (an entry point: "No messages yet — start the conversation"). Direct conversations appear only once they have messages.
- **"✉ New Message" button** (top-right) opens a searchable member picker modal for **DMs**. **"✦ Find a group"** (beside it) opens a picker of **open, listed** groups you can self-join (`/api/groups/joinable` → `/join`); admin-assigned groups still appear automatically once you're a member.
- **Muted** group threads show a 🔕 and never badge.
- Conversations come from `/api/messages`, backed by the conversations model (`lib/conversations.ts`); group membership is derived from `group_members`, profiles/group names enriched server-side.
- **Deleted members:** DM conversations with a member whose application was removed still appear; their name falls back to the `messages.sender_name` snapshot, or "Member" if none.

---

### Message Thread (`/messages/[userId]`)

**Who:** Approved members  
**What:** Full conversation thread with another approved member.

- Sticky header: back arrow (→ `/messages`), avatar + name (links to `/members/[id]`)
- Message bubbles: sent messages right-aligned (purple tint), received left-aligned (gold tint)
- Timestamps shown when gap between messages > 5 minutes
- Compose area: auto-expanding textarea, 2,000 char limit with counter (shown at 80% full), Enter to send / Shift+Enter for new line
- Polls for new messages every 12 seconds
- Auto-scrolls to bottom on new messages
- Messages from the other person are marked read on page load (via `GET /api/messages/[userId]`)
- **Deleted/inactive other member:** if their application is gone, the page no longer 404s — it renders the thread **read-only** (only when message history exists; otherwise still 404). The header shows their snapshot name (`messages.sender_name`, or "Former member") with a "No longer active" note and is **not** linked to `/members/[id]`; the composer is replaced with a "can't reply" notice (matching `POST /api/messages`, which rejects non-approved recipients). Sender names are snapshotted onto each message at send time so history survives deletion (migration `032`).

---

### Group Thread (`/messages/g/[groupId]`)

**Who:** Members of that group (non-members are redirected to `/messages`; the API returns 403)  
**What:** A shared thread for a group to coordinate. Every group has one (group messaging — full design in [group-messaging.md](group-messaging.md)).

- Sticky header: back arrow, the group's icon + name. Flat, chronological message list with sender name + avatar; consecutive messages from the same sender are grouped.
- **Replies (one level, Slack-style):** each top-level message shows **💬 N replies** (or **↳ Reply**) that expands a collapsible reply thread inline with its own composer. Replies never nest further — enforced both in the UI and in `POST /api/messages/g/[groupId]` (a reply's parent must be a top-level message in the same conversation).
- **`@mention`:** typing `@` in the composer opens a member autocomplete (arrow/Enter/Tab/Esc, caret-aware). On send, the server matches `@Name` against current member display names (so mentions typed in replies notify too), creating an in-app notification **and** an email to the mentioned member. In the rendered message, a recognized mention is shown as a colored pill **linked to that member's profile** (`/members/[id]`) — purple for others, gold when it's **you** — so a successful mention is visually confirmed (an `@name` that doesn't match a member stays plain text).
- **Quiet by default:** ordinary posts create **no emails or notification-feed rows** — the unread badge is the only signal. `@mentions` are the deliberate exception (email gated by the recipient's `email_new_message` pref, throttled 30 min per group).
- Polls every 12s; marks read on view (advances `last_read_at`); auto-scrolls only on new *top-level* messages so reading a thread isn't interrupted.
- **Bell menu** (bell icon at the top-right of the thread header; renders as a slashed/dimmed bell when muted): **Mute** (muted threads don't badge), **Email me about this group** (opt into a throttled activity email for every post), and — for **open** groups — **Leave group**. Backed by `PATCH /api/messages/g/[groupId]/me` and `POST /api/groups/[id]/leave`.

---

## Admin Pages

### Admin Dashboard (`/admin`)

**Who:** Users with `publicMetadata.role === 'admin'` in Clerk  
**What:** Manage all aspects of the camp.

Sections (collapsible via `CollapsibleSection`):

| Section | Component | What it does |
|---|---|---|
| Registered Hands | `VolunteersSection` | Review members + outside volunteers |
| Role Requests | `RoleRequestsSection` | Approve/reject member role claims |
| Role Suggestions | `RoleSuggestionsSection` | Review member-submitted dept/role suggestions |
| Departments | `DepartmentsManager` | CRUD for departments + roles |
| Announcements | `AnnouncementsManager` | Create/edit/delete member-facing announcements |
| Polls | `PollsManager` | Create/edit/delete/toggle polls. Each poll has: question, 2–10 options, visible toggle, multiple-choice toggle, optional expiry |
| Schedule | `ScheduleManager` | CRUD for schedule events |
| Configure Applications | link → `/admin/configure` | Opens the Application Builder |
| Debug Tools | `DebugSection` | Reset test user data |
| Applications | `ApplicationRow` list | Review + approve/reject applications |

**Notifications** (`NotificationBell` + `NotificationsSection`): bell icon in admin header shows unread count. Supports mark-as-read per item, mark-all-read, and delete all.

---

### Application Builder (`/admin/configure`)

**Who:** Admin  
**What:** Full-page form builder for configuring both the Camp Member application and Volunteer signup.

Reached via the "Configure Applications →" link on the admin dashboard.

**The member application is fully modular** — every section and field (built-in or admin-added) can be reordered, edited, resized, hidden, and (non-core) deleted. Config is the source of truth: deletions stick; "Reset to defaults" restores.

**Tab: Camp Member Application**
- Open/closed toggle — hides the form from new applicants when closed
- Collapsible step sections (built-in: Basic Information, Many Hands Registry, What If Plans, Participation & Roles, The Many Hands Agreement, Shrimp) plus any custom sections. Per section: editable title/subtitle, hide, ↑↓ reorder (a custom section can sit **anywhere**, including first), ✕ delete (Basic Information can't be deleted).
- Per field: hide (eye), inline label + description editors, **REQUIRED/OPTIONAL** toggle, **½ / ▭ width** toggle (consecutive halves pair into a two-column row), **↑↓ reorder** (non-locked fields can move past locked ones), ✕ delete. A small read-only type tag shows each custom field's type.
- **Field types:** Short text, Long text, Single choice, Multiple choice (choice fields auto-reveal a fill-in when an option named "Other" is selected), **File upload**, **Agreement** (a checklist of clauses — all required when the field is required), **Group selection** (`group_select`, member form only — a checklist of Groups the applicant can opt into; the admin picks *which* groups the field offers via a checklist in the builder, stored in the field's `options` (unset = all groups); selections add the applicant to those groups on submit). Plus **Divider** and **Text block** layout elements (text blocks render markdown-lite: blank-line paragraphs, `*`/`✦` bullets, `[text](url)`/bare links, `**bold**`).
- **Locked core fields:** First/Last Name, Email, Phone (always present + required, read-only in the builder); Photo is also locked but its Required is toggleable (so admins can allow blank profiles). These are the only NOT-NULL-backed fields.
- "+ Short text / Long text / Single choice / Multiple choice / File upload / Agreement / Group selection / Divider / Text block" buttons at the bottom of every expanded step; "+ Add section" below the step list.
- **Apply-page card editor** — each tab has a title + description editor for the `/apply` TrackPicker card (Camp Member card on the Member tab, Volunteer card on the Volunteer tab), stored in `page_content.config_track_picker`.

**Tab: Volunteer Signup** — open/closed toggle + flat field list with the same per-field controls.

**Saving:** Everything **auto-saves**. Toggles/reorder/width/add/delete save immediately; typed text (labels, descriptions, options/clauses, titles) debounce-saves ~0.7s after you stop typing. A floating top-right status pill shows **Saving… / All changes saved / error + Retry**.

**Config storage:** JSON in `page_content` under `config_member_form` and `config_volunteer_form`. `mergeMemberConfig` (in `lib/form-config.ts`) reconciles saved config with defaults: it **preserves the saved order of all sections** (built-in + custom), merges built-in field overrides, keeps custom fields as-is, and only re-injects missing *locked* fields (deleted non-core fields stay deleted). Agreement clauses and most option lists now live in the field's `options` in the config (not the legacy `member_acknowledgements` key, which is still read as a fallback).

**Test link:** "Test this application →" opens `/apply?track=member&admin_preview=1` to preview the form live as an admin.

**Key file:** `lib/form-config.ts` — defines `MemberFormConfig`, `VolunteerFormConfig`, all default step/field definitions, and `mergeMemberConfig`/`mergeVolunteerConfig` helpers.

**Mobile layout:** The sidebar collapses to a horizontal scrollable step-indicator strip at the top. Two-column form grids (name pairs, date pairs, etc.) collapse to single column at `< 768px`. `isMobile` is detected via `window.innerWidth < 768` and passed as a prop to each section component.

---

### Admin Application View (`/admin/[id]`)

**Who:** Admin  
**What:** Full detail view of a single application with approve/reject controls and role/shift management.

Sections:
- **Header** — avatar, name, status pill, submitted date
- **Approve / Reject controls** (`AdminActions`) — visible for pending applications
- **Remove member** (`RemoveMemberButton`) — visible for approved applications. Soft-removes: sets `status = 'cancelled'` with a reason, deletes the member's `camp_signups` (frees their role + shift), and notifies them (in-app + email). Reversible by re-approving.
- **Role & Shift** (`MemberSignupCard`) — shown when the member has a `clerk_user_id`:
  - Displays current role (department, role name, commitment level, approval status) and shift (title, time, day)
  - **"Approve role"** button — appears when `role_approval_status === 'pending'`; calls `PATCH /api/admin/role-requests/[clerkUserId]`
  - **"Remove role"** button — clears `role_id` + `role_approval_status` from `camp_signups` via `PATCH /api/admin/signups/[clerkUserId]` with `{ clear_role: true }`
  - **"Remove shift"** button — clears `schedule_event_id` via the same endpoint with `{ clear_shift: true }`
  - Confirmation dialog shown before any removal; UI updates optimistically after success
- **Full application fields** — all submitted built-in answers grouped by section
- **Additional Responses** — answers to admin-added custom fields, with labels resolved from the form config (orphaned/deleted-field answers shown by key). File-upload answers render as download links; "Other" fill-ins shown as an "Other: …" line. Answers to the built-in Many Hands Agreement still show in their own Acknowledgements section.

**Key files:** `app/admin/[id]/page.tsx`, `app/admin/MemberSignupCard.tsx`, `app/admin/RemoveMemberButton.tsx`  
**API:** `PATCH /api/admin/signups/[userId]` — accepts `{ clear_role: true }` or `{ clear_shift: true }`

---

### Admin Overview (`/admin/overview`)

**Who:** Admin  
**What:** Summary stats + `MembersDropdown` for quick navigation.

Sections:
- **Participation** — approved member count, signup completion, active volunteer count, members list (expandable)
- **Shift Hours** — total committed, confirmed, pending, volunteer hours
- **Setup & Teardown** — Setup / Teardown / Decor team member pills (derived from **group membership** by group name, via `getGroupNamesByUser`); limitations count; "unassigned" = members in no group
- **Rideshare** — breakdown by rideshare intent
- **Poll Results** — all polls with bar chart per option (vote count + percentage). Leading option highlighted in gold. Shows Hidden/Closed badges. Hidden if no polls exist.

---

## Supporting Features

### Shoutouts

Member-posted shoutouts shown on the home-page member dashboard (the `shoutouts` widget). A lightweight, member-driven complement to admin Announcements.

**Member experience:**
- The widget shows the shoutout feed (newest first): author avatar, name, time-ago, and body.
- Approved members post via a **"✦ Share a shoutout"** button pinned at the bottom; it opens an inline composer (avatar + textarea, 250-char limit with counter, Cancel / Post). On success the composer collapses and the new shoutout appears at the top.
- A member can **delete their own** shoutout via the ✕ on it; **admins can delete any**.
- Author avatars are joined in JS from `applications` at render time (no FK), so they stay current.

**Data + auth:**
- Table `shoutouts` (migration `031`): `clerk_user_id`, `author_name` (display-name snapshot), `body` (1–250 chars, DB CHECK), `visible` (reserved for moderation), `created_at`.
- Posting requires an **approved** member (same check as role suggestions). Delete is allowed for the **author or an admin**.

**API routes:**
- `GET /api/shoutouts` — list visible shoutouts (authenticated)
- `POST /api/shoutouts` — post a shoutout (approved members)
- `DELETE /api/shoutouts/[id]` — delete a shoutout (author or admin)

**Key files:** `app/ShoutoutWidget.tsx`, `app/api/shoutouts/route.ts`, `app/api/shoutouts/[id]/route.ts`, wired into `app/page.tsx` (widget map) and `app/HomePageEditor.tsx` (layout label).

---

### Polls

Admin creates polls in the Admin Dashboard → Polls section (or via `+ Poll` in the page editor).

**Member experience:**
- Active (visible + non-expired) polls appear in the `polls` dashboard widget
- Results (progress bars, percentages, vote counts) are visible to **all** members, voted or not — voting just adds the ✓ highlight on your choice
- Members can change their vote at any time (previous votes are replaced)
- Single-choice and multiple-choice modes supported

**Admin experience:**
- Create/edit via `PollsManager` (Admin Dashboard) or the `+ Poll` button in page edit mode
- Visibility toggle per poll (hidden polls still store votes, just aren't shown to members)
- Optional expiry date — expired polls show a "closed" badge and accept no new votes
- Results visible in Admin Overview → Poll Results section with bar charts

**API routes:**
- `GET /api/admin/polls` — list all polls (admin only)
- `POST /api/admin/polls` — create poll (admin only)
- `PATCH /api/admin/polls/[id]` — edit poll (admin only)
- `DELETE /api/admin/polls/[id]` — delete poll + all votes (admin only)
- `POST /api/polls/[id]/vote` — submit or update a member's vote (authenticated members)

**Key files:** `app/PollWidget.tsx`, `app/admin/PollsManager.tsx`, `app/api/admin/polls/`, `app/api/polls/`

---

### Role Badge

Generated at `/api/badge?role=...&dept=...` as a PNG. Displayed on profile and member pages. See [architecture.md](architecture.md) for generation details.

### Role Selection & Approval Flow

Members pick a role via `SignupSection` on `/profile`. The selection is submitted to `POST /api/signup`.

**Approval logic in `POST /api/signup`:**
- If the role changed (`isRoleChange = true`) and `roles.requires_approval = true` → `role_approval_status` is set to `'pending'` and an admin notification is created
- If the role changed and `requires_approval = false` → `role_approval_status` is set to `null` (immediately confirmed)
- If the role did **not** change (e.g. member is only updating their shift) → the existing `role_approval_status` is **preserved unchanged**. This is critical: without this, a shift-only update would silently wipe a `'pending'` approval status, making the role appear confirmed without ever being reviewed.

**`role_approval_status` values:**
| Value | Meaning |
|---|---|
| `null` | No approval needed (role doesn't require it), or role was cleared |
| `'pending'` | Waiting for admin review |
| `'approved'` | Admin approved the role request |

**Admin approval:** via `PATCH /api/admin/role-requests/[clerkUserId]` with `{ decision: 'approved' | 'rejected' }`. Approval sets `role_approval_status = 'approved'`. Rejection sets `role_id = null` and clears the status. Both send a `user_notifications` row to the member.

The dedicated **Participate** page (`/signup`) hosts `SignupSection` (role + shift) and, below it, the **Your Contributions** group opt-in (`GroupCommitments` — see [Groups](#groups)). The Commitments card's "Manage commitments →" link points here.

**Key file:** `app/api/signup/route.ts`

### Role Suggestion Flow

1. Member opens `SuggestRoleModal` from the Signup Section
2. Fills in department name + role name + optional notes
3. `POST /api/role-suggestions` → creates row in `role_suggestions` + admin notification
4. Admin sees it in "Role Suggestions" section
5. Approve → finds/creates dept (case-insensitive), creates role, notifies member via `user_notifications`
6. Reject → notifies member via `user_notifications`

### Groups

Configurable groups members belong to (e.g. Setup, Teardown, Decor). **Replaced** the old contribution-types/`setup_preference` mechanism (migration `030`; see [database.md](database.md) for the `groups` + `group_members` tables).

Every group also has a **message thread** for coordination — see [Group Thread](#group-thread-messagesggroupid) above and [group-messaging.md](group-messaging.md). Governance (`join_policy`, `visibility`) and member self-join/leave shipped in Phase 6; **leads** (`group_members.role`) and the `request` join policy are still to come.

**Admin — `Admin → Groups` (`GroupsManager.tsx`):**
- Create / edit / delete / reorder groups (name, description, icon).
- **Who can join** — `admin_assigned` (admins manage membership; the default, for crews) or `open` (members self-join/leave). **Visibility** — `listed` (open groups appear in the member Find-a-group picker) or `hidden`. Open groups show an `OPEN` pill in the list.
- Expand a group to see its **roster** and **assign members** (searchable picker of approved members) or remove them. Each membership records a `source` (`admin`, `application`, or `self` for self-join).
- **Icon** (optional): in the group **edit** modal, upload/replace/remove a patch-style image (`IconField` → `POST/DELETE /api/admin/groups/[id]/icon`, stored in the public `group-badges` bucket — legacy bucket name — written to `groups.icon_image`; uploads are centroid-centered + normalized to a standard frame by `lib/icon-image.ts`). A brand-new group must be saved first, then re-opened to add an icon. (Separate from the optional **emoji** field, `groups.icon`.)
- API: `/api/admin/groups` (GET/POST), `/api/admin/groups/[id]` (PATCH/DELETE), `/api/admin/groups/[id]/members` (GET roster / POST add / DELETE remove), `/api/admin/groups/[id]/icon` (POST/DELETE icon image).

**Applicant opt-in (optional):** admins can add a **Group selection** field (`group_select`) to the member application in the Application Builder. The field carries its own list of offered groups in `FieldConfig.options` (group ids; **unset = all groups**, chosen via a checklist in the builder). On submit, picks become `group_members` rows (`source = 'application'`); `/api/apply` re-validates choices against the visible `group_select` fields' configured ids. (The legacy per-group `apply_selectable` column is unused.)

**Member self-service:** approved members can join/leave the same offered groups anytime via the **Your Contributions** section on `/signup` (`GroupCommitments.tsx` → `GET/POST /api/groups/membership`). The selectable set is derived from the form's visible `group_select` fields (same logic as `/api/apply`) — **not** `apply_selectable`. Toggling calls `router.refresh()` so the Commitments card + stat counts update. If no `group_select` field exists, the section shows "No opt-in groups are available right now."

**Group visuals on the profile:** each group's icon appears as the circle icon of its **Active Commitments** row — the emoji `icon` if set, else the uploaded `icon_image` (rendered as a circle-filling `<img>`, scaled to crop the wide icon-frame margins), else `✦` (`groupCommitmentMeta` in `lib/groups.ts`). A group's `icon_image` can also be reused as **distinction medal art** (picked in the Distinctions admin builder). The old scattered-badge cluster (`ContributionBadges.tsx`) was removed in the profile refactor.

**Where group membership is read:** member Commitments card, the `contribution` attunement task, Personal Schedule filtering (`schedule_events.contribution_type` matched to group names), the members directory, and Admin Overview/Registry — all via `lib/groups.ts` (`getMemberGroups`, `getGroupNamesByUser`). `schedule_events.contribution_type` still holds a group name (e.g. `'Setup'`) to surface an event for that group's members.

**Key files:** `app/admin/GroupsManager.tsx`, `app/profile/GroupCommitments.tsx`, `app/profile/CommitmentsSection.tsx`, `app/api/admin/groups/`, `app/api/groups/membership/route.ts`, `lib/groups.ts`, `lib/icon-image.ts`.

### Distinctions

Earned, ceremonial honours shown as engraved medals in the profile's **Cabinet of Distinctions**. The architectural rule is **store facts, not badges** — distinctions are *derived* on every render from member facts + admin rules, never persisted.

- **Facts** (`lib/member-facts.ts`) — `buildMemberFacts({ application, roleInfo, memberGroups, roleApproved })` returns a typed `MemberFacts` object. This pass is **derive-only**: only facts sourceable today are computed — `joined_year`/`years_since_joined` (from `applications.submitted_at`), `designation`/`department` (role join), `group_count`/`groups`, `camped_before`, `has_photo`, `is_approved`. `MEMBER_FACT_CATALOG` describes each fact (key, label, type) so the admin builder can render the right operator/value inputs.
- **Rules** (`lib/distinctions.ts`) — admin-configurable, stored as one JSON string in `page_content.config_distinctions` (mirrors the Attunement Tasks pattern). `parseDistinctions` parses/validates (falling back to `DEFAULT_DISTINCTIONS`); `evaluateDistinctions(facts, rules)` returns the earned medals (enabled rules whose conditions **all** pass). A `DistinctionRule` has a label, optional description, medal `image`/`glyph`, optional `yearFact`, and AND'd `conditions` (`{ fact, op, value }`, ops in `DISTINCTION_OPS`). A condition on an absent/null fact never passes, so rules referencing not-yet-derivable facts (e.g. `camps_attended` for "Glåüm Elder") stay dormant until that fact exists.
- **Admin** — `Admin → Distinctions` (`DistinctionsManager.tsx`, cloned from `AttunementTasksManager`): add/edit/reorder/enable rules with debounced autosave to `config_distinctions`. Medal art is picked from existing group `icon_image`s (`groupIconOptions`, passed from `app/admin/page.tsx`), a pasted URL, or an emoji glyph; conditions use the fact catalog.
- **Defaults** — Founding Member (`joined_year ≤ 2026`), Five Year Attunement (`years_since_joined ≥ 5`), Many Hands (`group_count ≥ 3`), and a dormant Glåüm Elder. So the cabinet populates out of the box.

**Out of scope (deferred):** a member-facts DB migration for facts that aren't derivable yet (`camps_attended`, `years_attended`, `shift_count`, `founder_status`, …). Rules referencing them are defined but stay dormant.

**Key files:** `lib/member-facts.ts`, `lib/distinctions.ts`, `app/profile/CabinetOfDistinctions.tsx`, `app/admin/DistinctionsManager.tsx`, wired in `app/profile/page.tsx` + `app/admin/page.tsx` (`config_distinctions`).

### Notifications

**Admin notifications** (`admin_notifications`): triggered by new applications, volunteer signups, role suggestions.  
**User notifications** (`user_notifications`): triggered by application status changes, role suggestion decisions, and new messages.

User notification `event_type` values and their bell link destinations:

| `event_type` | Bell link |
|---|---|
| `application_approved` | `/profile` |
| `application_rejected` | `/apply` |
| `role_suggestion_approved` | `/profile#role-signup` |
| `role_suggestion_rejected` | `/profile` |
| `role_request_approved` | `/profile` |
| `role_request_rejected` | `/profile#role-signup` |
| `volunteer_approved` | `/profile` |
| `new_message` | `/messages/[senderId]` (or `/messages` if no sender in details) |

Both support:
- Per-item mark-as-read
- Mark all as read
- Delete all (admin only)
