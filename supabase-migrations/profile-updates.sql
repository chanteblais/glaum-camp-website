-- Run in Supabase SQL editor to enable profile edits, cancellations, and admin notifications.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ;

-- status: pending | approved | rejected | cancelled

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS admin_notifications_unread_idx
  ON admin_notifications (created_at DESC)
  WHERE read_at IS NULL;
