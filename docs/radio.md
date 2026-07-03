# Radio — the curated community feed

Radio is the community's heartbeat surface: a **curated stream of meaningful
moments** that helps members feel connected to the rhythm of camp. It is
deliberately **not** chat (no threads, no replies — Messages exists for that)
and deliberately **not an audit log** (it records moments, not database
changes).

> Radio answers "What's happening around camp?" — never "What changed in the
> database?" Every post should make a member think "Oh!"

In the design-philosophy trinity, Radio is **the eye witnessing** — the
community seeing itself act, in the present tense (the Cabinet of Distinctions
witnesses the past tense).

## The editorial bar

Every candidate event asks: **"Would the average member care?"**

✅ On the air: contributions committed, distinctions earned, organizer
announcements, events starting, community milestones, welcomes, member voices.

❌ Recorded internally only (never Radio): profile edits, bio updates,
settings changes, group description changes — anything that reads like a
changelog.

The writing is editorial, not mechanical — headline + optional supporting
line, present-tense, momentum-building ("Only one more to go!"). Content
leads; **timestamps whisper** (tiny, low-opacity, corner). All copy lives in
one place: the post builders in `lib/radio.ts`.

## Post kinds

Each kind has its own card language on `/radio`, so the feed has rhythm:

| kind | Written by | Default | Card | Example |
|---|---|---|---|---|
| `broadcast` | organizer composer (`POST /api/admin/radio`) | always on | gold-washed, 📢 | 📢 Tea service has moved to the Salon. |
| `welcome` | application approve route (dup-guarded) | **on** | purple-tinted, avatar | 👋 Welcome Michael to Glåüm! · *Say hello if you see them around camp.* |
| `contribution` | first resource claim + bring-it offers (quantity edits/unclaims silent — retreats are never broadcast) | **on** | ✨, gold detail line | ✨ Sarah just covered a camping stove. · *Only one more to go!* |
| `achievement` | manual distinction grant (rule-derived earns have no stored moment — daily diff via the cron pattern is a future round) | **on** | medal art, ringed disc, engraved italic detail | 🏅 Erik earned the Setup distinction. |
| `milestone` | claim that completes a resource list (guarded — one per list completion) | **on** | centered celebration, no disc | 🎉 Shared Kitchen is now fully equipped. |
| `voice` | any approved member via the `/radio` composer (`POST /api/radio`, ≤200 chars) | **on** | quiet, italic, "— Sarah" attribution | ✦ *The sunset from the tower is unreal right now.* |

Automatic sources are toggleable in `page_content.config_radio`
(`{ sources: { welcome, contribution, achievement, milestone, voice } }`,
parsed by `parseRadioSources` — absent key = all on). Organizer broadcasts
have no toggle; posting one is already the decision.

## Surfaces

- **`/radio`** — members-only. Now/Up-next strip → member composer → the feed
  (day-grouped cards, newest first, latest 60).
- **Now / Up next strip** — derived at read time, never stored: the camp-day
  welcome ("Day 2 of camp") while today is inside
  `config_event_start_date…end_date`, plus what's happening now and the next
  thing starting today from `schedule_events` (visible + on-schedule,
  `general`/`mandatory` — shifts are work slots, not atmosphere). The client
  picks against the member's own clock (their device is at camp; the server
  is in UTC), re-checking each minute.
- **Home dashboard teaser** — the `activity` widget ("On the Air") shows the
  latest 6 posts and links to `/radio` (replaced the old joins/profile-updates
  feed — joins now *are* Radio welcomes).
- **Admin → Program → Radio** (`RadioManager`) — compose broadcasts, toggle
  the automatic sources, and curate: **any** post can be removed.

## Data

**`radio_events`** (migration `061`): `kind` (open set, no CHECK), `message`
(the headline, name inline), `detail` (optional supporting line), `icon`
(emoji or asset path), `actor_clerk_id` + `actor_name` (name denormalized at
write time — the feed is a historical record; avatar joined fresh at read,
the shoutouts pattern), `link`, `created_by`, `visible`, `created_at`
(indexed DESC). Writes go through `postRadioEvent` / gated
`postSourcedRadioEvent` — best-effort, never blocking the action they ride
on. The migration **backfills** one welcome per approved application from
`reviewed_at`, so the feed is born alive.

## Notifications

Radio does not notify — Messages interrupt, Radio informs. The one exception:
the organizer composer's **"Also alert members"** checkbox (bell + announcement
email honouring `notification_preferences.email_announcements` — the lead-up
notify pattern). Default off.

## Future rounds (explicitly deferred)

- Rule-derived distinction earns (daily diff job on the cron)
- "Still needed" nudges ("🪑 Decor still needs two rugs") and event-start
  posts as stored moments (the strip covers "now" live)
- Kind filters on `/radio`
- Optional push for flagged broadcasts (post-PWA-notifications decision)

## Radio voices vs Shoutouts (decided 2026-07-03: they stay separate)

Same input mechanics, opposite delivery contracts. **Shoutouts are pinned to
the reader** — they hold a slot on the dashboard widget and keep earning
impressions ("S.O.S. Has anyone seen my furry vest?" needs eyes until it's
found). **Radio voices are pinned to the moment** — witnessed by whoever is
tuned in, then they sink; the expectation is a voice will likely not be seen
beyond the moment, and that's the point. Post to Shoutouts when you need a
response; put a moment on Radio when it deserves witnessing. Neither absorbs
the other.
