# Shared Resources

Communities coordinate physical objects members bring to an event — stoves,
coolers, tools, shade structures, decor. Today that happens in spreadsheets and
"who's bringing a camping stove?" threads. Shared Resources makes it a
first-class concept: admins author **needs**, members meet them with one-click
**claims**, and the totals take care of themselves.

Built 2026-07-02 · migrations `051_shared_resources.sql` + `052_resource_list_stewards.sql` + `053_resource_offers.sql`.

## The model

Three tables (see `docs/database.md`):

- **`resource_lists`** — a named collection of needs ("Shared Kitchen",
  "Setup Equipment"). Community-scoped, with an optional **steward** — a group,
  department, or role ("Shared Kitchen, stewarded by the Department of
  Nourishment"). Three nullable FKs with an at-most-one CHECK (exclusive arc,
  migration `052`); display context only — not a permission gate. Plus a
  `visible` toggle so a half-authored list stays hidden.
- **`resources`** — one item per row: name, optional note, `quantity_needed`.
  A **NULL target = open callout** (migration `053`): either a member **offer**
  (`offered_by` set — gear nobody asked for) or an admin-authored open ask.
  Admins turn a useful offer into a tracked need by setting a target (claims
  stay attached), or delete noise. No approval queue — an offer is a listing.
- **`resource_claims`** — one row per member per resource (`UNIQUE`), carrying
  a `quantity`. Bringing three coolers = one row with quantity 3.

**Totals are always derived from claim rows, never stored** — the same rule as
distinctions. **A claim is the confirmation**: there is no pledge→confirm
workflow. Over-fulfillment is allowed and shown (5 of 4 is information the
organizer wants, not an error).

## Surfaces

- **Admin → Manage → Program → Shared Resources** (`ResourcesManager.tsx`):
  create/edit/hide/delete lists (steward picked from one dropdown with
  Groups / Departments / Roles optgroups), add/edit/delete items (incl. an
  optional **icon** via the shared `AssetImagePicker` — migration `054`,
  `resources.icon`, departments idiom), and see per-item progress *with
  claimant names* — the organizer always knows who to chase.
- **Member: `/participate` → "Bring Something"** (`ResourceCommitments.tsx`,
  anchored `#bring`, **above** Your Groups — needs are live and time-sensitive,
  group membership is set-once): visible lists with per-item progress and an
  **"I'll bring one"** button; a claimed row grows −/+ steppers and a remove
  control. Unclaiming is always allowed — plans change, and the count simply
  reflects reality. The last card **inside** each list's stack is the
  dashed *"Have something that fits? ＋ Offer it"* trigger → an inline form
  that lists unrequested gear (offer = item with no target + the offerer's
  ×1 claim; retracting the claim removes the listing unless others piled on).
- **Home dashboard: the Bring Something widget** — a configurable dashboard
  widget (id `resources`, reorder/hide/resize via the page editor like any
  other): one compact card — "N items still needed" + the first three item
  names — where the **whole card** is the link to `/participate#bring`.
  Because the section's content loads client-side (native hash scroll fires
  before it has height), `ResourceCommitments` re-scrolls to `#bring` once
  its data renders. Demand-driven via `getUnmetResourceNeeds`
  (`lib/resources.ts`, offers excluded): it renders nothing once everything
  is covered.
- **Profile → Active Commitments**: each claim renders as a `BRINGING` row
  ("Camping Stove ×2 · Shared Kitchen", with the item's icon when set) via
  `lib/resources.ts` → `getMemberResourceClaims`, and counts toward the
  Active Commitments stat. Hands act, witnessed.

## API

- `GET/POST /api/admin/resources` — all lists + items + claims (with names via
  `memberDisplayNames`) / create list
- `PATCH/DELETE /api/admin/resources/[id]` — update / delete a list
- `POST /api/admin/resources/items`, `PATCH/DELETE /api/admin/resources/items/[id]` — items
- `GET /api/resources` — member view: visible lists + items + totals + own claim
  + offer attribution
- `POST /api/resources/claims` — `{ resource_id, quantity }`; quantity 0 removes
  the claim, otherwise upserts. Quantity clamped to 1–99. Removing the last
  claim on your own offer deletes the offer row (retraction).
- `POST /api/resources/offers` — `{ list_id, name, note }`; creates the
  open-callout item + the offerer's ×1 claim.

## Non-goals (deliberate, revisit post–What If)

- **No polymorphic ownership.** A list's *steward* can be a group, department,
  or role (migration `052`), but stewardship is a display label — no owner
  carries permissions, edit rights, or member-visibility rules. The hierarchy
  in early sketches ("Department of Nourishment → Shared Kitchen") stays
  presentational. If real per-owner behaviour ever proves necessary, the
  exclusive-arc FKs migrate cleanly.
- **No event scoping.** Lists implicitly belong to *the* event — a
  single-community assumption, logged in `docs/generalizability-log.md`.
  Multi-event/multi-tenant scoping is a foundation-phase concern.
- **No standalone offer workflow.** Offers exist (migration `053`) but as
  plain items-without-targets inside existing lists — no approval queue, no
  offer inbox, no separate offer entity. An offer that fits no list is the
  organizer's cue to create a catch-all list ("Odds & Ends"), which needs
  zero code.
- **No pledge→confirm ceremony**, no reminders/nudges, no per-item reordering
  UI (creation order is the display order).
