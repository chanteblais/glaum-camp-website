-- Migration 043: Group Collection profile visibility
-- Per-collection toggle for whether a member's groups within the collection are
-- shown on their profile (own /profile + public /members/[id]). Some collections
-- are identity ("Guilds", "Committees" — show them); others are operational
-- ("Shift teams", internal logistics) and shouldn't clutter the profile.
--
-- Default true preserves current behaviour (every group shows on the profile).
-- This governs profile DISPLAY only — distinction facts, attunement, schedule
-- filtering and admin rosters continue to see all group membership.

ALTER TABLE group_collections
  ADD COLUMN IF NOT EXISTS show_on_profile BOOLEAN NOT NULL DEFAULT true;
