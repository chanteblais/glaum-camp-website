-- Migration 050: Scrap gathering leads
--
-- Leads are a SHIFTS-ONLY concept now (decided 2026-07-02). The lead-up
-- gathering half of migrations 048/049 is removed: gatherings keep their
-- free-text `host` and the binary RSVP, nothing more. The shifts side
-- (member_shift_signups.role + schedule_events.needs_lead) is untouched.
--
-- DESTRUCTIVE (by design): drops any recorded offers to lead a gathering and
-- the per-gathering needs_lead flags. Idempotent via IF EXISTS.

ALTER TABLE lead_up_event_rsvps DROP COLUMN IF EXISTS role;

ALTER TABLE lead_up_events DROP COLUMN IF EXISTS needs_lead;
