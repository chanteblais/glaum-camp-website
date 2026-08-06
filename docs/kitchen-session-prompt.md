# Kitchen Board — Session Brief

Paste at the start of a new Claude session that is working on the **catering kitchen
board**. Deliberately short; `docs/catering-kitchen.md` is the full spec, read it before
changing anything structural.

**Live:** https://camp.glaum.ca/kitchen.html — unlinked, **unauthenticated**, in daily use
by Daniel (Chante's partner) catering What If 2026. Treat it as production with real users.

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

## ⚠️ In flight — read this first

**`feat/kitchen-prices` (77d93be) is committed but NOT merged.** It adds the v6 price
book (a Prices tab) and the By item / By supplier lens on the shopping list. Production
is still on **v5** and has no `suppliers`/`prices` fields. So:

- If that branch is still unmerged, the shape notes below describe the *branch*, not live.
- It was verified quantity-identical against a copy of live (84 rows, hash `8543926e` on
  both the deployed v5 page and the v6 page) — don't redo that work, but do re-verify if
  you change the shape again.
- Awaiting Chante's review. Nothing to do before merging except her look; no migration.

## The four rules that matter most

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

## Shape (v6), in one breath

A **day** holds the **groups** eating that day (label + headcount) and the **meals** served;
each meal has **sections** (courses); each **item** names the `groupIds` that get it. Quantity
= `per × (assigned groups' headcounts) × (1 + buffer)`. The **shopping list** aggregates every
selected day into one trip, matched by item name+unit. The **pantry** is a standing ledger
matched to items by name and subtracted once from the combined total. **Finish shop** (foot of
the list) writes crossed-off rows back into the pantry. The **price book** (`suppliers` +
`prices`, v6) is a second standing ledger — what each item costs per pack at each supplier —
and drives the shopping list's **By supplier** lens, which buys each item wherever the *whole
packs* come out cheapest (**not** the best unit price: needing 9 lb, three 4 lb bags at
$2.25/lb beat one 22 lb case at $1.59/lb).

All of it lives in one JSON blob: `page_content.catering_kitchen_state`.

**The assistant proposes, the caterer disposes.** `/api/kitchen-ai` returns a reply plus
*operations*; the page resolves each against the current board into a before/after preview
and nothing mutates until Apply. Keep every new capability on that rail.

## Where it stands (2026-08-05)

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

- **The price book is empty** — 1 of 84 items priced (a black-bean test entry). It only
  earns its keep once Daniel fills it; dictating to the assistant is the fast path.
- **Costco Business Centre New Westminster** opened Nov 2025 — first in BC, next-day
  delivery inside a zone, ~3,000 items aimed at commercial kitchens. Worth checking whether
  the zone reaches them; it may matter more than any feature.
- **Cart-ready export is the natural next step.** Price rows already carry an unused `sku`
  field, and filling that in is the real work — everything downstream is formatting.
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
