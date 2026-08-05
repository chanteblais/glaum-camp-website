# Kitchen board (catering shopping list)

**Status:** shipped 2026-08-05 · festival-scoped, deliberately quarantined from the rest of the app.

A single unlinked page — `camp.glaum.ca/kitchen.html` — where the caterer plans a
day's service: a shopping list computed from headcounts, and a standing pantry
ledger subtracted from it. Built for Daniel (Chante's partner) catering What If
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

One `page_content` row, key `catering_kitchen_state`:

```
{ version, v, pa, buffer, usePantry,
  groups: [{ id, name, note, items: [{ n, who, unit, per, pack, note, got }] }],
  pantry: [{ n, qty, unit }] }
```

- `who`: `both` | `v` (volunteers) | `pa` (production artists) — picks the headcount.
- `unit`: `oz` | `pc` per person on menu items; pantry entries use `lb` | `pc`.
- `pack`: `[size, label]` — case-count hint ("≈ 7 × 10 lb chubs").
- **Pantry matches menu items by name** (case-insensitive) + compatible unit. A
  pantry entry with no menu match shows "not on this list" and persists — that's
  the point of a standing ledger.

Quantities: `per × headcount × (1 + buffer/100)`, minus pantry stock when
`usePantry` is on. Weight math is in ounces internally, displayed in lb (+kg).

## Sync

`/api/kitchen-list` — GET returns the blob, PUT writes it (POST is an alias so the
page's `sendBeacon` leave-flush works). The page saves ~700 ms after an edit,
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

## Open threads

- **Multi-day.** Daniel serves all week; today only Thursday exists. The agreed
  direction is several day-lists drawing down one pantry, which needs the rest of
  the week's menus and a decision on when stock decrements (planned vs. actually used).
- **Retire or gate post-festival.** Either delete the page + route, or move it
  behind auth once the catering thread graduates into a real product surface.
- The portion defaults are standard catering planning ranges, not Daniel's numbers —
  they're starting points he's expected to correct in place.
