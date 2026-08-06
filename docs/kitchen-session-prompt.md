# Kitchen Board — Session Brief

Paste at the start of a new Claude session that is working on the **catering kitchen
board**. Deliberately short; `docs/catering-kitchen.md` is the full spec, read it before
changing anything structural.

**Live:** https://camp.glaum.ca/kitchen.html — unlinked, **unauthenticated**, in daily use
by Daniel (Chante's partner) catering What If 2026. Treat it as production with real users.

**Code:** `public/kitchen.html` (one self-contained static page — no framework, no build)
and two unauthenticated routes: `app/api/kitchen-list/route.ts` (GET/PUT state) and
`app/api/kitchen-ai/route.ts` (the assistant drawer — Claude-backed, proposes operations
the page previews and applies; **spends money**, needs `ANTHROPIC_API_KEY` in the env).
**Repo:** `/Users/chante/Documents/Glaum/website/glaum-camp-website` — the camp app repo.
It shares nothing else with the camp app; see "Why it looks nothing like the rest of the
app" in the spec.

## Read these before touching it
- `docs/catering-kitchen.md` — the spec: shape, migrations, sync, security posture, open threads
- `docs/branching.md` — branching + parallel-session rules (they apply here too)

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
   load (v1→v5 so far, no SQL migrations). Before shipping a new shape, seed a scratch board
   with a copy of the real live state, then diff **every** shopping-list quantity before and
   after. The v4→v5 change was verified this way across all 50 rows; do the same.
4. **Portions are guesses; menus are facts.** Every per-person amount in there is a standard
   catering planning default that Claude invented. The dish names, days, groups and headcounts
   come from Daniel's handwritten sheets. Never silently "correct" a portion he has set.

## Shape (v5), in one breath

A **day** holds the **groups** eating that day (label + headcount) and the **meals** served;
each meal has **sections** (courses); each **item** names the `groupIds` that get it. Quantity
= `per × (assigned groups' headcounts) × (1 + buffer)`. The **shopping list** aggregates every
selected day into one trip, matched by item name+unit. The **pantry** is a standing ledger
matched to items by name and subtracted once from the combined total. **Finish shop** (foot of
the list) writes crossed-off rows back into the pantry.

All of it lives in one JSON blob: `page_content.catering_kitchen_state`.

## Where it stands (2026-08-05)

Four days entered from Daniel's sheets, 82 shopping rows, 830 covers:

| Day | Volunteers | PAs |
|---|---|---|
| Thursday — Taco Night | 88 | 121 |
| Friday — Thai Night | 111 | 133 |
| Saturday — BBQ | 60 | 128 |
| Sunday — Asian | 51 | 138 |

Every sheet's headcounts were **doubled by accident**, so all of these are the halved
figures. Saturday's PAs were 255, halved to 128 (rounded up rather than under-feeding).

**The shop had not started as of this writing** — Chante and Daniel were still refining.

## Open threads

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
  See `docs/business.md` → Discussion log, 2026-08-04.

## Superseded — don't edit these by mistake

`~/Documents/Glaum/catering/shopping-list.html` was the original standalone prototype (also
published as a private artifact). It is **superseded** by `public/kitchen.html` and is not
what Daniel uses. Don't develop there.
