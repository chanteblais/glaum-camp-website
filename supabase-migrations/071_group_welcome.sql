-- 071: per-member group welcome notes.
--
-- Adds messages.visible_to: NULL = a normal message every participant sees;
-- set = a private system note only that member sees. Used for the group welcome
-- note ("Welcome to X! ..."), which lands unread so the message badge makes a
-- newly added member aware of the membership — quiet otherwise (no email, no
-- notification rows). System notes use sender_clerk_id = 'system' (not a clerk id).
--
-- Additive + idempotent; no existing rows modified or deleted. NOT destructive.
--
-- ⚠️ APPLY IN TWO PARTS around the deploy (localhost + prod share this DB):
--   PART A (schema)   — BEFORE deploying the code. Harmless to the running old
--                       code (new nullable column nobody selects); the new code
--                       requires it (readers filter on visible_to).
--   PART B (backfill) — AFTER the new code is live. The old code doesn't filter
--                       visible_to, so backfilling earlier would briefly show
--                       everyone's welcome notes to the whole group.
-- Both parts are idempotent — re-running the whole file is always safe.

-- ── PART A — schema (apply BEFORE deploy) ────────────────────────────────────

ALTER TABLE messages ADD COLUMN IF NOT EXISTS visible_to TEXT;

CREATE INDEX IF NOT EXISTS messages_visible_to_idx
  ON messages (visible_to) WHERE visible_to IS NOT NULL;

-- ── PART B — retroactive backfill (apply AFTER deploy) ───────────────────────

-- Safety net: any group still missing its conversation (033 backfilled the ones
-- that existed then; group creation makes them since).
INSERT INTO conversations (type, group_id)
SELECT 'group', g.id
FROM groups g
WHERE NOT EXISTS (SELECT 1 FROM conversations c WHERE c.group_id = g.id);

-- One private welcome per existing membership (skip any member already welcomed,
-- so re-running is a no-op). Keep the body in sync with sendGroupWelcome in
-- lib/conversations.ts.
INSERT INTO messages (conversation_id, sender_clerk_id, sender_name, body, visible_to)
SELECT c.id, 'system', g.name,
       'Welcome to ' || g.name || '! ✦ You''re a member of this group — this is its message thread.',
       gm.clerk_user_id
FROM group_members gm
JOIN groups g ON g.id = gm.group_id
JOIN conversations c ON c.group_id = g.id AND c.type = 'group'
WHERE NOT EXISTS (
  SELECT 1 FROM messages m
  WHERE m.conversation_id = c.id
    AND m.sender_clerk_id = 'system'
    AND m.visible_to = gm.clerk_user_id
);
