-- Tag schedule events with a contribution type so they appear on the personal
-- schedule of users who have that contribution (Setup, Teardown, Decor).
ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS contribution_type TEXT;
