# QA Log

Running record of QA sweeps: what was tested, what was fixed, and — most
useful for the next tester — what is *known and deliberate* so it doesn't get
re-reported, plus where the remaining risk lives. Newest sweep first.

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

- Reject/remove email-send failures aren't surfaced to the admin (approve's
  are, via `emailWarning`).
- Apply-wizard radio/checkbox rows aren't keyboard-accessible (custom divs,
  no focus handling).
- Required radio fields with an "Other" option accept "Other" selected with an
  empty fill-in.
- The disabled CONTINUE/SUBMIT buttons don't say *which* required field is
  missing — fine at current form size, worth a pointer if forms grow.

### Highest-value manual tests before What If

1. A real application submission on prod against the live custom sections
   (required custom checkbox in Basic Info, required Registry textarea).
2. Approve → welcome email arrives (post-Clerk-cutover email path).
3. Sign in as one of the four backfilled campers → /participate → claim role,
   shift, group, resource.
4. Self-cancel from the profile gear → confirm the person's shifts free up in
   the admin rosters.
5. Full phone pass of /apply, /participate, /schedule as a member.
