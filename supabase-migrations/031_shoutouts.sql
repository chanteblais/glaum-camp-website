-- Migration 031: Shoutouts
-- Member-posted shoutouts shown on the home-page member dashboard.
-- Any approved member can post; members can delete their own posts, admins any.

CREATE TABLE IF NOT EXISTS shoutouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,                 -- author identity (join to applications in JS)
  author_name TEXT NOT NULL,                   -- display name snapshot at post time
  body TEXT NOT NULL CHECK (char_length(body) <= 250 AND char_length(btrim(body)) > 0),
  visible BOOLEAN NOT NULL DEFAULT true,        -- reserved for future moderation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shoutouts_created ON shoutouts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shoutouts_user ON shoutouts (clerk_user_id);
