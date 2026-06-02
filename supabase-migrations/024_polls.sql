-- Polls feature
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  visible BOOLEAN NOT NULL DEFAULT true,
  allow_multiple BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, clerk_user_id, option_index)
);

CREATE INDEX IF NOT EXISTS poll_votes_poll_id_idx ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS poll_votes_user_idx ON poll_votes(clerk_user_id);
