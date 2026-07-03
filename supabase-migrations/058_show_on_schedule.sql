-- 058: Events can be kept off the member schedule page. show_on_schedule TRUE
-- (the default) = today's behavior, existing rows untouched. FALSE = the event
-- skips the schedule page (homepage embed + /schedule) and the home "upcoming
-- events" teaser, but members can still sign up for it / acknowledge it —
-- unlike `visible`, which hides an event from members everywhere.

ALTER TABLE schedule_events
  ADD COLUMN IF NOT EXISTS show_on_schedule boolean NOT NULL DEFAULT true;
