CREATE TABLE messages (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_clerk_id   TEXT NOT NULL,
  recipient_clerk_id TEXT NOT NULL,
  body              TEXT NOT NULL CHECK (char_length(body) <= 2000),
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_recipient_idx ON messages (recipient_clerk_id, created_at DESC);
CREATE INDEX messages_sender_idx    ON messages (sender_clerk_id, created_at DESC);
