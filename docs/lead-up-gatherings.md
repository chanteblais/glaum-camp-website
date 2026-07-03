# Lead-Up Gatherings — design

**Status:** built 2026-06-30 (tsc-clean + compiled; migration `039` pending apply, undeployed). RSVP shipped as a **binary "I'll be there" toggle** (the `status` column allows a future three-state upgrade with no migration).

**Built:** migration `039_lead_up_gatherings.sql`; admin manager `app/admin/LeadUpGatheringsManager.tsx` (Program tab → "Lead-Up Gatherings") with admin APIs `app/api/admin/lead-up-events/{route,[id]/route}.ts`; member RSVP via `app/api/lead-up-events/route.ts` (list + RSVP state) + `app/api/lead-up-events/[id]/rsvp/route.ts` (toggle); member surface `app/schedule/LeadUpGatherings.tsx` ("Before We Gather" section on `/schedule`) + a home-dashboard teaser (the "events" widget's first list, sourced from `lead_up_events` instead of the old `pre_camp` schedule rows).

**Pre-camp deprecation:** the homepage no longer sources its first gathering list from `schedule_events.event_category='pre_camp'`; it uses `lead_up_events`. The `event_category` column was **left intact** (no data mutation); the "Pre-Camp" option in `ScheduleManager` was later **removed entirely** by the shifts-redesign editor rework (the column is dormant, dropped in that redesign's final cleanup). Any existing `pre_camp` schedule rows should be re-entered as Lead-Up Gatherings; fully retiring the column (drop option + data migration) is a follow-up.
**One-liner:** Real-dated planning/brainstorming sessions on the **runway to the event** — separate from the at-camp `schedule_events` program.

**Leads — built then SCRAPPED (2026-07-02):** gathering leads (offer-to-lead on RSVP, `lead_up_event_rsvps.role` + `lead_up_events.needs_lead`, migrations `048`/`049`) shipped briefly and were removed the same day — migration `050` drops both columns. Decision: **leads are a shifts-only concept**; a gathering's "who's running it" stays the free-text `host` field. If gathering leads ever return, the participation-row `role` idiom (see `member_shift_signups`) is the pattern to reuse.

## The concept: one event, two phases

There is still exactly one event (What If). It has a timeline with two zones, and each zone is a different noun:

| | **The Schedule** (exists) | **Lead-Up Gatherings** (new) |
|---|---|---|
| Answers | "What's happening *during camp* and where do I need to be?" | "What's coming up *before camp* to help plan it?" |
| Time model | Slots inside camp days (`day` label + `time` string, relative to camp) | Real calendar dates (a Tuesday in July) |
| Tied to | roles, shifts, groups, attunement, personal-schedule filtering | **nothing** — stands alone |
| Examples | All-hands, your Setup shift, opening ceremony | Decor brainstorm, planning meeting, prep work party |
| Interaction | you're *assigned* (signup) | you *RSVP* to that one session |
| Table | `schedule_events` | `lead_up_events` (new) |

**Placement rule** (the line that decides where any new dated thing goes):

> Happens **before** the event, on a real calendar date, to help *plan* it → **Lead-Up Gathering**.
> Happens **during** the event, as a slot in the program → **Schedule entry**.

## Key decisions (settled)

- **Separate table**, not an extension of `schedule_events`. The camp schedule carries machinery (group-name `contribution_type` matching, capacity-per-role, attunement hooks, personal-schedule filtering) that must **never** leak onto a planning session. A separate, lighter model is the wall.
- **Per-session RSVP, yes.** Membership already implies attending the *camp*, so RSVP here never means "are you coming to What If." It only ever means **"I'll be at *this* planning session"** — a headcount for the organizer. It does **not** touch attunement, shifts, or signup.
- **Name:** "Lead-Up Gatherings" (nav label + admin tab).
- **Audience:** all members (everyone with an account is attending the event).

## Data model

New table `lead_up_events` — deliberately lighter than `schedule_events`:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `title` | TEXT | |
| `description` | TEXT | |
| `event_date` | DATE | real calendar date (not a camp-relative slot label); **required by the editor** since the calendar rework (NULL only on legacy rows) |
| `start_time` | TEXT | `"HH:MM"` 24-hour since migration `054` (was a display string); **required by the editor**; rendered via `clockLabel` (`lib/shift-hours.ts`) |
| `end_time` | TEXT | optional, same format |
| `location` | TEXT | physical place — optional |
| `link` | TEXT | virtual link (Zoom/Meet) — brainstorms are often remote; optional |
| `host` | TEXT | who's running it — optional |
| `image_url` | TEXT | optional banner image (public `lead-up-images` bucket, migration `041`); shown on the home-dashboard teaser (thumbnail) + announcement email. **Not** rendered on the `/schedule` "Before We Gather" cards — those are image-free (engraved row: date · gold hairline · details · RSVP) as of the 2026-07-03 redesign |
| `visible` | BOOL | admin show/hide |
| `sort_order` | INT | |

Per-session RSVP — model against the existing `event_rsvps` shape (migration 028), but keyed to lead-up events so it stays separate from camp data. Two clean options:
- **Parallel table** `lead_up_event_rsvps (id, lead_up_event_id FK, clerk_user_id, status, created_at)` — mirrors `event_rsvps`, simplest separation.
- (Avoid making `event_rsvps` polymorphic — it currently has a clean FK to `schedule_events`; don't muddy it.)

RSVP status set: `going` / `maybe` / `not_going` (or just a binary `going` toggle if we want it dead simple — TBD at build).

## Where it surfaces

- **Admin:** new manager sibling to `ScheduleManager` (e.g. `LeadUpGatheringsManager.tsx`) — same shape, far fewer fields. New admin tab "Lead-Up Gatherings." *(Added later:)* the manager is topped by a **month calendar** (`LeadUpCalendar.tsx`) — sparse dates across months are exactly what a month grid is for. Click an empty day to add (date prefilled), click a chip to edit; opens on the next upcoming gathering's month; the configured event range (Configure → Event Dates, passed as `rangeStart`/`rangeEnd` props) is tinted with an "Event" marker so the runway visibly leads somewhere. The editor requires **title + date + start time** (`<input type="time">`, end optional).
- **Members — home dashboard:** the existing **"Upcoming Gatherings"** widget is already real-date-driven and already splits pre/at-camp (`app/page.tsx:347`). The new table cleanly **replaces the `pre_camp` half** of that widget. ⚠️ Naming overlap to resolve at build: "Upcoming Gatherings" widget vs "Lead-Up Gatherings" — either rename the widget to host these explicitly, or keep the widget as the combined teaser and use "Lead-Up Gatherings" only as the section header / nav.
- **`/schedule` page:** show the two zones stacked — "Before we gather" (lead-up) → "At camp" (program).
- **RSVP UI:** a simple "I'll be there" control on each lead-up gathering card with a live headcount; organizer/admin sees the list.

## Member alerts (migration `040`, built)

Two admin entry points, both routing to the same fan-out: a **"Notify members on save"** toggle in the **create** modal (shown only when the gathering is "Visible to members"; the create flow notifies right after the POST returns the new id), and a **"Notify members"** button on each row for sending later or re-sending. **Deliberate, not automatic** — the toggle defaults off and isn't shown on edit, so drafts/edits don't spam. `POST /api/admin/lead-up-events/[id]/notify`:
- requires the gathering be **visible**;
- inserts a `user_notifications` bell row (`event_type: 'lead_up_gathering'`, deep-links to `/schedule`) for every approved member with an account, **including the acting admin** (batch insert) — the sender gets the same bell + email as everyone, doubling as delivery confirmation;
- emails those members via `sendLeadUpGatheringEmail` (`lib/send-email.ts`), **gated by each member's `email_announcements` preference** (default ON), best-effort per recipient;
- stamps `lead_up_events.notified_at`, which the manager shows as "Notified <date>" and turns the button into a re-send (`↻`). The button reports `Notified N · emailed M` after sending.

Recipients + emails come from the canonical `members` table (status `approved`) — no per-user Clerk calls.

## Migration story

- New migration: `create table lead_up_events` (+ `lead_up_event_rsvps`).
- Retire `schedule_events.event_category = 'pre_camp'`: that column was the right instinct in the wrong layer. A small data migration moves any existing `pre_camp` rows into `lead_up_events`; `event_category` can then be dropped or left dormant. Confirm there are no live `pre_camp` rows worth preserving before dropping.

## Generalizability note

This hardcodes the **"single upcoming event + its runway"** assumption (fine for What If, single-tenant). In the multi-tenant future this generalizes to *Event* as a first-class object: a community runs many events over time, each with its own lead-up phase and its own schedule. Today's `lead_up_events` is the seed of "events have a planning phase." Logged in `generalizability-log.md`; not built now.

## Open at build time

1. RSVP granularity — three-state (`going`/`maybe`/`not_going`) vs binary toggle.
2. Widget-vs-section naming overlap ("Upcoming Gatherings" widget).
3. Whether lead-up gatherings appear on the member **personal schedule / calendar** at all, or only on the dashboard/`/schedule` listing. (Default: dashboard + `/schedule` only; keep them off the shift-driven personal calendar.)
