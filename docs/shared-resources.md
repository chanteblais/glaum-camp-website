# Shared Resources

Communities coordinate physical objects members bring to an event — stoves,
coolers, tools, shade structures, decor. Today that happens in spreadsheets and
"who's bringing a camping stove?" threads. Shared Resources makes it a
first-class concept: admins author **needs**, members meet them with one-click
**claims**, and the totals take care of themselves.

Built 2026-07-02 · migrations `051_shared_resources.sql` + `052_resource_list_stewards.sql` + `053_resource_offers.sql` + `055_resource_item_icons.sql`.

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

- **Admin → Program → Shared Resources** (`/admin/program`) (`ResourcesManager.tsx`):
  create/edit/hide/delete lists (steward picked from one dropdown with
  Groups / Departments / Roles optgroups), add/edit/delete items (incl. an
  optional **icon** via the shared `AssetImagePicker` — migration `055`,
  `resources.icon`, departments idiom), and see per-item progress *with
  claimant names* — the organizer always knows who to chase.
- **Member: `/participate` → "Bring Something"** (`ResourceCommitments.tsx`,
  anchored `#bring`, **above** Your Groups — needs are live and time-sensitive,
  group membership is set-once): a **preparation board**, not an inventory —
  it answers *"what can I do that would be most helpful?"* first (redesigned
  2026-07-02 on Chante's direction):
  - **I'M BRINGING** — a pinned card of my commitments ("✓ Camping Stove ×2 —
    Shared Kitchen") with per-row *Edit ›* that expands + scrolls to the item.
  - **Per-list readiness** — "84% Ready" + progress bar + "27 of 32 covered"
    (unit-weighted: Σ min(claimed, needed) / Σ needed; suggestions excluded).
    A fully covered list celebrates: *"✨ Shared Kitchen is fully equipped!
    Thanks to everyone contributing."*
  - **Status groups** — items grouped **Still Needed** (shortage leads:
    **"Still need: 3"** bold, count secondary; "I'll bring one" right on the
    row) → **Covered** (dimmer; "Bring an extra" inside the detail) →
    **Suggested by Members**.
  - **Expandable rows** — compact by default; expanding shows the note,
    **who's bringing it** (✓ names, quantities, "You" first — social proof,
    now member-visible), and my −/+/Remove controls. Unclaiming is always
    allowed; a claimed row shows purple.
  - **Suggest a resource** — the dashed last card reads *"Don't see
    something? ＋ Suggest a resource"* (collaborative planning, replacing
    "Offer it"); the form has an **"I can bring one myself"** checkbox
    (default on → seeds the ×1 claim; off = pure suggestion for organizers).
    Retracting your own suggestion's last claim removes the listing.
- **Home dashboard: the Bring Something widget** — a configurable dashboard
  widget (id `resources`, reorder/hide/resize via the page editor like any
  other). It answers *"what does the community still need from me?"*, not
  "here is a link to the Resources page" (redesigned 2026-07-03):
  - **One list, not a directory** — it surfaces only the list currently
    needing the most attention (largest shortfall in units, then lowest
    readiness); other lists with gaps compress to "+N more lists could use a
    hand".
  - **Collective progress** — "% Ready" in the header (unit-weighted, same
    math as the board; never rounds up to 100 while short) + a 3px hairline
    progress bar. A whisper of momentum, not project management.
  - **Urgency-adaptive copy** — "1 Camping stove still needed." / "Still
    need 2 × Extension cord." / "7 items still needed — …", plus a purple
    **Needs attention** chip when ≥5 units short or readiness <50%.
    Everything covered is a **celebration state** ("✨ Everything Covered",
    "29 of 30 resources covered — the community is ready."), not a hidden
    widget — it hides only while **no** visible list has a targeted item.
  - **Personal line** — with claims: "You're bringing Camping Stove ×2,
    Cooler — thank you ✦" (gold); without: "You haven't committed anything
    yet — see what's needed →".
  - The **whole card** links to `/participate#bring`; data via
    `getResourceWidgetState` (`lib/resources.ts`, suggestions/offers never
    gate readiness; over-fulfillment never inflates it). The page's sections
    arrive server-rendered (initial data via `lib/participate-data.ts` /
    `getMemberResourceView`), but late layout shifts (images, fonts) can
    still nudge the anchor, so `ResourceCommitments` **pins** `#bring` on
    every layout change for the first ~3s (ResizeObserver on body; the first
    wheel/touch cancels).
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
  + suggestion attribution + **claimant names** (`claimants: [{ name, quantity,
  me }]`, "You" first — the board's social proof)
- `POST /api/resources/claims` — `{ resource_id, quantity }`; quantity 0 removes
  the claim, otherwise upserts. Quantity clamped to 1–99. Removing the last
  claim on your own suggestion deletes its row (retraction).
- `POST /api/resources/offers` — `{ list_id, name, note, bring }`; creates the
  open-callout item, plus the suggester's ×1 claim unless `bring: false`
  (a pure suggestion for organizers).

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
