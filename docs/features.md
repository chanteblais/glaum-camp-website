# Feature Map

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

Widget order (top to bottom):
1. **Hero banner** — welcome greeting, countdown to event, quote card (`home_quote`), hero tagline (`home_tagline`)
2. **Attunement + Commitments** — side-by-side (`dash-grid`)
3. **Announcements** — visible, non-expired admin announcements; pinned first. Hidden if none
4. **Pre-Camp Gatherings** — `schedule_events` with `event_category = 'pre_camp'` in next 14 days. Hidden if none
5. **Upcoming Gatherings** — `schedule_events` with `event_category = 'at_camp'` in next 14 days. Hidden if none
6. **Meet a Member + Your Schedule** — side-by-side (`5fr 7fr` grid). Meet a Member rotates every minute from approved member pool
7. **Recent Activity** — mixed feed of member joins + profile updates, up to 6 items
8. **Many Hands link** — shortcut to member directory

Admin-only: floating **Edit Page** button (bottom-right) opens a slide-in panel to edit `home_tagline`, `home_quote`, About, and Participate copy.

---

### Apply (`/apply`)

**Who:** Prospective camp members  
**What:** Application form with 4 distinct states based on the user's current status.

| State | Condition | What's shown |
|---|---|---|
| No application | Not signed in or no record | Full `ApplyForm` |
| Pending / Rejected | `application.status` is `pending` or `rejected` | Status message, no form |
| Approved | `application.status === 'approved'` | Role + shift picker (`SignupSection`) |
| Active volunteer | Record in `volunteers` table | Volunteer status view |

`ApplyForm` collects:
- Personal info (name, pronouns, contact, location)
- "What If" camp plans (arrival/departure, vehicle, rideshare)
- Participation info (contributions, energizing activities)
- Capacity & accessibility
- Culture questions (draws to Glåüm, healthy community)
- Acknowledgements
- Fun question (shrimp relationship)

Name fields capped at 50 chars via `maxLength`.

---

### Volunteer (`/volunteer`)

**Who:** People who want to help but aren't applying as members  
**What:** Simplified signup form (`VolunteerForm`)

Collects name, contact info, pronouns, and `signup_intent` (multi-select of what they want to help with). Name fields capped at 50 chars.

---

## Authenticated Member Pages

### Profile (`/profile`)

**Who:** Signed-in users with an approved application  
**What:** The member's personal hub.

Sections:
- **Header row** — avatar (260px circle, gold border), centered via `1fr auto 1fr` grid, with role badge overlaid (`transform: translate(-40px, -28px)`)
- **Attunement Status** (`AttunementStatus.tsx`) — parchment card with checklist:
  - Application Approved (always done once on this page)
  - Photo Uploaded — checks `avatar_url`
  - Contribution Selected — checks `contributions.length > 0`; clicking opens ProfileSettings to contributions field
  - Role Selected — checks `campSignup.role_id` (non-pending)
  - Shift Assigned — checks `campSignup.schedule_event_id`
- **Signup Section** (`SignupSection.tsx`) — role/shift picker for approved members. Has "Suggest a role" button that opens `SuggestRoleModal`
- **Commitments** (`CommitmentsSection.tsx`) — shows selected role + shift
- **Personal Schedule** (`PersonalScheduleCalendar.tsx`) — events relevant to the member based on their `setup_preference` and `contribution_type` matching
- **Settings** — gear icon opens `ProfileSettings` modal (edit profile fields, contributions, avatar)

Max page width: `1100px`. Layout uses CSS classes (`profile-main-grid`, `profile-info-grid`, `profile-badge-row`) for responsive behavior.

**Custom event:** `ProfileSettings` listens for `glaum:open-settings` dispatched by `AttunementStatus` when member clicks an incomplete item.

---

### Member Directory (`/members`)

**Who:** Signed-in users (redirects non-approved visitors to `/profile`)  
**What:** Grid of approved member cards — avatar + name.

Linked from nav as "Many Hands" (shown only when signed in).

---

### Member Profile (`/members/[id]`)

**Who:** Signed-in users  
**What:** View another member's profile.

- Lookup by `clerk_user_id` (default) or UUID
- Same badge + avatar header layout as `/profile`
- Shows `CommitmentsSection` (role + shift)
- No editing controls

---

## Admin Pages

### Admin Dashboard (`/admin`)

**Who:** Users with `publicMetadata.role === 'admin'` in Clerk  
**What:** Manage all aspects of the camp.

Sections (collapsible via `CollapsibleSection`):

| Section | Component | What it does |
|---|---|---|
| Overview | `OverviewSection` | Stats snapshot |
| Registered Hands | `ApplicationRow` list | Review + approve/reject applications |
| Contributions | `ContributionsSection` | View setup/teardown/decor preferences |
| Setup/Teardown | `SetupTeardownSection` | Setup crew management |
| Volunteers | `VolunteersSection` | Review + manage volunteer signups |
| Role Requests | `RoleRequestsSection` | Approve/reject member role claims |
| Role Suggestions | `RoleSuggestionsSection` | Review member-submitted dept/role suggestions |
| Announcements | `AnnouncementsManager` | Create/edit/delete member-facing announcements |
| Departments | `DepartmentsManager` | CRUD for departments + roles |
| Schedule | `ScheduleManager` + `ShiftsManager` | CRUD for schedule events + shifts. Each event has `event_date`, `event_category` (`at_camp`/`pre_camp`) |
| Registry | Member signup grid | View all member role+shift assignments |

**Notifications** (`NotificationBell` + `NotificationsSection`): bell icon in admin header shows unread count. Supports mark-as-read per item, mark-all-read, and delete all.

---

### Admin Application View (`/admin/[id]`)

**Who:** Admin  
**What:** Full detail view of a single application with approve/reject controls.

---

### Admin Overview (`/admin/overview`)

**Who:** Admin  
**What:** Summary stats + `MembersDropdown` for quick navigation.

---

## Supporting Features

### Role Badge

Generated at `/api/badge?role=...&dept=...` as a PNG. Displayed on profile and member pages. See [architecture.md](architecture.md) for generation details.

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
**User notifications** (`user_notifications`): triggered by application status changes and role suggestion decisions.

Both support:
- Per-item mark-as-read
- Mark all as read
- Delete all (admin only)
