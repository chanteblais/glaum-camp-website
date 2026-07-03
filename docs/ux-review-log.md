# UX Review Log — Admin Console

Running log of findings from the recurring UX-adviser pass. Each finding carries a
**Severity** (how much it hurts an organizer using the console), an **Effort** guess,
and a **Status** (`proposed` → Chante decides → `fix agreed` / `fixed` / `dismissed`).
Newest review at the top. Fixes are only applied once agreed.

---

## Session close-out — 2026-07-02 (evening)

### 19. `/admin/[id]` URL says nothing about what it is · Severity: low (advice) · Status: proposed

Chanté (the app's own author) mistook an `/admin/<uuid>` link for the public
profile — three person-views exist (`/admin/[id]` admin dossier, `/members/[id]`
public profile, `/profile` own profile) and the admin one's URL self-describes
least. Proposal: rename to `/admin/member/[id]` with a redirect from the old path
(notification emails link to it), whenever routes are next touched.

### 20. Orphaned `cf_*` keys in `member_profiles.values` — investigated · Status: resolved (explained); cleanup proposed

The ~8 members carrying raw `cf_*` keys (noticed in the 2026-07-02 morning pass):
all four keys map to live form fields ("Current Attunement Status", "Confirmation",
"Preferred Role", "Space Requrements") whose `profileFieldKey` binding is now null.
They're relics of the profile catch-up seeding; the values duplicate
`applications.custom_answers`, render nowhere, and orphan nothing. **Proposed
cleanup (needs Chante's go-ahead, ~5-line script):** strip `cf_*` keys from
`member_profiles.values` so stored profile data is exactly the registry's schema.
Harmless to leave; mildly confusing to future debugging if kept.

### Content note

- Form field label "Space Requrements" (member-facing, apply form) — typo for
  "Space Requirements"; fix in the Application Builder (labels rename safely).

---

## Tier A implementation — 2026-07-02 (from docs/admin-ux-handoff.md, `feat/admin-ux-tier-a`)

Chanté asked for the handoff brief's work to begin. Tier A shipped this round
(browser-verified, zero new config):

- **A1 — "Needs attention" digest** atop Overview (`lib/admin-attention.ts` +
  Overview card): up to five prioritized actionable lines (pending applications /
  volunteers / role requests / role suggestions / un-notified upcoming gathering),
  each with a verb deep-link. Empty state: "All quiet — N days to camp."
- **A2 — runway strip** inside the sticky `AdminNav` on all four admin surfaces:
  "✦ 20 days to camp" + next dated milestones (upcoming gatherings, camp start),
  each a jump link.
- **A3 — verb-ified counts (scoped)**: Overview's "N pending review" → "Review N
  pending →"; "In no group" card gained "Assign in Groups →". The A1 digest carries
  most of the verb duty; further sweeps as sections get touched.
- **A5 — cross-reference chips** on `/admin/[id]`: role/department (purple), each
  group, and "N shifts held" (anchors to the Role & Shift section) as linked chips
  under the header.

**Deferred to next round:** A4 (sticky scroll-spy section sidebar), A5's second half
(member names elsewhere linking consistently to `/admin/[id]` — rosters need ids
plumbed), and all of Tier B (queue mode first).

---

## Review — 2026-07-02 (fifth pass: Messages, Participate, Profile)

Scope: the remaining member surfaces — /messages inbox (threads left unopened to
avoid marking reads), /signup (Participate), /profile. Mobile still blocked
(Brave full-screen). **Clean bill overall — no code changes this pass.** Notes:

### 18. Joining several groups stacks shift requirements · Severity: question for Chante · Status: **resolved 2026-07-02** (decision + build, `feat/commitment-tiers`)

**Decision (Chanté):** "Attuned" = the authored minimum only; commitments the
member chose still show as a guide to meeting them. **Built:** checklist items now
carry a tier — required (gates the seal) vs commitment (group/role-derived, shown
under "Your Commitments" with a celebration line: "3h is the expectation — you've
pledged 9h more. Many hands indeed."). Home banner counts them separately ("1
outstanding task · 3 commitments"); Participate group rows disclose their
commitment up front ("✦ carries a 3h Setup shift commitment"). Decision recorded in
docs/shifts-redesign.md. Original finding follows:

Chanté's own attunement checklist shows four unchecked shift items — "Shift
Assigned 0/3h" (global Service) plus Decor/Setup/Teardown 0/3h each from her three
group memberships = **12 owed hours** for one member. The mechanics work exactly as
designed (`groups.required_shift_type_id` + the global task); the question is
policy: is requirement *stacking* intended for multi-group members, or should the
checklist cap/merge (e.g. "3h in any owed type")? Feeds the shifts redesign.

### Smaller notes

- Nav label "Participate" → URL `/signup` — label/URL mismatch; harmless, not worth
  breaking links; consider a rename-with-redirect during the shifts redesign.
- Member Profile Details uses an explicit Save button while admin Configure
  sections autosave — fine: members are one-shot editors, admins live there.
- Messages inbox (filters, sent-state, group avatars), the Participate shift picker
  (capacity "4 of 5 open"), and the profile registry page all read beautifully.
- Prod verified after ship: rounds 1–4 live on camp.glaum.ca (Overview title,
  teaser copy confirmed live).

---

## Review — 2026-07-02 (fourth pass: member-facing flows)

Scope: the member-facing side as an organizer's members see it — home dashboard,
/schedule, /members — cross-checked against admin state. Mobile-width still blocked
(Brave in macOS full-screen; un-fullscreen before next pass). Fixes landed on
`ux/round-4`, verified in the browser.

### 16. Members could RSVP to gatherings that already happened · Severity: medium-high · Status: **fixed 2026-07-02**

The member API (`/api/lead-up-events`) had no date filter, so /schedule showed the
past Jul 1 gathering with a live "I'll be there" button (the home teaser already
filtered correctly — the two disagreed). **Fixed:** past gatherings drop out of the
member API (dateless ones stay), and the RSVP endpoint itself now rejects past
gatherings (400) so nothing can write an RSVP to history. The member-facing
behaviour now matches the admin list's Past treatment.

### 17. Home teaser claimed "Nothing scheduled yet" while a full schedule exists · Severity: medium · Status: **fixed 2026-07-02**

The Upcoming Gatherings widget only shows events within the next 14 days; with camp
3 weeks out it rendered "Nothing scheduled yet." — factually wrong (14 events exist)
and mildly alarming for members. **Fixed:** when dated future events exist beyond
the window, the empty state now reads "The schedule begins Wednesday, July 22."
(derived from the first future event, so it stays correct for any community).

### Notes (no action)

- The Admin link lives in the avatar dropdown (with About), not the main nav —
  deliberate-looking and fine for a single-admin community; revisit if more admins.
- The stale "Shifts Currently Closed" announcement is the most prominent thing on
  members' dashboards right now (content, Chante's call).
- Member-facing pages otherwise read beautifully — the dated schedule calendar,
  Many Hands directory with search/filters, and dashboard widgets all hang together.

---

## Follow-up — 2026-07-02 (morning)

### 15. Deleting/recreating a profile field silently strands form answers · Severity: high (data loss) · Status: guardrail **fixed**; data repair **done 2026-07-02**

Found while chasing the `eventExperience` / `gatheringsAttended` double-up: renaming
a profile field keeps its key (safe), but **delete-and-recreate mints a new key**,
and any apply-form field still bound to the old key keeps writing answers to a key
nothing displays. Worse, the builder's "Saves to" dropdown silently rendered the
dangling binding as "This application only", hiding the problem. Live impact: the
"camped before" form field writes to the deleted `eventExperience`; one member has a
stranded value.

**Fixed (guardrail):** the builder now shows a dangling binding as
"⚠ missing field: <key>" with an amber warning and instructions — picking a real
field (or "This application only") repairs the config in place.

**Data repair (approved & run 2026-07-02):** the camped-before form field now saves
to `gatheringsAttended`; the one stranded `eventExperience` value turned out to
duplicate an existing `gatheringsAttended` value, so the dead key was simply removed
(nothing overwritten). Verified: no `eventExperience` remains anywhere.

**Also noticed:** `member_profiles.values` holds raw `cf_*` keys for ~8 members
(not in the registry, so invisible) — likely from an earlier catch-up migration.
Worth a look someday; not urgent.

---

## Overnight fixes — 2026-07-02 (approved: "do all relevant fixes, best judgment")

All verified live in the browser against the dev server, tsc-clean, dev server
stopped afterwards. Everything below is uncommitted in the working tree.

- **Finding 6 → fixed.** `CollapsibleSection` now remembers each section's
  open/closed state in `localStorage` (keyed by title). Chose persistence over
  flipping the default: nothing changes until you collapse something, and then the
  console keeps your arrangement across visits. Verified: collapsed Registered
  Hands, hard-reloaded, still collapsed (then restored it).
- **Finding 7 → fixed.** Distinctions converted from its lone "Save changes" button
  (which sat below the fold of a long editor) to the same debounced autosave +
  transient "Saved ✓" used by Attunement Tasks / Event Dates / Profile Fields.
  Every inline Configure section now saves the same way. Note: the manual save was
  originally deliberate (commented as such) — if autosaving rule edits feels too
  live, easy to revert.
- **Finding 13 → fixed.** `/admin/[id]` no longer shows profile-backed application
  answers twice: fields wired via `profileFieldKey` render once, in Profile Details
  (the canonical value). If the member has no canonical value yet (e.g. pending
  applicant), the application answer still shows. Follow-on bug caught in
  verification: the skipped answers initially resurfaced under "Additional
  Responses" with raw keys — fixed by marking them handled for the orphan sweep.
- **Past gatherings (from finding 14) → fixed.** A gathering whose date has passed
  now renders dimmed with a "Past" tag and loses its Notify button (no alerting
  members about something that already happened). Verified on the Jul 1 gathering.
- **Mobile-width pass → attempted, blocked.** Chrome ignored window resizes
  (390 and 500px) — the window appears to be in a macOS tiled/full-screen state I
  didn't want to fight overnight. Still the top item for next pass, ideally via
  responsive dev tools or a real device.
- Content notes from finding 14 (Prostelatizing typo, stale "Shifts Closed"
  announcement) are **data, not code** — left for Chante.

---

## Review — 2026-07-02 (second pass, live walkthrough + fixes)

Scope: first *visual* pass — drove the real console in Chrome against a local dev
server (port 3001) with Chante's session: Manage, Overview, Configure, the
Application Builder, and the `/admin/[id]` member detail page. Verified iteration 1's
five fixes render correctly in the browser. Fixes below were applied same-day
(approved mode: "keep resolving, use judgment").

### 9. A failed section load looks identical to "you have nothing" · Severity: high (systemic) · Status: **fixed 2026-07-02**

Every client manager treated a failed initial fetch as an empty list. Observed live:
Manage → Schedule rendered **"No events yet"** while 14 events existed (the fetch
had failed during the dev server's cold compile). An organizer seeing that would
reasonably re-create events — duplicates — or panic. The pattern was in eight
components.

**Fixed:** shared `app/admin/LoadError.tsx` ("Couldn't load this section — … Retry")
now renders on initial-load failure, distinct from the true empty state, in:
ScheduleManager, LeadUpGatheringsManager, AnnouncementsManager, ShiftTypesManager,
RoleRequestsSection, RoleSuggestionsSection, DepartmentsManager, GroupsManager.

### 10. The PWA service worker was poisoning local dev — root cause of the "clicks die" gotcha · Severity: high (dev-only) · Status: **fixed 2026-07-02**

`public/sw.js` cached every same-origin `.js` **cache-first, forever**. Safe in prod
(content-hashed chunk names) but in dev the chunk paths are stable across edits, so
one visit poisoned the browser: stale bundles kept serving old code through `rm -rf
.next`, restarts, everything. Found because an InstallPrompt fix refused to appear.
This is almost certainly the documented "HMR goes stale and the page renders but
clicks die" gotcha.

**Fixed:** `sw.js` no-ops on localhost + cache bumped to `glaum-static-v2` (activation
purges the poisoned v1 cache in every browser that ever visited);
`ServiceWorkerRegister` no longer registers in dev and actively unregisters + clears
caches. Prod behaviour unchanged. `docs/session-prompt.md` gotcha updated.

### 11. PWA install banner floats over the admin console · Severity: medium · Status: **fixed 2026-07-02**

The "Install Glåüm" banner (fixed, bottom-center, z-index 9999) sat on top of the
console's bottom rows on every admin page until dismissed — it covered the
Announcements list and the builder's Test/Reset buttons during the whole walkthrough.
The nudge is for members, not for an organizer mid-session.

**Fixed:** `InstallPrompt` returns null on `/admin*` routes.

### 12. The ●/○ row button doesn't say what it does · Severity: low-medium · Status: **fixed 2026-07-02**

Schedule, Announcements, and Lead-Up rows each carry an unlabeled `●`/`○` toggle
(visibility) next to Edit/✕ — cryptic glyph, and the old tooltip just said
"Hide"/"Show" without saying *to whom*.

**Fixed:** explicit `title` + `aria-label` on all three: "Visible to members — click
to hide" / "Hidden from members — click to show". (A dedicated eye icon like the
builder's would be nicer still — cosmetic, later.)

### 13. `/admin/[id]` shows the same answer twice · Severity: low (advice) · Status: **fixed 2026-07-02** (see Overnight fixes)

Since profile became the source of truth, the detail page shows e.g. Test User's
intro text under **"Introduce yourself to Glåüm"** *and* as **Bio** under Profile
Details, and "Have you camped with Glåüm before?" duplicates **Gatherings Attended**.
Proposal: in the application sections, collapse profile-backed answers to a one-line
pointer ("→ lives in Profile Details"), or show only fields with no `profileFieldKey`.

### 14. Content notes from the walkthrough (yours to judge, no code change)

- Group "Prostelatizing" — typo of *proselytizing*? It also overlaps "Spreading the
  Word" (descriptions: "Spreading the word" / "Letting people hear") — intended?
- Announcement "Shifts Currently Closed for Sign Up - Opening Soon" (Jun 16) is
  still live while shift signup is open.
- The one Lead-Up Gathering (Wed, Jul 1) is in the past and still shows its Notify
  button; consider how past gatherings should read/retire.
- "Reset to defaults" in the builder sits beside "Test this application", but its
  confirm dialog is thorough — leaving as-is, just noting the adjacency.

### Walkthrough impressions (no action needed)

The console genuinely reads well: the three-tab nav + jump links orient fast, the
date-aware schedule list with type pills is excellent, the builder's autosave chip
("All changes saved") is the best feedback pattern in the app — worth copying to
Distinctions eventually (finding 7). Iteration 1's fixes verified live: Overview
title, dynamic Groups cards, "In no group", responsive grid, single notification
surface.

---

## Review — 2026-07-01 (first pass, report-only)

Scope: `/admin` (Manage), `/admin/overview`, `/admin/configure` — page structure,
navigation, data consistency between tabs, feedback patterns across the client managers.
Not yet covered: `/admin/[id]` application detail, the Application Builder full-screen
page, `/admin/configure/application-form`, and a real browser/mobile walkthrough.

### 1. Overview and Manage disagree about who has a shift · Severity: high · Effort: small · Status: **fixed 2026-07-01**

`app/admin/overview/page.tsx` builds its "Signup Complete" stat and the whole
Shift Hours section from `camp_signups` only (the legacy single-signup table).
`app/admin/page.tsx:46-55` unions `camp_signups` **with** `member_shift_signups`
(the many-to-many table members actually sign up through now).

**Failure mode:** a member picks a shift via the current picker → Manage shows them
holding a shift, Overview still counts them "still to complete" and their 3 hours as
"Still Pending". The dashboard the numbers are *for* is the one that's wrong.

**Fixed:** union logic extracted to `lib/shift-signups.ts` (`getShiftEventByUser()`);
both Manage and Overview now read it, so "has a shift" means one thing.

### 2. Overview's "Setup & Teardown" section reads retired data · Severity: medium-high · Effort: small-medium · Status: **fixed 2026-07-01**

The Setup/Teardown/Decor cards derive from live group membership, but the section
also reads `setup_limitations` (retired with `setup_preference` when Groups landed),
and the "Not yet answered" card is actually "belongs to no group" — mislabeled as if
it were still a form question. Group names are hardcoded, so renaming or adding a
group in Admin → Groups silently drops it from the dashboard (logged in
`generalizability-log.md` 2026-07-01).

**Fixed:** section renamed "Groups"; one card per row in the `groups` table
(sort_order-honoring, so renames/additions in Admin → Groups appear automatically);
"Not yet answered" → "In no group"; limitations card dropped along with the retired
`setup_*` columns in the query.

### 3. Overview tab is titled "ManyHands Registry" — same as Manage · Severity: medium · Effort: trivial · Status: **fixed 2026-07-01** (Overview's H1 is now "Overview")

Both `/admin/overview` and `/admin` render the identical H1, so the two tabs are
indistinguishable above the fold and neither matches its nav label. Overview's
subtitle (`X pending · Y approved`) also duplicates what Manage's subtitle says.

**Proposed fix:** title Overview "Overview" (subtitle it already has works), keep
"ManyHands Registry" on Manage only — or vice-versa, but one name per tab.

### 4. Notifications appear twice on Manage, with conflicting behavior · Severity: medium · Effort: small · Status: **fixed 2026-07-01**

Manage renders both the `NotificationBell` (top right, on all three tabs) and the
full `NotificationsSection` panel — same 20 rows. Opening the bell **auto-marks
everything read** (`NotificationBell.tsx:36-42`), which silently defuses the
panel's "N new updates" state; the panel meanwhile has explicit Mark-read/Clear
buttons. Two surfaces, two mental models, one dataset.

**Fixed:** kept the bell (it already had richer per-notification links than the
panel); `NotificationsSection` deleted. The dropdown now shows the full fetched list
(scrolls) instead of a 6-item teaser, gained a "Clear all" button (the one capability
the panel had that the bell lacked), and the now-pointless "See all in registry →"
footer was removed.

### 5. Overview's Setup & Teardown grid breaks on phones · Severity: medium (mobile-only) · Effort: trivial · Status: **fixed 2026-07-01** (folded into #2's rebuild — the Groups grid uses `auto-fit, minmax(160px, 1fr)`)

`overview/page.tsx:257` uses `gridTemplateColumns: 'repeat(3, 1fr)'` — three forced
columns ≈ 100px-wide cards on a 375px phone, with member pills wrapping into
unreadable columns. Every other grid on the page uses
`repeat(auto-fit, minmax(160px, 1fr))`.

**Proposed fix:** use the same `auto-fit` pattern here.

### 6. Manage/Configure load with every section expanded · Severity: low-medium (advice) · Effort: small · Status: **fixed 2026-07-02** (localStorage persistence — see Overnight fixes)

All `CollapsibleSection`s default open, so Manage and Configure are very long
scrolls, and the useful one-line `summary` only renders when a section is closed —
i.e. the orientation text is invisible in the default state. The jump-links help,
but the "stuck in the admin UI" feeling may partly be this wall.

**Proposed fix (pick one):** default sections closed so each page reads as a scannable
table of contents (summaries visible, one click to open); or persist open/closed per
section in `localStorage` so the console remembers how you left it. Judgment call —
flagging rather than recommending hard.

### 7. Save feedback differs between Configure sections · Severity: low (advice) · Effort: n/a for now · Status: **fixed 2026-07-02** (Distinctions → autosave — see Overnight fixes)

Three patterns coexist: debounced autosave with a transient "Saved ✓" (Attunement
Tasks, Event Dates, Profile Fields, Application Builder), an explicit dirty-tracked
"Save changes" button (Distinctions), and modal-with-Save-button (Departments,
Groups, Announcements). Modals are fine as a distinct idiom, but autosave vs.
explicit-save between *sibling inline sections* means you must notice which mode
you're in before walking away from an edit.

**Proposed direction:** converge inline sections on one mode (autosave + "Saved ✓"
matches the majority) when a section is next touched — not worth a dedicated pass.
Delete confirmations are consistent (native `confirm()`) — no action needed.

### 8. `HOURS_PER_MEMBER = 3` will be wrong after the shifts redesign · Severity: note · Status: watch

Overview's Shift Hours section assumes a flat 3 h/member. The agreed shifts model
puts required hours on shift types. No action now — the redesign should rebuild this
section; noting it so it doesn't survive by accident.
