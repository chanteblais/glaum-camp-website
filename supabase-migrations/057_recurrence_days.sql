-- 057: Recurring events can repeat on chosen dates instead of every day.
-- recurrence_days NULL (the default) = repeats every day of the event range,
-- which is exactly the old behavior — existing rows are untouched. An array
-- of ISO dates ('2026-07-23', ...) = the event repeats on only those days.

ALTER TABLE schedule_events
  ADD COLUMN IF NOT EXISTS recurrence_days text[] DEFAULT NULL;
