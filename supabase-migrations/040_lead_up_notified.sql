-- Migration 040: track when members were alerted about a lead-up gathering.
-- Set by POST /api/admin/lead-up-events/[id]/notify so the admin manager can
-- show "Notified" and so re-sends are a deliberate choice. See docs/lead-up-gatherings.md.

ALTER TABLE lead_up_events ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
