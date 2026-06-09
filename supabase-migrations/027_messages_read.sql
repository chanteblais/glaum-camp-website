-- Add an explicit `read` boolean to messages for read receipts.
-- Existing rows: any message that already has a read_at timestamp is read.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE messages SET read = TRUE WHERE read_at IS NOT NULL;
