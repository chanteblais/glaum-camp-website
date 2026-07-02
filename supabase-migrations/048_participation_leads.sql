-- Migration 048: Participation leads
--
-- Members can offer to lead the things they join. "Lead" is a flavor of
-- PARTICIPATION, not a property of the event: the role lives on the signup/RSVP
-- row itself, so it vanishes with the signup (no dangling lead_user_id on the
-- event) and co-leads are simply multiple rows with role='lead'. This mirrors
-- the role idiom planned for group_members (docs/group-messaging.md).
--
-- Applies to the two run-something surfaces — shifts and lead-up gatherings.
-- General event_rsvps are deliberately excluded ("lead" on a dinner RSVP is
-- noise). Leads are display-only for now: no permissions attach to the role.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS no-ops on re-run.

ALTER TABLE member_shift_signups
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('member', 'lead'));

ALTER TABLE lead_up_event_rsvps
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('member', 'lead'));
