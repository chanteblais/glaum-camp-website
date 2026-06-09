-- Notification preferences per member.
-- One row per Clerk user. Absent row == all defaults ON.

CREATE TABLE IF NOT EXISTS notification_preferences (
  clerk_user_id        TEXT PRIMARY KEY,
  email_new_message    BOOLEAN NOT NULL DEFAULT TRUE,
  email_announcements  BOOLEAN NOT NULL DEFAULT TRUE,
  email_application    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Throttle: remember when we last emailed a user about a new message so we
-- don't send one email per message in an active conversation.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
