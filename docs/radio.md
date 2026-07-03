# Radio — the public pulse of the community

Radio is the community's broadcast surface: a single calm stream of meaningful
camp activity. It is deliberately **not** chat — no threads, no replies, no
debates (Messages exists for that). Members tune in; the platform and the
organizers broadcast.

> Messages interrupt. Radio informs.

In the design-philosophy trinity, Radio is **the eye witnessing** — the
community seeing itself act, in the present tense (the Cabinet of Distinctions
witnesses the past tense).

## Surfaces

- **`/radio`** — members-only page (approved members). Editorial cards, not
  speech bubbles: icon/avatar · concise message · relative timestamp, grouped
  under day headings (Today / Yesterday / date). Newest first, latest 60.
- **Now / Up next strip** — at the top of `/radio`, derived at read time
  (never stored): the camp-day welcome line ("Day 2 of Glåüm") when today is
  inside `config_event_start_date…end_date`, plus what's happening right now
  and the next thing starting today, from `schedule_events` (visible +
  `show_on_schedule`, participation `general`/`mandatory` — shifts are work
  slots, not atmosphere).
- **Home dashboard teaser** — the `activity` widget ("On the Air") shows the
  latest 6 Radio events and links to `/radio`. It replaced the old derived
  joins/profile-updates feed (member joins now *are* Radio events).
- **Admin → Program → Radio** (`RadioManager`) — compose broadcasts, delete
  any event, toggle automatic sources.

## Data

**`radio_events`** (migration `061`) — one row per stored event:
`kind` (`broadcast` | `member` | `resource` | `distinction`; TEXT, no CHECK —
new kinds shouldn't need a migration), `message` (the full card line, name
inline), `icon` (emoji or asset-library image path), `actor_clerk_id` +
`actor_name` (who it's about; name denormalized at write time — the feed is a
historical record; avatar joined fresh at read time like the shoutouts
pattern), `link` (optional internal deep link), `created_by` (admin, for
broadcasts), `visible`, `created_at`.

The migration **backfills** one `member` event per approved application from
`reviewed_at`, so the feed is born alive rather than empty.

## Event sources (v1)

Stored events are written by `postRadioEvent` (`lib/radio.ts`) from the
routes where the moment happens — best-effort, never blocking the action:

| kind | Hook | Default | Example card |
|---|---|---|---|
| `broadcast` | `POST /api/admin/radio` | always on | 📢 Opening Ceremony begins in 30 minutes. |
| `member` | application approve route | **on** | ✦ Sarah joined the camp. |
| `resource` | resource claim route (first claim only — quantity edits and unclaims are silent; retreats are never broadcast) | **on** | ✨ Sarah committed to bringing a camping stove. |
| `distinction` | manual grant route (`member_distinctions`; rule-derived earns have no stored moment — a daily diff via the existing cron pattern is a future round) | **on** | 🏅 Erik received the Setup distinction. |

Automatic sources are toggleable in `page_content.config_radio`
(`{ sources: { member, resource, distinction } }`, parsed by
`parseRadioConfig` — absent key = all on). Organizer broadcasts have no
toggle; posting one is already the decision.

## Notifications

Radio does not notify. The one exception: the composer's **"Also alert
members"** checkbox on an organizer broadcast — reuses the lead-up notify
pattern (bell notification per member + announcement email honouring
`notification_preferences.email_announcements`). Default off.

## API

- `POST /api/admin/radio` — create broadcast `{ message, icon?, notify? }`
- `DELETE /api/admin/radio/[id]` — remove any radio event (admin curation)
- `PATCH /api/admin/page-content` — `config_radio` source toggles
- Member reads are server-rendered (`/radio`, home teaser) — no member API.

## Future rounds (explicitly deferred)

- Rule-derived distinction earns (daily diff job on the cron)
- Schedule-change events, milestones ("half the stoves are claimed")
- Kind filters on `/radio`
- Shoutouts folding in as a member-voice kind (changes their character —
  decide deliberately)
- Optional push for flagged broadcasts (post-PWA-notifications decision)
