-- 064: Per-night shift signups (docs/shifts-redesign.md → Per-night occurrences).
-- (Renumbered from 063 — 063 was taken by member-suspension on main.)
-- Recurrence is only an admin authoring convenience — each night of a recurring
-- shift is a regular shift in its own right. A signup now names its night via
-- occurrence_date: NULL = the single occurrence of a non-recurring shift; a date
-- = one night of a recurring event (must be one of its recurrence_days, or a day
-- of the configured event range). Additive + idempotent.

ALTER TABLE member_shift_signups ADD COLUMN IF NOT EXISTS occurrence_date DATE;

-- Backfill existing recurring-event holds to the event's anchor date (its first
-- recurrence day) so every recurring hold names a concrete night. Non-recurring
-- holds stay NULL.
UPDATE member_shift_signups m
SET occurrence_date = e.event_date
FROM schedule_events e
WHERE m.schedule_event_id = e.id
  AND e.is_recurring IS TRUE
  AND m.occurrence_date IS NULL;

-- Replace the old whole-event unique with two partial uniques. A plain UNIQUE
-- treats NULLs as distinct, which would let a non-recurring shift be signed
-- twice; partial indexes make each case exact (one hold per night, one hold per
-- non-recurring shift).
ALTER TABLE member_shift_signups
  DROP CONSTRAINT IF EXISTS member_shift_signups_clerk_user_id_schedule_event_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_mss_event_nulldate
  ON member_shift_signups (clerk_user_id, schedule_event_id)
  WHERE occurrence_date IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_mss_event_date
  ON member_shift_signups (clerk_user_id, schedule_event_id, occurrence_date)
  WHERE occurrence_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mss_occurrence_date ON member_shift_signups (occurrence_date);
