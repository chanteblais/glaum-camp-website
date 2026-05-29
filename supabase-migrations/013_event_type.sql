-- Migration 013: Replace all_hands boolean with event_type field
ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS event_type TEXT;
UPDATE schedule_events SET event_type = 'all_hands' WHERE all_hands = true;
