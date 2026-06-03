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
| `polls` | Polls | Active, non-expired admin polls. Members vote inline; results shown after voting |
| `events` | Upcoming Gatherings | Pre-camp + at-camp `schedule_events` in the next 14 days. "View full schedule →" links to `/schedule` |
| `spotlight` | Meet a Member | Left: rotating member spotlight (cycles every minute). Right: Upcoming Gatherings list |
| `activity` | Recent Activity | Mixed feed of member joins + profile updates, up to 6 items |

Fixed bottom section (always present):
- **Role & Shift + Many Hands** — quick-link grid to `/signup` and `/members`

**Widget layout:** widgets render in a `display: flex; flex-wrap: wrap; gap: 1.25rem` container. Each widget is `flex: 0 0 100%` (full width) by default, or `flex: 0 0 calc(50% - 0.625rem)` (half width) when configured. Two consecutive half-width widgets sit side by side. On mobile (≤ 680px) all widgets revert to full width.

**Dashboard layout** is stored as `dashboard_layout` JSON in `page_content`:
```json
{ "order": ["announcements","polls","events","spotlight","activity"], "hidden": [], "widths": {} }
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

Sections:
- **Header row** — avatar (260px circle, gold border), centered via `1fr auto 1fr` grid, with role badge overlaid (`transform: translate(-40px, -28px)`). Gear icon (⚙) sits next to the display name and opens `ProfileSettings`.
- **Attunement Status** (`AttunementStatus.tsx`) — parchment card with checklist:
  - Application Approved (always done once on this page)
  - Photo Uploaded — checks `avatar_url`
  - Contribution Selected — checks `contributions.length > 0`; clicking opens ProfileSettings to contributions field
  - Role Selected — checks `campSignup.role_id` (non-pending)
  - Shift Assigned — checks `campSignup.schedule_event_id`
- **Signup Section** (`SignupSection.tsx`) — role/shift picker for approved members. Has "Suggest a role" button that opens `SuggestRoleModal`
- **Commitments** (`CommitmentsSection.tsx`) — shows selected role + shift. `showManageLink` prop controls the "Manage commitments →" footer link — only `true` on `/profile`, not on member-view pages.
- **Personal Schedule** (`PersonalScheduleCalendar.tsx`) — events relevant to the member based on their `setup_preference` and `contribution_type` matching. "View full calendar →" links to `/schedule`.
- **Settings** — gear icon (next to name) opens `ProfileSettings` modal (edit profile fields, contributions, avatar)

Max page width: `1100px`. Layout uses CSS classes (`profile-main-grid`, `profile-info-grid`, `profile-badge-row`) for responsive behavior.

**Custom event:** `ProfileSettings` listens for `glaum:open-settings` dispatched by `AttunementStatus` when member clicks an incomplete item.

---

### Member Directory (`/members`)

**Who:** Approved members only (redirects others to `/profile`)  
**What:** Grid of approved member cards.

Each card shows: circular avatar (80px, gold border `#6F491F`), display name, and role name if assigned and approved (gold small-caps). Members without an avatar show a `✦` glyph (Tokyo Dreams, gold) rather than an initial.

The role text is always rendered (invisible via `opacity: 0` when absent) so every card has the same natural content height. The grid uses `grid-auto-rows: 1fr` and the `<a>` element uses `display: flex; height: 100%` with `flex: 1` on the inner card div, ensuring all cards are the same height across every row.

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
**What:** Inbox listing all conversations, most recent first.

- Each row shows avatar, display name, last message preview, timestamp, and unread count badge
- **"✉ New Message" button** (top-right) opens a searchable member picker modal — lists all approved members, filterable by name, click to navigate to their thread
- Empty state shows "Start a conversation →" which also opens the picker
- Conversations fetched from `/api/messages`; member profiles enriched server-side

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

