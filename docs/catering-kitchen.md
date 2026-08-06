# Kitchen board (catering shopping list)

**Status:** live and in daily use · festival-scoped, deliberately quarantined from the rest
of the app. Starting a session on this? Read [kitchen-session-prompt.md](kitchen-session-prompt.md) first.

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
{ version: 5, usePantry, selected: [dayId],
  checked: { "<name>|w|c": true },
  days: [{ id, name, buffer,
           groups: [{ id, label, count }],          // who is on site, and how many
           meals:  [{ id, label, times,             // Brunch / Dinner / ...
                      sections: [{ id, name, note,
                                   items: [{ n, unit, per, pack, note,
                                             groupIds: [gid] }] }] }] }],
  pantry: [{ n, qty, unit }] }
```

**A day is meals; an item names who eats it.** The day carries the groups on site
(`groups`, each with a headcount) and the meals served (`meals` → `sections` →
`items`). Every item lists the `groupIds` that get it, so one dinner can feed
everyone while a course inside it — extras, a brunch special — goes to one group
only, and two groups can take different mains from the same course. Nothing in the
code knows the words "volunteer" or "PA"; a day holds any number of groups and meals.

An item's quantity is `per × (sum of its groups' headcounts) × (1 + buffer)`, so
assignment *is* the arithmetic — unassigning a group reduces what gets bought, and an
item assigned to nobody drops off the shopping list entirely (shown dimmed with
"nobody assigned" on the Menus tab rather than silently vanishing).

This replaced two earlier shapes: a per-item `who: both|v|pa` tag (v3), then a whole
separate menu per group (v4). v4 matched Daniel's two-column sheet but forced shared
food to be duplicated into each menu and edited twice; meals-with-assignment keeps
one row per real item. Assignment is shown as small toggle chips (`V`, `PA` —
shortest form that stays unambiguous among that day's groups), and each course has a
one-click "all of this course → <group> / everyone".

**Shape history.** v1 stored per-menu-item `onHand`; v2 replaced that with a
standing `pantry` array; v3 wrapped the single implicit day in a `days` array and
moved check-offs to a top-level `checked` map; v4 split each day into per-group
menus; v5 turned that inside out into meals + per-item group assignment.

v4 → v5 (`v4toV5`) merges the per-group menus back into one set of sections,
recording which groups each item came from; identical name+unit+**per** across menus
becomes one shared item with several `groupIds`, while a differing `per` stays a
separate row so nothing is silently averaged away. Sections are filed into meals by
name (anything containing "brunch"/"breakfast"/"lunch" goes there, everything else to
Dinner) and the day's single times string is split across them. Verified against a
copy of the live board: all 50 shopping-list quantities came through identical. The page migrates any older shape
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

Quantities: for each selected day, every item of every meal at `per × (its assigned
groups' headcounts) × (1 + that day's buffer/100)`; identical names (same unit class) are **summed across days** into one
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

`/api/kitchen-list` is the app's **only unauthenticated write endpoint**, and
`/api/kitchen-ai` (see The assistant, above) is its only unauthenticated
endpoint that **spends money**. Containment for kitchen-list:

- The route **hardcodes** the `page_content` key — it cannot write any other key.
- Shape validation (`groups` + `pantry` must be arrays) and a 200 KB cap.
- No PII: food quantities only.
- `noindex,nofollow` + not linked from anywhere in the app or sitemap.

The residual risk is real and accepted: anyone who learns the URL can read or
overwrite the list. **Remove or gate this after the festival** — see Open threads.

## The assistant (voice-friendly AI edits)

**Added 2026-08-05, owner-approved despite the endpoint posture below.** A chat
drawer on the page (floating "Assistant" button) plus one new route,
`/api/kitchen-ai` (POST). The intended gesture is the phone keyboard's dictation
mic — no audio pipeline exists; the OS turns speech into text and the drawer is
just a text box. Daniel says *"twelve and a half pounds of black beans"* and the
board updates, semantically matched ("black beans" → "Black beans (canned)").

**The assistant proposes; the caterer disposes.** The page sends its current
state + the chat history; the route calls Claude (`claude-opus-5`, adaptive
thinking at `effort: low` — the default effort ran ~2 minutes/request, low runs
~6 s) and returns a short reply plus a list of **operations** (`set_pantry`,
`rename_pantry`, `set_headcount`, `set_portion`, `check_item`, `add_menu_item`,
…). The page resolves each op against the *current* board into a before/after
line ("Pantry: Chickpeas — 12.5 → 8 lb"), shows them in a preview panel, and
nothing mutates until **Apply** is tapped — which routes through the ordinary
save path. Ops are re-resolved at tap time in case the board changed since the
preview; unresolvable ops (stale name, bad id) show as errors and are skipped.
The model never returns whole state and the route never touches the database,
so the assistant cannot mangle rows it isn't editing and cannot write anything
on its own.

This also dissolves most of the name-matching fragility for anything entered
through the drawer: the model sees the whole board, so off-by-a-word stock
("pasta sauce" vs "Tomato sauce (bolognese)") gets linked or asked about
instead of silently subtracting from nothing. Standing rules are enforced by
construction and by prompt: portions/headcounts/buffers only change when
explicitly asked, ambiguous names get an either/or question, destructive
requests get a confirm, and converted numbers are read back so a dictation
mis-hear ("125" for "12.5") is catchable at a glance.

**Implementation notes:**
- Structured outputs were tried and abandoned — even a modest op schema hit
  "Schema is too complex" / "Grammar compilation timed out" (3-minute
  requests). Prompt-instructed JSON + a tolerant extractor generates in
  seconds; the page re-validates every op anyway, so the grammar's guarantee
  was redundant.
- The system prompt is byte-stable and cache-marked; the (per-call) state JSON
  rides in the first user turn.
- Duplicate pantry names in different units exist (two Bacon rows) — op
  resolution prefers a unit match and falls back to name-only.
- Cost: roughly 5¢/interaction at Opus 5 rates; single-digit dollars for a
  festival week.

**Containment (this endpoint spends money):** no DB access at all, request
size caps (state 200 KB, message 4 K chars, history 12 turns), `max_tokens`
8000, and a best-effort per-IP rate limit (40/hour per serverless instance).
`ANTHROPIC_API_KEY` must be set in the deployment env. It shares the kitchen
board's retire-or-gate-after-festival clause — and strengthens the case for
gating.

## Closing out a shop

The pantry only becomes true stock if something writes reality back into it.
**Finish shop → update pantry** sits at the *end of the shopping list*, where a trip
actually finishes, and acts on **the rows you crossed off** — those are the things
that came back from the shop. It previews them: what's in the pantry, what you bought
(prefilled, rounded up, editable because real buying is in whole packs), what the
selected days consume, and what's left. Applying writes `pantry = now + bought − used`
(floored at zero) for those rows and unticks them. Everything still on the list is
left alone, so a partial shop closes out cleanly and the rest stays to be bought.

The button is disabled until something is crossed off, and says why.

Rows where `now + bought < used` are flagged **short** in red rather than silently
floored to zero: "you did not buy enough for this service" is the single most
useful thing the close-out can tell a caterer, and a zero would hide it.

This is the only path that mutates pantry quantities from the shopping side, and it
is always previewed before it writes.

**Known gap:** an item the pantry already covers (`stocked ✓`) never needs buying, so
it is never crossed off, so a close-out never draws it down. Crossing it off anyway
(bought 0) does the right thing, but nothing prompts that. If the ledger starts
drifting high across the week, this is why.

## Where the board stands (2026-08-05)

Four days entered from Daniel's handwritten sheets — 82 shopping rows, 830 covers:

| Day | Volunteers | PAs | Shape of the menu |
|---|---|---|---|
| Thursday — Taco Night | 88 | 121 | taco bar; PA-only Egg McMuffin brunch special, pickled onions, nacho chips |
| Friday — Thai Night | 111 | 133 | lemon-pepper chicken + prawn scampi (V) / lemongrass chicken + seafood pot (PA); PA extras; perogies brunch |
| Saturday — BBQ | 60 | 128 | BBQ chicken + penne bolognese (V) / ribs + Cajun chicken (PA); burrito brunch |
| Sunday — Asian | 51 | 138 | Korean BBQ chicken (V) / beef (PA); PA dips, pickles, wontons; French-toast brunch |

Every sheet's headcounts were **doubled by accident**; the table shows the halved figures
actually in the board. Saturday's 255 PAs halved to 128 — rounded up, since rounding a
headcount down means under-feeding someone.

Brunch specials are **PA-only** on every day, matching Chante's original framing ("PAs and
volunteers get the same brunch, but PAs get a brunch special").

**Portions throughout are Claude's planning defaults**, derived from standard catering
ranges and the dish names on the sheets — not Daniel's numbers. The dish names, days, groups
and headcounts are his. Treat portions as the thing most likely to be wrong, and never
silently change one he has set.

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
- **Friday's "Spicy sauce" (Ex 2)** carries a flag in the UI: it looked struck through on the
  sheet and hasn't been confirmed either way. (Saturday's baked beans carried the same flag
  until Chante confirmed the strikethrough was her testing, not a menu change.)
- `~/Documents/Glaum/catering/shopping-list.html` is the **superseded** standalone prototype
  that preceded this page (also published as a private artifact). Nobody uses it; don't
  develop there by mistake.
