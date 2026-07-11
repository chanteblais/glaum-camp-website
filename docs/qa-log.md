# QA Log

Running record of QA sweeps: what was tested, what was fixed, and — most
useful for the next tester — what is *known and deliberate* so it doesn't get
re-reported, plus where the remaining risk lives. Newest sweep first.

## Fix 2026-07-10 — admin week view counted signups across all nights (branch `fix/weekview-per-night-counts`)

Prompted by a real report (2026-07-10): the participate picker showed the
Jul 25 Glåüm Salon night shift as "5 of 5 open · needs a lead" while the admin
week grid showed "1/5 signed up" for the same night — the one hold was actually
a lead on Jul 23.

### Fixed

- **Week-grid shift blocks now count per night** — `ScheduleWeekView`'s block
  read `rosters[event.id]` (the whole event's holders, all nights merged), so
  every night of a recurring shift showed the event-total count. The block now
  filters the roster to its column's date (`occurrence_date === day.iso` for
  recurring, `occurrence_date == null` for dated one-offs), matching how holds
  are keyed everywhere else (`lib/participate-data.ts`). The "✦ no lead" flag
  reads the same filtered roster, so a lead on one night no longer masks a
  lead-less other night.

### Known and deliberate

- The list view was already correct — `ShiftRoster` breaks out one line per
  night with its own count/lead state.

## Fix 2026-07-10 — volunteer approve/decline silent failures (branch `fix/volunteer-action-errors`)

Prompted by a real prod incident (2026-07-10): an admin approved a volunteer,
the page refreshed, and the row silently stayed pending — the approve API call
had failed and nothing said so.

### Fixed

- **Volunteer approve/decline/remove now surface failures** — all three
  handlers in `VolunteersSection` (pending-row Approve + Decline, Helping
  Hands Remove) check the response (`.catch(() => null)` + `!res?.ok`, so
  network errors count too), show the API's `error` (or a fallback) as an
  inline red line above the action buttons — the `MemberSignupCard` pattern —
  and reset the busy flag so the button is usable again. `router.refresh()`
  only fires on success.
- **Volunteer approve route no longer 500s on a committed approval** — the
  Clerk `getUser` in the notify block is now try/caught (mirroring the member
  approve route), so a deleted/unknown Clerk account degrades to a skipped
  email instead of reporting failure for an approval that already landed.

### Known and deliberate

- The same discarded-`await fetch` shape still exists in ScheduleManager,
  AnnouncementsManager, and LeadUpGatheringsManager (delete/update handlers) —
  spun off as its own task rather than folded into this fix.

## Sweep 2026-07-08 — apply-wizard QA fixes (branch `fix/apply-wizard-qa`)

Three items pulled off the 2026-07-03 "still open" list.

### Fixed in this sweep

- **Reject/remove now surface email-send failures** — both routes return an
  `emailWarning` in their JSON response, mirroring approve's pattern exactly
  (degrade instead of 500 on a deleted/unknown Clerk account or a failed
  send); `AdminActions` (Reject) and `RemoveMemberButton` (Remove) show it via
  the same notice-mode confirm dialog approve already uses.
- **Required "Other" answers now need the fill-in text** — a required
  single-choice or multi-choice field with "Other" selected no longer counts
  as answered until its free-text fill-in is non-empty. Covers the built-in
  `onboarding_status` field (its dedicated `onboarding_status_other` slot) and
  any admin-added custom radio/checkbox field with an "Other" option (its
  `key + '__other'` slot in `custom_answers`).
- **Apply-wizard radio/checkbox rows are keyboard-accessible** — the custom
  `RadioGroup`/`CheckboxGroup` rows now carry `role="radio"`/`"checkbox"`,
  `aria-checked`, `tabIndex={0}`, and toggle on Enter/Space, with a gold
  (`#C8A848`) focus outline (not a border/box-shadow, so it doesn't add
  layout weight on the mobile-stacked columns).

## Sweep 2026-07-03 (2) — application ↔ profiles ↔ groups pipeline (branch `fix/application-profile-qa`)

Focused trace of where every piece of application data lives and how it flows
to profiles and groups: submit path (columns / `custom_answers` /
`profile_values` / `group_choices`), approval mirroring, admin detail render,
member self-edit, group opt-in/self-join — code-traced end-to-end plus
read-only live-DB consistency checks (link integrity, status sync, orphaned
keys, dangling bindings).

### Verified sound (no change needed)

- All applications ↔ `members` rows linked with statuses in sync; no duplicate
  emails/clerk ids; every `group_members` row points at a real group + member;
  no orphaned `custom_answers`; no dangling `profileFieldKey` bindings; the
  form's `group_select` field offers only real groups.
- Admin application page renders from the live form config, prefers canonical
  profile values over the stale application snapshot, and sweeps deleted-field
  answers into "Additional Responses" — no submitted answer is dropped.
- Group self-join (`/participate`) and apply-time group opt-in are separate,
  correctly gated surfaces; `/api/apply` re-validates group choices server-side.

### Fixed in this sweep

- **Removal/rejection revoke group membership** — remove + reject now delete
  the person's `group_members` rows (they previously outlived the membership;
  `group_members` is what grants group-thread access and roster presence).
- **Group-thread API gates on approved status** — GET/POST
  `/api/messages/g/[groupId]` check `members.status === 'approved'` alongside
  `isGroupMember`, so a lingering membership row can never grant thread access.
  (The prefs/read-cursor sub-routes stay membership-only — self-scoped, benign.)
