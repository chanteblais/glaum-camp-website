# Kitchen Board — Session Brief

Paste at the start of a new Claude session that is working on the **catering kitchen
board**. Deliberately short; `docs/catering-kitchen.md` is the full spec, read it before
changing anything structural.

**Deployed:** https://camp.glaum.ca/kitchen.html — unlinked, **unauthenticated**. Built for
Daniel (Chante's partner) catering What If 2026.

⚠️ **The board's DATA is no longer live or current (Chante, 2026-08-06):** *"None of it is
live or current anymore."* Nobody is shopping off it. Earlier revisions of this brief said
"in daily use — treat it as production with real users"; **that is now stale.** Practical
effect: shape changes and state edits are **low-risk**, and the "snapshot before you write
to live" caution is about not destroying a record, not about interrupting a live shop.

**Still true, and unchanged by the above:** the page is **publicly reachable**,
`kitchen-list` is the app's only unauthenticated *write* endpoint, and `kitchen-ai` is its
only unauthenticated endpoint that **spends money**. Retire-or-gate (see Open threads) is
now *more* actionable, not less — nothing is using it.

**Code:** `public/kitchen.html` (one self-contained static page — no framework, no build)
and two unauthenticated routes: `app/api/kitchen-list/route.ts` (GET/PUT state) and
`app/api/kitchen-ai/route.ts` (the assistant drawer — Claude-backed, proposes operations
the page previews and applies; **spends money**, needs `ANTHROPIC_API_KEY` in the env,
which is set on Vercel for production + preview).
**Repo:** `/Users/chante/Documents/Glaum/website/glaum-camp-website` — the camp app repo.
It shares nothing else with the camp app; see "Why it looks nothing like the rest of the
app" in the spec.

## Read these before touching it
- `docs/catering-kitchen.md` — the spec: shape, migrations, sync, security posture, open threads
- `docs/branching.md` — branching + parallel-session rules (they apply here too)

## ⚠️ Shelved — read this first

**`feat/kitchen-prices` (77d93be) is SHELVED, not in flight.** Chante's call, 2026-08-06:
the price book "didn't end up being as helpful as I imagined". The branch adds the v6 price
book (a Prices tab) and the By item / By supplier lens. **It will not be merged as it
stands.** Production is on **v5** and has no `suppliers`/`prices` fields.

- **Don't merge it, and don't treat it as pending review.** It is parked deliberately, not
  forgotten. Left on disk because it is complete and verified, so reviving it is cheap if
  the price book (or a second supplier — see Costco below) ever becomes real.
- It was verified quantity-identical against a copy of live (84 rows, hash `8543926e`) —
  that work stands if it is ever revived.
- **The shape notes below describe live (v5), not that branch.**
- ⚠️ **Version-number collision.** The shelved branch calls its shape **v6**. The next
  change that actually ships — the minimal `sku` field for cart export — will also want to
  be v6. If that lands first, reviving `feat/kitchen-prices` means renumbering it to v7 and
  re-checking `migrate()`. Don't let two different v6 shapes exist.

**The active direction is cart export instead** — a minimal `sku` on the item, then emitting
a SKU list the caterer loads into his own Wholesale Club cart. See
`docs/wholesale-club-cart.md`.

## The four rules that matter most

*(Rules 1–3 were written while Daniel was shopping off the board daily. The data is no
longer live — see the ⚠️ at the top — so the stakes are lower, but the failure modes they
describe are real and the habits are cheap. Keep them.)*

1. **Never point a dev page at the live board.** The page defaults to a scratch board on
   localhost (`?scope=test`, "SCRATCH BOARD" banner) precisely because this went wrong once:
   a dev page wrote to production and a stale snapshot restore then wiped Chante's real
   edits. Reaching live from dev takes an explicit `?scope=live`, and you should almost
   never need it.
2. **Snapshot before you write to live.** `curl -s https://camp.glaum.ca/api/kitchen-list > backup.json`
   before any state edit. If something is already there that you didn't expect, find out
   whose it is before overwriting — do not assume it's your own leakage.
3. **Any shape change must be quantity-identical.** The page migrates old state forward on
   load (v1→v6 so far, no SQL migrations). Before shipping a new shape, seed a scratch board
   with a copy of the real live state, then diff **every** shopping-list quantity before and
   after. v4→v5 was verified across all 50 rows; v5→v6 across all 84. Do the same.
   Two traps that shape changes keep hitting: `migrate()` has **multiple exits** that each
   pin a version, and `payload()` lists fields **explicitly** — miss it and every save
   silently drops your new data.
4. **Portions are guesses; menus are facts.** Every per-person amount in there is a standard
   catering planning default that Claude invented. The dish names, days, groups and headcounts
   come from Daniel's handwritten sheets. Never silently "correct" a portion he has set.

## Shape (v5 = live), in one breath

A **day** holds the **groups** eating that day (label + headcount) and the **meals** served;
each meal has **sections** (courses); each **item** names the `groupIds` that get it. Quantity
= `per × (assigned groups' headcounts) × (1 + buffer)`. The **shopping list** aggregates every
selected day into one trip, matched by item name+unit. The **pantry** is a standing ledger
matched to items by name and subtracted once from the combined total. **Finish shop** (foot of
the list) writes crossed-off rows back into the pantry.

*(A **price book** — `suppliers` + `prices`, a second standing ledger driving a By-supplier
lens that buys where the whole packs come out cheapest — exists only on the shelved
`feat/kitchen-prices` branch. **It is not part of the live shape.** See Shelved, above.)*

All of it lives in one JSON blob: `page_content.catering_kitchen_state`.

**The assistant proposes, the caterer disposes.** `/api/kitchen-ai` returns a reply plus
*operations*; the page resolves each against the current board into a before/after preview
and nothing mutates until Apply. Keep every new capability on that rail.

## Where it stood (2026-08-05) — historical

⚠️ Snapshot of the board while it was in active use. **The data is no longer current
(2026-08-06)** — read the numbers below as a record of what was built and proven, not as
the state of the board today.

Four days from Daniel's sheets — **84 shopping rows, 819 covers**:

| Day | Volunteers | PAs |
|---|---|---|
| Thursday — Taco Night | 90 | 121 |
| Friday — Thai Night | 109 | 136 |
| Saturday — BBQ | 57 | 124 |
| Sunday — Asian | 48 | 134 |

Every sheet's headcounts were **doubled by accident** and halved on entry (Saturday's 255
PAs rounded up to 128 rather than under-feed); the figures above include Chante's later
corrections, so treat the live board as the truth, not this table.

