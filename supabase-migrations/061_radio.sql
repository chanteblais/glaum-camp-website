-- 061: Radio — the curated community feed (docs/radio.md)
-- Creates radio_events and backfills one welcome post per approved member so
-- the feed is born alive. Additive + idempotent; the backfill guards against
-- double-insertion.
--
-- Radio is NOT an audit log: rows are editorial moments ("Would the average
-- member care?"), each with a headline (message) and an optional supporting
-- line (detail).

CREATE TABLE IF NOT EXISTS radio_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,               -- 'broadcast' | 'welcome' | 'contribution' | 'achievement' | 'milestone' | 'voice' (open set; no CHECK so new kinds need no migration)
  message TEXT NOT NULL,            -- the headline, actor name inline ("Welcome Sarah to Glåüm!")
  detail TEXT,                      -- optional supporting line ("Only one more to go!")
  icon TEXT,                        -- emoji or asset-library image path
  actor_clerk_id TEXT,              -- member the moment is about (avatar joined fresh at read time)
  actor_name TEXT,                  -- display name denormalized at write time (the feed is a historical record)
  link TEXT,                        -- optional internal deep link (e.g. /participate#bring)
  created_by TEXT,                  -- admin clerk_user_id for organizer broadcasts
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS radio_events_created_at_idx
  ON radio_events (created_at DESC);

-- Backfill: every approved member gets their welcome at their approval moment.
-- Idempotent — skips anyone who already has a 'welcome' post.
INSERT INTO radio_events (kind, message, detail, icon, actor_clerk_id, actor_name, created_at)
SELECT
  'welcome',
  'Welcome ' || COALESCE(NULLIF(a.preferred_name, ''), NULLIF(a.first_name, ''), 'a new member') || ' to Glåüm!',
  'Say hello if you see them around camp.',
  '👋',
  a.clerk_user_id,
  COALESCE(NULLIF(a.preferred_name, ''), NULLIF(a.first_name, ''), 'A member'),
  a.reviewed_at
FROM applications a
WHERE a.status = 'approved'
  AND a.reviewed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM radio_events r
    WHERE r.kind = 'welcome'
      AND r.actor_clerk_id = a.clerk_user_id
  );