**Tab: Camp Member Application**
- Open/closed toggle — hides the form from new applicants when closed
- 6 collapsible step sections (Basic Information → Shrimp), plus any custom sections
- Per step: editable title and subtitle, visibility toggle (canHide steps only), ↑↓ reorder, ✕ delete
- Per field: visibility toggle (canHide fields only), inline label editor, inline description editor, REQUIRED/OPTIONAL badge (clickable where allowed), CORE badge for non-hideable built-in fields
- Admin-added fields: type selector (Short text / Long text / Single choice / Multiple choice), options editor for choice fields, ✕ delete
- "+ Add field" buttons at the bottom of every expanded step
- "+ Add section" button at the bottom of the step list — creates a fully custom step

**Tab: Volunteer Signup**
- Open/closed toggle
- Flat field list with same controls as above

**Saving:**
- Visibility toggles, required toggles, field additions/deletions, and step reordering → auto-save immediately
- Label and description edits → accumulated and saved via explicit "Save changes" button

**Config storage:** Full config stored as JSON in `page_content` under `config_member_form` and `config_volunteer_form`. Fetched and merged with defaults on every page load — custom steps/fields survive the merge, built-in steps are updated with saved overrides.

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
- **Role & Shift** (`MemberSignupCard`) — shown when the member has a `clerk_user_id`:
  - Displays current role (department, role name, commitment level, approval status) and shift (title, time, day)
  - **"Approve role"** button — appears when `role_approval_status === 'pending'`; calls `PATCH /api/admin/role-requests/[clerkUserId]`
  - **"Remove role"** button — clears `role_id` + `role_approval_status` from `camp_signups` via `PATCH /api/admin/signups/[clerkUserId]` with `{ clear_role: true }`
  - **"Remove shift"** button — clears `schedule_event_id` via the same endpoint with `{ clear_shift: true }`
  - Confirmation dialog shown before any removal; UI updates optimistically after success
- **Full application fields** — all submitted answers grouped by section

**Key files:** `app/admin/[id]/page.tsx`, `app/admin/MemberSignupCard.tsx`  
**API:** `PATCH /api/admin/signups/[userId]` — accepts `{ clear_role: true }` or `{ clear_shift: true }`

---

### Admin Overview (`/admin/overview`)

**Who:** Admin  
**What:** Summary stats + `MembersDropdown` for quick navigation.

Sections:
- **Participation** — approved member count, signup completion, active volunteer count, members list (expandable)
- **Shift Hours** — total committed, confirmed, pending, volunteer hours
- **Setup & Teardown** — Setup / Teardown / Decor team member pills; limitations count; unassigned count
- **Rideshare** — breakdown by rideshare intent
- **Poll Results** — all polls with bar chart per option (vote count + percentage). Leading option highlighted in gold. Shows Hidden/Closed badges. Hidden if no polls exist.

---

## Supporting Features

### Polls

Admin creates polls in the Admin Dashboard → Polls section (or via `+ Poll` in the page editor).

**Member experience:**
- Active (visible + non-expired) polls appear in the `polls` dashboard widget
- Before voting: plain option buttons
- After voting: animated progress bars, percentages, and vote counts appear
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

**Key file:** `app/api/signup/route.ts`

### Role Suggestion Flow

1. Member opens `SuggestRoleModal` from the Signup Section
2. Fills in department name + role name + optional notes
3. `POST /api/role-suggestions` → creates row in `role_suggestions` + admin notification
4. Admin sees it in "Role Suggestions" section
5. Approve → finds/creates dept (case-insensitive), creates role, notifies member via `user_notifications`
6. Reject → notifies member via `user_notifications`

### Contributions / Setup Preference

Members select setup preferences during application (`setup_preference TEXT[]`):
- `'Setup'` — pre-event setup crew
- `'Teardown'` — post-event teardown crew
- `'Decor'` — decoration crew (auto-added if member's role is in the Decor department)
- `'Other'` — other contributions

`schedule_events.contribution_type` links events to these preferences. Matching events appear on the member's Personal Schedule.

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
