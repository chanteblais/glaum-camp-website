# Kitchen board (catering shopping list) — moved

**This doc moved to the All Hands repo** (`~/Projects/all-hands`,
github `chanteblais/all-hands`) on 2026-08-26, when the kitchen board was
extracted into its own product. The full spec — state shape, shape-migration
history, sync, security posture, open threads — now lives at
**`all-hands/docs/kitchen-board.md`** and is maintained there.

What happened on this side: the catering functionality was stripped out
completely — `public/kitchen.html` and the two routes that backed it
(`/api/kitchen-list`, `/api/kitchen-ai`) were all deleted, so the old URL now
404s (deliberate: the camp app carries no link to the new deployment) —
closing the retire-or-gate thread (they were the camp app's only
unauthenticated write endpoint and only money-spending endpoint). The board's
state rows (live + test) were copied into the All Hands Supabase at cutover.

History up to the extraction is in this repo's git log (this file's own
history) and in [business.md](business.md) → Discussion log.
