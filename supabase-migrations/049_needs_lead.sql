-- Migration 049: Per-event lead opt-in
--
-- Whether a shift / lead-up gathering HAS a lead role is the organizer's call,
-- made when the event is created — some events don't need one (048 made leads
-- possible everywhere, which surfaced "offer to lead" noise on events that
-- never wanted a lead). Members are offered the lead role at signup/RSVP time
-- only when the event asks for one.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS no-ops on re-run. Default false =
-- existing events show no lead UI until an organizer opts them in.

ALTER TABLE schedule_events
  ADD COLUMN IF NOT EXISTS needs_lead BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE lead_up_events
  ADD COLUMN IF NOT EXISTS needs_lead BOOLEAN NOT NULL DEFAULT false;
