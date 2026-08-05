# Kitchen board (catering shopping list)

**Status:** shipped 2026-08-05 · festival-scoped, deliberately quarantined from the rest of the app.

A single unlinked page — `camp.glaum.ca/kitchen.html` — where the caterer plans the
week's service: per-day menus, a shopping list that **aggregates the days you're
shopping for**, and a standing pantry ledger subtracted from the combined total. Built for Daniel (Chante's partner) catering What If
2026, where the whole operation otherwise runs on spreadsheets. It is also the
first probe of catering as an adjacent product segment (see
[business.md](business.md) → Discussion log, 2026-08-04).

## Why it looks nothing like the rest of the app

Three deliberate departures, all for the same reason — **the user has no member
account and is standing in a warehouse aisle on his phone**:

1. **No authentication.** Requested explicitly. The caterer is not a camp member
   and must not hit a sign-in wall mid-shop.
2. **Static HTML in `public/`, not a Next route.** No Clerk, no server components,
   no build coupling. `middleware.ts`'s matcher excludes any path containing a dot
   (`/((?!_next|.*\..*).*)`), so `/kitchen.html` never enters the Clerk pipeline at
   all. The service worker doesn't cache `.html`, so a republish is live on reload.
3. **One JSON blob, not tables.** The data model is a scratchpad that changes shape
   every time the caterer learns something. A migration per idea would be friction
   with no payoff at this scale.

## Data

One `page_content` row, key `catering_kitchen_state` (v3):

```
{ version: 3, usePantry, selected: [dayId],
  checked: { "<name>|w|c": true },
  days: [{ id, name, times, v, pa, buffer,
           groups: [{ id, name, note, items: [{ n, who, unit, per, pack, note }] }] }],
  pantry: [{ n, qty, unit }] }
```

**Shape history.** v1 stored per-menu-item `onHand`; v2 replaced that with a
standing `pantry` array; v3 wrapped the single implicit day in a `days` array and
moved check-offs to a top-level `checked` map. The page migrates any older shape
forward on load and re-saves it, so no migration script is needed and old clients
can't be broken by the new one — the API accepts both `days` and legacy `groups`.

`checked` is keyed by name+unit-class rather than per day-item because a check-off
means "this is in the cart," which is a property of the shopping trip, not of a day.

- `who`: `both` | `v` (volunteers) | `pa` (production artists) — picks the headcount.
- `unit`: `oz` | `pc` per person on menu items; pantry entries use `lb` | `pc`.
- `pack`: `[size, label]` — case-count hint ("≈ 7 × 10 lb chubs").
- **Pantry matches menu items by name** (case-insensitive) + compatible unit. A
  pantry entry with no menu match shows "not on this list" and persists — that's
  the point of a standing ledger.

Quantities: for each selected day, `per × that day's headcount × (1 + that day's
buffer/100)`; identical names (same unit class) are **summed across days** into one
buy row that shows its per-day breakdown. Pantry stock is subtracted **once from the
combined total**, not per day — subtracting it per day would double-count the same
sack of rice. Weight math is in ounces internally, displayed in lb (+kg).

**Days.** Each day carries its own name, service times, headcounts, buffer, and menu
sections. New days start blank or as a copy of an existing day (menus repeat across a
festival week, so copying is the common path). The day chips on the Shopping list tab
choose which days a trip covers; the Menus tab edits one day at a time.

## Sync

`/api/kitchen-list` — GET returns the blob, PUT writes it (POST is an alias so the
page's `sendBeacon` leave-flush works). `?scope=test` reads/writes a **separate
scratch row** (`catering_kitchen_state_test`) so changes can be exercised against
real-shaped data without touching the live board during a service day; the scope
list is a closed allow-list, so it can't be used to write arbitrary keys.
**The page defaults to the scratch board on localhost** and shows a "SCRATCH BOARD"
banner there — reaching live from dev takes an explicit `?scope=live`. This is not
theoretical: during development a dev page defaulted to live and overwrote the real
board with a shape the deployed code couldn't read. The board was still pristine so
nothing was lost, but had the caterer entered pantry counts they would have gone. The page saves ~700 ms after an edit,
polls every 10 s, and adopts remote state only when it has no unsaved edits and no
input is focused (so a poll can't yank a field mid-type). `localStorage` keeps a
device-local backup for offline; the sync bar states which mode it's in.

**Concurrency is last-write-wins on the whole document.** Two people editing
different rows within the same ~10 s window: one edit is lost. Acceptable for two
people who are usually in the same kitchen; a real fix means per-field writes or
CRDT, which this does not need yet.

## Security posture

This is the app's **only unauthenticated write endpoint**. Containment:

- The route **hardcodes** the `page_content` key — it cannot write any other key.
- Shape validation (`groups` + `pantry` must be arrays) and a 200 KB cap.
- No PII: food quantities only.
- `noindex,nofollow` + not linked from anywhere in the app or sitemap.

The residual risk is real and accepted: anyone who learns the URL can read or
overwrite the list. **Remove or gate this after the festival** — see Open threads.

## Closing out a shop

The pantry only becomes true stock if something writes reality back into it.
**Finish shop → update pantry** opens a preview table — for every item on the
selected days: what's in the pantry, what you bought (prefilled from the check-offs,
rounded up, editable because real buying is in whole packs), what those days consume,
and what's left after. Applying writes `pantry = now + bought − used` (floored at
zero), clears the check-offs, and unticks the days — the trip is done.

Rows where `now + bought < used` are flagged **short** in red rather than silently
floored to zero: "you did not buy enough for this service" is the single most
useful thing the close-out can tell a caterer, and a zero would hide it.

This is the only path that mutates pantry quantities from the shopping side, and it
is always previewed before it writes.

## Open threads

- **Close-out assumes planned = cooked.** It subtracts what the menu *says* a day
  needs, not what the kitchen actually used. Good enough while the plan is the best
  estimate anyone has; a real "actual used" column is the next honest step.
- **Menus for the rest of the week** still have to be entered — the structure is
  there, the food isn't. Copy-a-day covers the repeat cases.
- **Retire or gate post-festival.** Either delete the page + route, or move it
  behind auth once the catering thread graduates into a real product surface.
- The portion defaults are standard catering planning ranges, not Daniel's numbers —
  they're starting points he's expected to correct in place.