- **Apply-path profile writes are registry-validated** — `/api/apply` now runs
  `profile_values` through the same coercion as the member self-edit PATCH
  (shared `coerceProfileValue` in `lib/profile-fields.ts`): application-eligible
  stored fields only, select values filtered to the field's options.
  Previously raw values were written (e.g. the form option "This will be my
  first year", absent from `gatheringsAttended`'s registry options, was stored
  and then silently dropped on the member's next self-edit save).
- **"Other: …" text no longer hidden for profile-bound fields** — when a bound
  radio/checkbox answer includes an "Other" specification, the admin page keeps
  rendering the application answer (the specify-text exists only on the
  snapshot; suppressing it in favour of the canonical value hid it everywhere).
- **Duplicate `quote` removed from `DEFAULT_PROFILE_FIELDS`** — it appeared in
  both the locked core fields and the example fields; with no saved
  `config_profile_fields` (fresh tenant/dev DB) Profile Details rendered Quote
  twice.
- **Data backfill (prod)** — 4 approved members (applied June 27–30, before
  migration 037/038 created `member_profiles` on July 1) had their bound
  "camped before" answers seeded silently into the void: profile rows created,
  `gatheringsAttended` backfilled from `custom_answers` (registry-coerced), and
  the 4 dead `cf_*` keys left by a pre-Phase-3 seeding path stripped from the
  8 older profiles (that data is fully duplicated on the application rows).

### Known & deliberate — don't re-report

- The 8 members who applied before the "Have you camped with Glåüm before?"
  question existed have no `gatheringsAttended` → "Member since" falls back to
  their application year. Collection gap, not a bug; toggling **ask existing**
  on that Profile Field prompts them via the profile catch-up banner.
- Bound form fields don't auto-sync type/options from their registry field
  (documented Phase-3 deferral in profile-architecture.md); the apply-path
  coercion now contains the damage of a mismatch.

## Sweep 2026-07-03 — pre–What If full pass (branch `session/2026-07-03-qa-sweep`)

Two passes over every member and admin flow (application → approval → profile →
groups → schedule → resources → messaging → permission boundaries → mobile),
code-traced end-to-end with live-DB consistency checks, `tsc` + full
`npm run build` verification. What If is 2026-07-23.

### Fixed in this sweep

- **Apply wizard validation** — every visible+required field now blocks
  CONTINUE on every section (previously 4 hardcoded fields on 4 sections;
  custom required fields inside built-in sections were never checked), and the
  final section's SUBMIT is gated. Stale localStorage drafts with an
  out-of-range saved step are clamped instead of crashing.
- **Approval integrity** — approve/reject/remove 404 on unknown application
  IDs; a deleted/unknown Clerk account degrades to an email warning instead of
  a 500 *after* the status change; the admin UI surfaces failures. Approve
  mirrors via `upsertMember` (insert-or-update): approving an application with
  no `members` row used to no-op silently and lock the member out of every
  member-only surface (migration `060` backfilled 4 already-stranded campers —
  applied + verified 2026-07-03).
- **Removal/cancel release their slots** — admin remove and member self-cancel
  now downgrade `members.status` AND release `camp_signups` +
  `member_shift_signups` (removed/cancelled people used to keep member access
  and/or keep occupying shift capacity).
- **Permission gates** — approved-member checks added to
  `/api/groups/membership`, `/api/resources/claims`, `/api/resources/offers`,
  `/api/polls/[id]/vote`, and the sender side of `/api/messages` (recipient was
  already checked). Poll option indexes are validated (an out-of-range index
  used to inflate the counts array for every client).
- **Nav ↔ page agreement** — the server Header now resolves membership with
  `resolveMemberForUser` (email fallback on clerk-id miss), same as page gates,
  so the nav can't show the public links to someone a members-only page admits.
- **Empty states** — /roles and the schedule calendar.
- **Mobile** — apply track-picker cards stack; public-profile hero centering;
  admin application-detail answer grid stacks.

### Known & deliberate — don't re-report

- **Cancelled members see the "Choose your path" (re-apply) cards, not a
  "cancelled" notice** — cancelled applications are treated as no-application
  so re-applying revives the row in place. The cancelled-state panel in
  `app/profile/page.tsx` is unreachable. Product decision, not a bug.
- **Signup capacity has a small check-then-insert race** — two simultaneous
  claims on the last slot can both pass. Accepted at camp scale.
- **Group membership survives removal/cancel** — rosters and group threads
  keep the person (only role + shifts are released). Deliberate: groups are
  not capacity-bound and removal is reversible.
- **Volunteers cannot use member surfaces** (/participate, resources, groups,
  messaging) — the gates are approved-member only, by design (2026-07-02
  decision: no volunteer self-serve).
- **Localhost testing gotcha** — `.env.local` uses the **dev** Clerk instance,
  but the prod DB's Clerk IDs were remapped to the **prod** instance (059,
  2026-07-03). Anything keyed strictly to the session's clerk ID with no email
  fallback (held role/shifts on /participate, camp_signups writes) will look
  empty/act oddly on localhost. Test session-dependent flows on prod.
  Relatedly: local dev shares the **production database** — mutations from
  localhost are real.

### Still open (candidates for the next sweep)

- The disabled CONTINUE/SUBMIT buttons don't say *which* required field is
  missing — fine at current form size, worth a pointer if forms grow.

(Reject/remove `emailWarning`, apply-wizard keyboard accessibility, and the
required-"Other" validation gap — all fixed in the 2026-07-08 sweep above.)

### Highest-value manual tests before What If

1. A real application submission on prod against the live custom sections
   (required custom checkbox in Basic Info, required Registry textarea).
2. Approve → welcome email arrives (post-Clerk-cutover email path).
3. Sign in as one of the four backfilled campers → /participate → claim role,
   shift, group, resource.
4. Self-cancel from the profile gear → confirm the person's shifts free up in
   the admin rosters.
5. Full phone pass of /apply, /participate, /schedule as a member.
