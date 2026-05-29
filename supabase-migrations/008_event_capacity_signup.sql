-- Optional capacity on schedule events (null = unlimited / no signup)
ALTER TABLE schedule_events ADD COLUMN capacity INTEGER;

-- Link camp signups to a schedule event (replaces shift_id for calendar-based signup)
ALTER TABLE camp_signups ADD COLUMN schedule_event_id UUID REFERENCES schedule_events(id) ON DELETE SET NULL;
