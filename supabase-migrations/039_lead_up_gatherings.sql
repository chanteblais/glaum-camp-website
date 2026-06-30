-- Migration 039: Lead-Up Gatherings
-- Real-dated planning/brainstorming sessions on the runway to the event,
-- kept separate from the at-camp `schedule_events` program so none of the camp
-- machinery (group matching, capacity-per-role, attunement) leaks onto them.
-- See docs/lead-up-gatherings.md.

CREATE TABLE IF NOT EXISTS lead_up_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,            -- real calendar date (not a camp-relative slot label)
  start_time TEXT,            -- display time string, e.g. "7:00 PM"
  end_time TEXT,              -- optional display end time
  location TEXT,              -- physical place (optional)
  link TEXT,                  -- virtual link, e.g. Zoom/Meet (optional)
  host TEXT,                  -- who's running it (optional)
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_up_events_date ON lead_up_events (event_date);

-- Per-session RSVP. Presence of a row = "I'll be at this planning session."
-- `status` defaults to 'going' and exists so a future three-state RSVP
-- (going / maybe / not_going) needs no migration. This never touches attunement,
-- shifts, or camp signup.
CREATE TABLE IF NOT EXISTS lead_up_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_up_event_id UUID NOT NULL REFERENCES lead_up_events(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'going',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lead_up_event_id, clerk_user_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_up_rsvps_event ON lead_up_event_rsvps (lead_up_event_id);
CREATE INDEX IF NOT EXISTS idx_lead_up_rsvps_user ON lead_up_event_rsvps (clerk_user_id);
