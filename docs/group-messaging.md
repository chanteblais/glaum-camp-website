# Group Messaging — Design

Status: **approved design, not yet built** (2026-06-22). No code written yet; this is the
spec we react to and build from.

Goal: let groups (crews like Setup/Teardown/Decor, plus member-created interest groups)
coordinate inside the portal, so it becomes the central place to run group responsibilities
instead of scattered group texts.

## Decisions already made

These were settled in design discussion — treat as fixed unless we revisit deliberately.

1. **One messaging surface.** Group threads live in the existing `/messages` inbox alongside
   1:1 DMs. **No new top-level nav item** for groups, for members or admins.
2. **Every group can have a thread.** Messaging is a capability layered on the *existing*
   group concept (which already drives the Commitments card, attunement task, and schedule
   filtering via [lib/groups.ts](../lib/groups.ts)). There is no special "messaging group" —
   all groups are equal; a thread is just something they can have.
3. **Unify the data model.** Migrate today's strictly-1:1 `messages` into a real
   `conversations` + `conversation_participants` model. A DM is a 2-participant conversation;
   a group thread is an N-participant conversation bound to a `group_id`. This is the one piece
   that's expensive to change later, so it's built the grown-up way from day one even though
   the first UI shipped is minimal.
4. **Flat channel + one-level collapsible replies** (Slack model). Top-level messages form a
   flat chronological channel; any message can have a thread of replies hanging off it; replies
   do **not** nest further. This stays readable at any size — no deep-nesting tree. Implemented
   as a nullable `parent_message_id`.
5. **Quiet by default.** Group threads send **in-app notifications only, no email**, by default.
   Two pressure valves bring email back when it matters:
   - per-user **opt-in** ("email me about activity in this group"), off by default;
   - **`@mention`** — mentioning a specific member emails them even if they have the group quiet.
6. **Self-serve groups, parameterized governance.** Groups gain `join_policy` and `visibility`
   so admin-structural crews and member-created interest groups coexist in one table (see below).
7. **Join/leave.** Open groups are self-serve (join via a searchable dropdown of discoverable
   groups; leave freely). Admin-assigned responsibility groups stay admin-managed — a member
   can't silently vanish from the Teardown crew; leaving those is admin-mediated.
8. **Leads deferred.** No lead concept in v1 — any group member can post and reply. Leads
   arrive later as a `role` column on `group_members` (`member` | `lead`) and gain powers
   (moderate, approve join requests, announcement posts).

## Current state we're building on

- **`messages`** (migrations 022/027/032) is strictly 1:1: `sender_clerk_id`,
  `recipient_clerk_id`, `body`, `read`/`read_at`, `created_at`, `sender_name`. Conversations
  aren't a stored entity — the inbox derives them at read time by grouping on "the other party"
  ([app/api/messages/route.ts](../app/api/messages/route.ts)).
- **`groups`** + **`group_members`** (migration 030). `group_members` has
  `source` (`admin` | `application`) and a `UNIQUE (group_id, clerk_user_id)`. No `role`,
  no `join_policy`, no `visibility` yet.
- **Notifications**: per-user `notification_preferences` (`email_new_message`, …) and an
  in-app `user_notifications` table; DM email is throttled 30 min ([api/messages/route.ts](../app/api/messages/route.ts)).
- **`ShoutoutWidget`** is the closest existing UI pattern (feed + composer + delete), useful as
  a reference and possibly the basis of a later "latest from your groups" home teaser.

## Data model

### New: conversations

```sql
-- Migration 0NN: conversations + participants; messages gain conversation_id + parent_message_id

CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('direct','group')),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,  -- set iff type='group'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((type = 'group') = (group_id IS NOT NULL))
);
-- One conversation per group.
CREATE UNIQUE INDEX conversations_group_uniq ON conversations (group_id) WHERE group_id IS NOT NULL;

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  clerk_user_id   TEXT NOT NULL,
  last_read_at    TIMESTAMPTZ,            -- per-participant read state (replaces row-level read for groups)
  muted           BOOLEAN NOT NULL DEFAULT FALSE,
  email_opt_in    BOOLEAN NOT NULL DEFAULT FALSE,  -- group threads quiet by default
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, clerk_user_id)
);
CREATE INDEX cp_user_idx ON conversation_participants (clerk_user_id);
```

`messages` gains:

```sql
ALTER TABLE messages ADD COLUMN conversation_id   UUID REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE; -- null = top-level
CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at);
```

`recipient_clerk_id` becomes nullable / vestigial after backfill (it's meaningless for group
messages). Keep it for now to avoid a destructive change; drop it in a later cleanup migration
once nothing reads it.

### Read state — important nuance