Pantry has ~89 rows, most at 0 — a row is auto-created for every menu item, so an empty
pantry row is normal, not clutter. **The shop hadn't really started** as of this writing:
`selected` is Thursday only and nothing is crossed off.

## Open threads

- ~~The price book is empty~~ — **closed 2026-08-06, shelved with the branch.** It never got
  past 1 of 84 items priced, and Chante's read is that it didn't earn its keep. See Shelved,
  above. The lesson worth keeping: structure built for a future that hasn't arrived doesn't
  pay for itself — which is why the `sku` replacement below is deliberately one field.
- **Costco Business Centre New Westminster** opened Nov 2025 — first in BC, next-day
  delivery inside a zone, ~3,000 items aimed at commercial kitchens. Worth checking whether
  the zone reaches them; it may matter more than any feature. (This is also the one thing
  that would justify reviving supplier-scoped SKUs — see below.)
- **Cart export is the active direction** (2026-08-06). It needs a **minimal optional `sku`
  on the item**, meaning "the Wholesale Club product" — *not* the supplier-scoped `sku` on
  the shelved branch's price rows, which is entangled with `suppliers`/`prices` and is not
  worth cherry-picking. Add it fresh; it's roughly a tenth of that code. If a second
  supplier ever becomes real, widening one field to a map is a small, well-understood
  migration.
  ⚠️ **The old line here said automated checkout was "off the table (credentials, bot
  detection, ToS, money)". That is now half wrong** — see `docs/wholesale-club-cart.md`
  (2026-08-06). Wholesale Club's cart is a server-side object written by a single
  `POST .../carts/<cartId>` whose `entries` object is keyed by SKU, so a whole list lands
  in one call; and a bookmarklet running in Daniel's own logged-in browser needs **no
  stored credentials, no guest cart and no server-side traffic**. What stands unchanged:
  it is an **undocumented internal API** (ToS, can break without notice), accuracy on a
  ~$2k order is the real exposure, and this must not land on the unauthenticated page —
  it belongs after the retire-or-gate thread and after the festival. A SKU-only product
  URL (`/en/x/p/<SKU>`) works, so the plain link export remains the always-works fallback.
- **Friday, "Spicy sauce" (Ex 2)** is flagged in the UI: it looked struck through on the
  sheet and has not been confirmed. Confirm or delete.
- **Portions want Daniel's eye**, especially the Friday/Saturday/Sunday mains, which were
  invented wholesale from dish names.
- **Stocked items never draw down.** An item the pantry already covers is never crossed off,
  so a close-out never subtracts it. Crossing it off anyway (bought 0) works, but nothing
  prompts it. If the ledger drifts high across the week, that's why.
- **Close-out assumes planned = cooked** — it subtracts what the menu says, not what the
  kitchen actually used.
- **Retire or gate this after the festival.** kitchen-list is the app's only
  unauthenticated write endpoint, and kitchen-ai its only unauthenticated endpoint that
  spends money (owner accepted the risk 2026-08-05). Either delete the page + both routes
  or move them behind auth.
- **Product question, unresolved:** fold catering into the camp app properly, or spin it out.
  See `docs/business.md` → Discussion log, 2026-08-04 and 2026-08-05.

## Superseded — don't edit these by mistake

`~/Documents/Glaum/catering/shopping-list.html` was the original standalone prototype. It is
now a **signpost page** ("this page has moved" → camp.glaum.ca/kitchen.html), republished to
the same private artifact URL so old links redirect rather than showing stale quantities.
Keep the file at that path — it is the artifact's source. Don't develop there.
