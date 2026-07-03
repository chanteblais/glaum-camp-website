# Profile as Source of Truth — architecture & migration plan

> Status: **in progress.** Phase 0 (the Profile Field Registry + admin manager) is **built**.
> Everything after Phase 0 is planned, not yet implemented. This doc is the reference for the
> whole effort — update the phase checklist as work lands.

## Core philosophy

The **member profile is the canonical source of truth.**

- Applications do not own data. They are an *onboarding interface* — one way to populate
  configurable profile fields.
- Distinctions evaluate **profile data**, not application responses. The engine doesn't know
  or care where a value originally came from.

```
Member Profile Fields (registry: schema)
        ↓
Application Form (optional) — references registry fields
        ↓
User submits answers
        ↓
Values saved to the profile (member_profiles)
        ↓
Distinction engine evaluates profile data ∪ system facts
```

## Where we started (the problem)

`applications` is **overloaded**: it is simultaneously the submission/review artifact *and*
the canonical identity + profile record. Every read path (`lib/profile-auth.ts`,
`app/profile/page.tsx`, the members directory, messages, schedule, admin) resolves a person by
querying `applications` on `clerk_user_id` (with a fragile `email` fallback). Admin-added form
fields land in an untyped `custom_answers` JSONB bag that distinctions can't see. The whole
effort is about **splitting those two roles apart**.

The distinction engine already follows "store facts, derive medals" (`lib/distinctions.ts` +
`lib/member-facts.ts`) — but its fact set is hardcoded. This effort generalizes that fact
catalog into an admin-defined field registry.

## Target data model

### 1. `members` — canonical identity record (one row per person)

- `id` UUID PK · `clerk_user_id` UNIQUE (nullable until first sign-in) · `email`
- Locked core columns kept as **real columns** (queried for display everywhere; need NOT NULL
  guarantees): `first_name`, `last_name`, `preferred_name`, `pronouns`, `phone`, `avatar_url`
- `status` (`pending` / `approved` / `rejected` / `cancelled`) — the membership gate that
  `applications.status` carries today, now owned by the member
- timestamps

### 2. `member_profiles` — configurable values (1:1 with `members`)

- `member_id` FK · `values JSONB` keyed by registry field key
- JSONB bag chosen over fully-normalized EAV: matches existing `page_content` / `custom_answers`
  conventions, handles multi-select / typed values without join gymnastics, far less code.
  (Answers are joined in JS today, not queried in SQL, so EAV buys little.)

### 3. Profile Field Registry — `page_content.config_profile_fields` (JSON)

