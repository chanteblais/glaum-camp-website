ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS event_category TEXT DEFAULT 'at_camp';