Row-level `read`/`read_at` only works for one recipient. For group threads, "have I read this"
is **per participant**, so it moves to `conversation_participants.last_read_at`. A message is
unread for me if `created_at > my last_read_at` (and I'm not the sender). The unread badge and
inbox both switch to this. DMs migrate cleanly: a DM's old `read_at` maps to the recipient's
`last_read_at`.

### Backfill of existing DMs

For each distinct `(sender, recipient)` unordered pair in `messages`:
1. create a `type='direct'` conversation;
2. insert both users as participants (`last_read_at` = the timestamp of the latest message that
   party has read, so existing read state survives);
3. set `messages.conversation_id` for that pair's rows.

Idempotent and additive — no message rows deleted. Old derive-on-read inbox keeps working until
the API is switched over, so the migration and code change can land separately.

### Group governance columns

```sql
ALTER TABLE groups ADD COLUMN join_policy TEXT NOT NULL DEFAULT 'admin_assigned'
  CHECK (join_policy IN ('admin_assigned','open','request'));
ALTER TABLE groups ADD COLUMN visibility  TEXT NOT NULL DEFAULT 'listed'
  CHECK (visibility IN ('listed','hidden'));
ALTER TABLE group_members ADD COLUMN role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('member','lead'));   -- role unused in v1; here so leads need no later migration
```

- `join_policy`: `admin_assigned` (existing crews — admin manages membership) ·
  `open` (anyone joins) · `request` (ask a lead; needs leads, so effectively post-v1).
- `visibility`: `listed` = appears in the join dropdown, **contents members-only** ·
  `hidden` = invisible to non-members, invite/admin-add only.
- Existing groups default to `admin_assigned` + `listed`, preserving today's behavior.

**Auto-create** a conversation per group: on group create, and a backfill insert for all
existing groups. Adding/removing a `group_member` adds/removes the matching
`conversation_participant` (keep them in lockstep — single source of truth is `group_members`;
participants for group convos are derived from it).

## API

Reshape around conversations. Sketch:

- `GET /api/messages` — inbox: list my conversations (direct + group) with last message, unread
  count (via `last_read_at`), display name/avatar (group → group name+icon; direct → other party).
- `GET /api/conversations/[id]` — a thread: top-level messages + their reply threads; authz =
  caller is a participant.
- `POST /api/conversations/[id]` — post a message (optional `parent_message_id` for a reply).
  Parses `@mentions`, writes in-app notifications for all other participants, emails only those
  with `email_opt_in` **or** who were `@mentioned` (respecting `notification_preferences` + throttle).
- `POST /api/conversations/[id]/read` — set my `last_read_at = now()`.
- `PATCH /api/conversations/[id]/me` — toggle `muted` / `email_opt_in`.
- Groups: `GET /api/groups/joinable` (listed groups I'm not in) · `POST /api/groups/[id]/join` ·
  `POST /api/groups/[id]/leave` (open only; admin-assigned → 403 / "ask an admin").
- Keep the existing `POST /api/messages` DM-start path, but have it resolve-or-create a
  `type='direct'` conversation and write through the new tables.

`@mention` needs a member lookup for the composer (name → clerk_user_id). Store mentions
resolved (e.g. a `message_mentions` join, or a parsed array on the message) so notification
fan-out doesn't re-parse text.

## UI

- **`/messages` inbox** — group conversations as rows alongside DMs; group rows show group
  name + icon and an unread count. Minimal visual distinction (icon) so it's obvious which are
  crews vs people.
- **Thread view** — flat channel; each top-level message shows "💬 N replies" that expands its
  reply thread inline (one level). Composer supports `@mention` autocomplete. Per-thread overflow
  menu: mute, email opt-in, (open groups) leave, view roster.
- **Join flow** — a searchable dropdown of joinable (`listed`, not-joined) groups; pick → join →
  thread appears in inbox. Lives wherever groups are already surfaced (e.g. near the Commitments
  card) — **not** a new nav item.
- **Admin** — group create/manage in existing `/admin` Groups area gains `join_policy` +
  `visibility` controls. Admins reach any group's thread **on demand** from there; they are
  **not** auto-fed every group's thread on their home page. Admin-the-person sees only their own
  groups in their inbox, like any member.
- **(Later, optional)** a single "latest from your groups ↗" home teaser widget (ShoutoutWidget
  lineage) that links into the inbox — polish, not foundational; explicitly deferred.

## Notifications — the part that matters most

Default group thread → **in-app only**. Email a participant for a group message only if
(`email_opt_in` for that conversation) **or** (they were `@mentioned`), AND their global
`notification_preferences.email_new_message` allows it, AND not within the existing throttle
window. DMs keep today's behavior. Add an `email_group_messages` global pref later if needed; the
per-conversation `email_opt_in` + mention model is the primary lever.

## Phased build order

1. **Schema + backfill** — conversations/participants, `messages.conversation_id` +
   `parent_message_id`, group governance columns, auto-create group conversations, DM backfill.
   No behavior change yet.
2. **Switch DMs to conversations** — rewrite inbox/thread/unread/send through the new model;
   read state via `last_read_at`. Verify DMs behave exactly as before. (De-risks the model on a
   known surface before groups exist.)
3. **Group threads, read-only-ish** — surface each group's conversation in the inbox; let
   members post/read flat messages. Quiet-by-default notifications.
4. **Replies** — `parent_message_id` UI (collapsible one-level threads).
5. **`@mention`** — autocomplete + mention-driven email.
6. **Join/leave + governance** — `join_policy`/`visibility`, joinable dropdown, admin controls.
7. **(Later)** leads (`role`), `request` join policy, home teaser widget, digests.

## Open questions / deferred

- **Leads** — exact powers, and whether `request` join policy ships with them.
- **History on join** — joiners see full prior thread history (simplest; assumed yes). Revisit
  if any group is sensitive.
- **Leaving admin-assigned groups** — 403 with "ask an admin" vs a request-to-leave that pings
  admin. Leaning 403 for v1.
- **Sprawl control** — archive/merge for dead member-created groups; auto-hide inactive. Design
  aware, build later.
- **Multi-community** — conversations/participants are keyed by clerk id; when the platform goes
  multi-community, scope conversations by community alongside groups.
