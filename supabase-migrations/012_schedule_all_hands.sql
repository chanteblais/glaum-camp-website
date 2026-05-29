-- Migration 012: Add all_hands flag to schedule_events
ALTER TABLE schedule_events
  ADD COLUMN IF NOT EXISTS all_hands BOOLEAN NOT NULL DEFAULT FALSE;
