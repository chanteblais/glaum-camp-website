-- Migration 032: snapshot the sender's display name onto each message.
-- Lets historical conversations keep a readable name even after the sender's
-- application is deleted (the messages table has no FK to applications).

ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Backfill existing rows from the current application name where still available.
UPDATE messages m
SET sender_name = COALESCE(NULLIF(TRIM(a.preferred_name), ''), NULLIF(TRIM(a.first_name), ''))
FROM applications a
WHERE a.clerk_user_id = m.sender_clerk_id
  AND m.sender_name IS NULL;
