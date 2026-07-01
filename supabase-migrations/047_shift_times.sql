-- Migration 047: structured start/end times for shift events (enables hours math)
--
-- schedule_events.time is free text ("4:00 – 7:00 PM"), which can't be summed.
-- Shift events now carry a real start_time + end_time; duration is computed in
-- code (lib/shift-hours.ts), and the free-text `time` is kept for display.
--
-- Stored as "HH:MM" 24-hour strings (straight from <input type="time">). Only
-- meaningful for participation_type = 'shift'. Additive; no backfill — existing
-- shift events start NULL and get times when next edited (parsing the old free
-- text would be exactly the fragility we're moving away from).

ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS end_time   TEXT;