Lives exactly like `config_distinctions` / `config_attunement_tasks`. Each entry:
`key`, `label`, `type`, `options`, `default`, `public`, `memberEditable`, `applicationEligible`,
`distinctionEligible`, and a `system: true` flag for read-only derived fields. Defined in
`lib/profile-fields.ts`. Default stored fields include `bio` (rendered as the **About** card on
`/profile`) and `quote` (rendered under the member's name).

- The **`public`** flag is surfaced in `ProfileFieldsManager` as the **"Visible"** toggle: on =
  shown on the member-facing profile; **off = admin-only**, surfaced only in the member's
  application detail (`/admin/[id]` → Profile Details). It is never public-facing when off.
- The **`key`** is the stable identity that `member_profiles.values` are stored under. It is
  **fully internal — never shown or editable in `ProfileFieldsManager`**: brand-new (this-session)
  fields auto-derive a unique key from the label as it's typed; any field that already existed keeps
  its key forever, so renaming a label can never disconnect saved answers. (Re-keying is only
  possible by editing the JSON directly; old values would remain under the old key — recoverable.)

### The critical abstraction: one merged namespace

Distinctions, the profile display, and the form renderer all read from
**`member_profiles.values` ∪ system fields**. System fields (Contributions/groups, tenure,
designation, has-photo) are the *current* `MemberFacts` — kept derived, never copied into
editable values, so they can't drift. Registry entries marked `system: true` describe them so
the rule builder and profile UI treat both kinds uniformly.

## Phases

Each phase ships independently. Reads cut over **late** to de-risk; backfill + dual-write keep
everything reversible until the new store is proven.

- [x] **Phase 0 — Registry + manager (zero behavior change).** `lib/profile-fields.ts` (types,
  `parseProfileFields`, `DEFAULT_PROFILE_FIELDS` = stored example fields + system fields, plus
  `storedFields` / `distinctionFields` / `applicationFields` / `distinctionValueType` helpers for
  later phases). `app/admin/ProfileFieldsManager.tsx` wired into `Admin` as a `Profile Fields`
  section, autosaving to `page_content.config_profile_fields`. System fields shown read-only.
  Nothing else reads the registry yet.
- [~] **Phase 1 — `members` + `member_profiles` + backfill + dual-write.** *(code complete;
  migration `037` pending apply to Supabase.)* `supabase-migrations/037_members_and_profiles.sql`
  creates both tables + backfills one member per distinct person (by clerk_user_id, else email,
  latest application) and seeds `member_profiles.values` from `custom_answers`. **Refinement:**
  typed built-in columns (`about_you`, `special_skills`, …) stay in `applications` and migrate
  field-by-field in Phase 3 once their registry fields exist with matching keys — Phase 1's
  backfill is purely structural. `lib/members.ts`: `resolveMember`, `getMemberProfileValues`,
  `setProfileValues`, `upsertMember`, `setMemberStatus` (all guarded — log-and-continue, safe to
  deploy before the migration). Dual-writes wired into `/api/apply` (create + seed),
  `/api/admin/[id]/approve` (status), `/api/profile/application` (identity edits). Reads stay on
  `applications`. **Dual-write coverage now complete:** `/api/apply` (create + *revive* a cancelled
  row), `/api/admin/[id]/approve` + `/api/admin/[id]/reject` + `/api/profile/cancel` (status),
  `/api/profile/application` (identity edits), `/api/profile/avatar` (avatar_url). So `members`
  identity + status stay in sync — the prerequisite for the Phase 5 read cutover.
- [x] **Phase 2 — Distinction engine reads the merged namespace.** `evaluateDistinctions` now
  takes a generic `FactContext` (`lib/distinctions.ts`); `profile/page.tsx` + `members/[id]`
  build it as `{ ...profileValues, ...systemFacts }` (system facts win on key overlap — guarded,
  falls back to system-facts-only when no member row exists). The rule builder is registry-driven:
  `distinctionCatalog(profileFields)` (`lib/profile-fields.ts`) feeds `DistinctionsManager` via a
  new `factCatalog` prop, replacing the hardcoded `MEMBER_FACT_CATALOG`. *(Note: `member_profiles`
  values only flow once migration `037` is applied + the app is redeployed; until then the merge is
  a no-op and behavior is unchanged.)*
- [x] **Phase 3 — Applications reference registry fields.** `FieldConfig.profileFieldKey`
  (`lib/form-config.ts`) binds a custom application question to a registry field. `ApplyWizard`
  builds a registry-keyed `profile_values` map on submit; `/api/apply` writes it to
  `member_profiles` (instead of seeding from raw `custom_answers`, which stay on the application
  row for the "Additional Responses" view). `ApplicationBuilder` gains a **"Saves to"** dropdown on
  custom fields (registry application-eligible fields), threaded `ApplicationBuilder → StepSection
  → FieldRow` like the existing `groups` prop. **Deferred refinements:** the bound form field's
  type/options don't yet auto-sync from the registry field (admin sets them manually — a text field
  bound to a `multi_select` registry field will store a string, which `includes` rules won't match);
  no "create profile field from this question" shortcut yet. Built-in (non-custom) fields can't be
  bound yet — only custom questions.
- [~] **Phase 4 — Profile display + member self-edit on the new store.** *(self-edit + display
  done; identity-read cutover folded into Phase 5.)* New `app/api/profile/fields/route.ts` —
  `GET` returns the member's public/editable stored fields + values; `PATCH` writes editable values
  to `member_profiles` (coerced + validated against the registry). New `app/profile/ProfileDetails.tsx`
  (client) renders an editable "Profile Details" card on `/profile` (one control per field type:
  text/textarea/number/date/boolean/single/multi-select), with manual Save + unsaved/saved state;
  renders nothing when the registry has no member-visible fields. In addition, `/profile` renders
  the `bio` value as a styled **About** card and the `quote` value under the member's name (read
  presentations of the same stored fields). `members/[id]` shows a read-only **Profile** section for
  `public` (Visible) stored fields with values; **`/admin/[id]` shows a Profile Details section with
  _all_ stored values including non-Visible (admin-only) fields.** **Deferred to Phase 5:** reading core
  *identity* (name/photo) from `members` instead of `applications` — left until the systematic
  cutover so it's done once, everywhere.
