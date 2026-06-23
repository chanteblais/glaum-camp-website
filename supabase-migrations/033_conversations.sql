-- Migration 033: Conversations (group messaging — Phase 1)
-- Spec: docs/group-messaging.md
--
-- PURELY ADDITIVE. Introduces a real conversation entity so messaging can support
-- N-participant group threads, and backfills it from the existing strictly-1:1
-- `messages` table. No existing behavior changes: the current derive-on-read DM
-- code keeps working against `messages` untouched. A later phase switches the API
-- over to read through these tables.
--
-- Idempotent: re-running won't duplicate rows (IF NOT EXISTS / ON CONFLICT / guarded UPDATE).

-- ── Conversations ─────────────────────────────────────────────────────────────
-- A DM is a 2-participant `direct` conversation; a group thread is an
-- N-participant `group` conversation bound to a group.
--   group_id   : set iff type='group' (one conversation per group)
--   direct_key : set iff type='direct'; the sorted "a|b" clerk-id pair, so each
--                unordered DM pair maps to exactly one conversation (idempotency +
--                an invariant the app can rely on when resolving-or-creating a DM).
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('direct','group')),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  direct_key  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((type = 'group')  = (group_id   IS NOT NULL)),
  CHECK ((type = 'direct') = (direct_key IS NOT NULL))
);

-- One conversation per group; one per unordered DM pair.
CREATE UNIQUE INDEX IF NOT EXISTS conversations_group_uniq
  ON conversations (group_id)   WHERE group_id   IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_direct_uniq
  ON conversations (direct_key) WHERE direct_key IS NOT NULL;

-- ── Participants ──────────────────────────────────────────────────────────────
-- Per-participant state. last_read_at replaces the row-level read flag for groups
-- (a group message has many recipients, so "have I read this" can't live on the
-- message row). A message is unread for me if created_at > my last_read_at and I'm
-- not its sender. Group threads are quiet by default: email_opt_in starts false.
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  clerk_user_id   TEXT NOT NULL,
  last_read_at    TIMESTAMPTZ,
  muted           BOOLEAN NOT NULL DEFAULT FALSE,
  email_opt_in    BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, clerk_user_id)
);
CREATE INDEX IF NOT EXISTS cp_user_idx ON conversation_participants (clerk_user_id);

-- ── Messages: attach to a conversation; allow one-level reply threads ──────────
-- parent_message_id NULL = top-level channel message; set = a reply in that
-- message's thread (replies never nest further — enforced in app, not schema).
-- recipient_clerk_id becomes nullable: it's meaningless for group messages. It's
-- kept (not dropped) so existing DM code/rows are untouched; a later cleanup
-- migration drops it once nothing reads it.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id   UUID REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES messages(id)      ON DELETE CASCADE;
ALTER TABLE messages ALTER COLUMN recipient_clerk_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_parent_idx       ON messages (parent_message_id) WHERE parent_message_id IS NOT NULL;

-- ── Group governance columns ──────────────────────────────────────────────────
-- join_policy / visibility let admin-structural crews and member-created interest
-- groups coexist. Existing groups default to admin_assigned + listed (today's
-- behavior). role on group_members is unused in v1 but added now so a future
-- "leads" feature needs no migration.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS join_policy TEXT NOT NULL DEFAULT 'admin_assigned'
  CHECK (join_policy IN ('admin_assigned','open','request'));
ALTER TABLE groups ADD COLUMN IF NOT EXISTS visibility  TEXT NOT NULL DEFAULT 'listed'
  CHECK (visibility IN ('listed','hidden'));
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('member','lead'));

-- ── Backfill: one conversation per group, participants from group_members ─────
INSERT INTO conversations (type, group_id)
SELECT 'group', g.id FROM groups g
ON CONFLICT (group_id) WHERE group_id IS NOT NULL DO NOTHING;

INSERT INTO conversation_participants (conversation_id, clerk_user_id)
SELECT c.id, gm.clerk_user_id
FROM conversations c
JOIN group_members gm ON gm.group_id = c.group_id
WHERE c.type = 'group'
ON CONFLICT (conversation_id, clerk_user_id) DO NOTHING;

-- ── Backfill: one direct conversation per unordered DM pair ───────────────────
INSERT INTO conversations (type, direct_key)
SELECT DISTINCT 'direct',
  LEAST(sender_clerk_id, recipient_clerk_id) || '|' || GREATEST(sender_clerk_id, recipient_clerk_id)
FROM messages
WHERE recipient_clerk_id IS NOT NULL
ON CONFLICT (direct_key) WHERE direct_key IS NOT NULL DO NOTHING;

-- Attach existing DM rows to their conversation.
UPDATE messages m
SET conversation_id = c.id
FROM conversations c
WHERE c.type = 'direct'
  AND c.direct_key = LEAST(m.sender_clerk_id, m.recipient_clerk_id) || '|' || GREATEST(m.sender_clerk_id, m.recipient_clerk_id)
  AND m.recipient_clerk_id IS NOT NULL
  AND m.conversation_id IS NULL;

-- Direct participants, with read state preserved: a participant's last_read_at is
-- the newest read_at among messages they *received* (sender appearances contribute
-- NULL, which MAX ignores). Someone who never read anything gets NULL → all unread,
-- matching today's state.
INSERT INTO conversation_participants (conversation_id, clerk_user_id, last_read_at)
SELECT conversation_id, clerk_user_id, MAX(read_at)
FROM (
  SELECT conversation_id, sender_clerk_id    AS clerk_user_id, NULL::timestamptz AS read_at
  FROM messages WHERE conversation_id IS NOT NULL
  UNION ALL
  SELECT conversation_id, recipient_clerk_id AS clerk_user_id, read_at
  FROM messages WHERE conversation_id IS NOT NULL AND recipient_clerk_id IS NOT NULL
) parties
GROUP BY conversation_id, clerk_user_id
ON CONFLICT (conversation_id, clerk_user_id) DO NOTHING;
