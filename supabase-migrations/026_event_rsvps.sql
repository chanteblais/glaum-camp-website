-- Migration 026: RSVP support for schedule events
-- One row per member RSVP to a schedule event.

CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_event_id UUID NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_event_id, clerk_user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps (schedule_event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps (clerk_user_id);