- [x] **Phase 5 — Decommission application-as-profile.** *(Substantively done — all cross-member
  identity/status reads are canonical; remaining `applications` reads are legitimately the
  submission/review artifact.)* Migrate read paths' identity lookups off `applications` → `members`.
  - **Done (14 sites, build-verified):** message sender/recipient/picker name + avatar resolution
    (`api/messages/route.ts`, `api/messages/g/[groupId]/route.ts`, `messages/page.tsx`,
    `messages/[userId]/page.tsx`, `messages/g/[groupId]/page.tsx`), shoutout avatars + author check
    (`api/shoutouts`), role-suggestion gate (`api/role-suggestions`), role-request applicant names
    (`api/admin/role-requests`). All faithful swaps — `members` has the same identity columns +
    `status`, fully synced via backfill + dual-writes. Display-only, so worst case is a stale name,
    never a gating/security issue.
  - **Batch 2 done (12 sites, build-verified):** status-gating reads → `members.status` in
    `schedule`, `members` + `members/[id]` viewer-gates, `apply`, `signup`, `about`, `volunteer`,
    `api/schedule/[id]/rsvp`, `api/groups/joinable`, `api/groups/[id]/join`, `api/nav-auth`,
    `api/signup`. (`signup`/`volunteer` ordered by `submitted_at`, which `members` lacks → switched
    to `created_at`; one row per person anyway.) Plus: `profile/page.tsx` now mirrors clerk-linking
    onto the member record so future identity reads resolve by `clerk_user_id`.
  - **Intentionally left on `applications` (not a gap):** `profile/page.tsx` + `lib/profile-auth.ts`
    read the owner's own **submission record** (logistics like arrival/departure + identity) by
    `clerk_user_id`-or-`email`. Restructuring these to split identity onto `members` would **not**
    kill the email-fallback — `members.clerk_user_id` can be NULL for un-linked members, so the
    fallback is intrinsic, not fragile — and carries real risk on the core profile page for ~no gain.
    Likewise `app/page.tsx`, the `members` directory cards, `members/[id]` detail, and all admin /
    `api/admin` / `api/apply` / `api/profile` routes legitimately read `applications` (submission +
    review workflow + app-specific columns). **Net:** every *cross-member* identity/status read is
    now canonical (`members`); `applications` is read only as the submission/review artifact it is.
  - **Future (optional):** unify the `members` directory ↔ `members/[id]` link on `clerk_user_id`
    (currently coupled via application `id`); a later migration could drop now-unused legacy answer
    columns from `applications`.
- [x] **Phase 4.5 — Profile catch-up (built; build-verified).** Solves "I should've asked this on the
  application, but people have already applied." *added-after* === *missing* — no value for the field
  — so no need to track when a field was added.
  - **Registry flags** (`lib/profile-fields.ts`): `askExisting` ("Catch-up" toggle) marks a field to
    prompt members who lack a value; `required` makes that prompt non-dismissible. Both opt-in (off
    by default) and editable in `Admin → Profile Fields`. Helper `profileGaps(fields, values)` derives
    a member's gaps (enabled · memberEditable · askExisting · empty · not-dismissed-unless-required).
  - **Surfacing:** the `/profile` **Profile Details** card (Phase 4) is the catch-up surface — a
    purple callout summarizes the gaps and each gap field is flagged (**Please complete** / **Required**)
    with the input inline. Members fill it right there; the gap clears live as they type.
  - **Dismissal:** optional gaps offer **"Not now"**, persisted in `member_profiles.values` under the
    reserved `__dismissedFields` key (ignored by registry reads); required gaps can't be dismissed.
    Handled by `PATCH /api/profile/fields` (`__dismiss`).
  - **Answering** reuses the Phase 4 self-edit path (`/api/profile/fields`).
  - **Payoff:** since distinctions read profile values, backfilling retroactively *grants* honours.
  - **To activate:** an admin toggles **Catch-up** (and optionally **Required**) on a field in
    `Admin → Profile Fields`. Until then no one is prompted.
  - **Future (optional):** a home-dashboard teaser / attunement-task integration (`lib/attunement.ts`)
    so the prompt also shows off-profile; email nudge for required gaps.

## Distinctions enhancements (post-Phase-5)

- **OR conditions (done; no migration).** `DistinctionRule.match: 'all' | 'any'` (`lib/distinctions.ts`)
  — `all` = AND (default), `any` = OR. The rule builder shows an **ALL / ANY** selector once a rule
  has 2+ conditions. A rule with **no** conditions is now "manual only" (see below) rather than dead.
- **Manual attribution (code done; migration `038` pending apply).** Admins grant honours by hand —
  honorary/one-off awards, or overrides — unioned with the rule-derived ones.
  - `supabase-migrations/038_member_distinctions.sql` — `member_distinctions(member_id, distinction_id,
    note, granted_by, granted_at)`, unique per (member, distinction).
  - `lib/distinction-awards.ts` — guarded `getMemberAwards` / `grantDistinction` / `revokeDistinction`.
  - `evaluateDistinctions(facts, rules, awardedIds?)` — earned if conditions pass **OR** the id is in
    `awardedIds`; `EarnedDistinction.manual` flags honour-only ones. Still never persisted — awards +
    facts are the inputs, the medal list is derived every render.
  - Admin UI: `app/admin/[id]/DistinctionAwards.tsx` (Grant/Revoke per distinction) in a new
    **Distinctions** section on the member detail page; `POST/DELETE /api/admin/members/[memberId]/distinctions`.
  - Reads union awards in `profile/page.tsx` + `members/[id]`. Guarded — degrades to rule-derived-only
    until `038` is applied.
  - **Future (optional):** an "exclude" tier (revoke a condition-met distinction); show `manual` medals
    distinctly in the Cabinet.

## Open questions

- **Volunteers** run a parallel `volunteers`-as-profile pattern. Fold into `members` later, or
  leave out of scope? Current plan: members-only now; design `members` so volunteers can join later.
- **Approve flow:** confirm `members.status` becomes the gate the whole app reads, with
  `applications.status` demoted to "this submission's review state."
- **`custom_answers` migration:** backfill the cleanly-mappable answers into registry-keyed values,
  leave the rest historical.
</content>
</invoke>
