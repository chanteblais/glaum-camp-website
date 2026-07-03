# Shared Resources

Communities coordinate physical objects members bring to an event — stoves,
coolers, tools, shade structures, decor. Today that happens in spreadsheets and
"who's bringing a camping stove?" threads. Shared Resources makes it a
first-class concept: admins author **needs**, members meet them with one-click
**claims**, and the totals take care of themselves.

Built 2026-07-02 · migration `051_shared_resources.sql`.

## The model

Three tables (see `docs/database.md`):

- **`resource_lists`** — a named collection of needs ("Shared Kitchen",
  "Setup Equipment"). Community-scoped, with an optional *stewarding group*
  (`group_id`, display context only — not a permission gate) and a `visible`
  toggle so a half-authored list stays hidden.
- **`resources`** — one item per row: name, optional note, `quantity_needed`.
- **`resource_claims`** — one row per member per resource (`UNIQUE`), carrying
  a `quantity`. Bringing three coolers = one row with quantity 3.

**Totals are always derived from claim rows, never stored** — the same rule as
distinctions. **A claim is the confirmation**: there is no pledge→confirm
workflow. Over-fulfillment is allowed and shown (5 of 4 is information the
organizer wants, not an error).

## Surfaces

- **Admin → Manage → Program → Shared Resources** (`ResourcesManager.tsx`):
  create/edit/hide/delete lists, add/edit/delete items, and see per-item
  progress *with claimant names* — the organizer always knows who to chase.
- **Member: `/signup` → "Bring Something"** (`ResourceCommitments.tsx`, below
  Your Groups): visible lists with per-item progress and an **"I'll bring one"**
  button; a claimed row grows −/+ steppers and a remove control. Unclaiming is
  always allowed — plans change, and the count simply reflects reality.
- **Profile → Active Commitments**: each claim renders as a `BRINGING` row
  ("Camping Stove ×2 · Shared Kitchen") via `lib/resources.ts` →
  `getMemberResourceClaims`, and counts toward the Active Commitments stat.
  Hands act, witnessed.

## API

- `GET/POST /api/admin/resources` — all lists + items + claims (with names via
  `memberDisplayNames`) / create list
- `PATCH/DELETE /api/admin/resources/[id]` — update / delete a list
- `POST /api/admin/resources/items`, `PATCH/DELETE /api/admin/resources/items/[id]` — items
- `GET /api/resources` — member view: visible lists + items + totals + own claim
- `POST /api/resources/claims` — `{ resource_id, quantity }`; quantity 0 removes
  the claim, otherwise upserts. Quantity clamped to 1–99.

## Non-goals (deliberate, revisit post–What If)

- **No polymorphic ownership** (department / event / community owner types).
  Departments aren't an entity; the hierarchy in early sketches
  ("Department of Nourishment → Shared Kitchen") is presentational — a list
  title does the job. If multi-owner ever proves necessary the data migrates
  cleanly from the single nullable `group_id`.
- **No event scoping.** Lists implicitly belong to *the* event — a
  single-community assumption, logged in `docs/generalizability-log.md`.
  Multi-event/multi-tenant scoping is a foundation-phase concern.
- **No offer side.** "I have a generator, does anyone need it?"
  (member-suggested items) is a different flow. Admin authors needs; members
  fulfill them.
- **No pledge→confirm ceremony**, no reminders/nudges, no home-dashboard
  unmet-needs teaser (natural follow-on), no per-item reordering UI
  (creation order is the display order).
