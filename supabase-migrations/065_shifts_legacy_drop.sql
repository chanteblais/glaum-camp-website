-- 065: Shifts-redesign final cleanup (docs/shifts-redesign.md → Phase 7).
--
-- The deliberately-deferred second half of the two-step drop decided 2026-07-01:
-- 045/046 added the new shape + backfilled and the redesign has since been
-- live-verified (per-night signups shipped via 064), so the dead legacy pieces
-- can now go. Code stopped reading/writing everything dropped here in the same
-- commit — deploy that code first (it runs fine against a pre-065 database; it
-- simply ignores these columns), then apply this migration.
--
-- ⚠️ DESTRUCTIVE + irreversible: drops two tables and six columns, discarding
-- any values still in them. Everything dropped is either dead (nothing read it)
-- or was backfilled into the new shape by 045/046. Idempotent (IF EXISTS
-- everywhere), so a partial run can be re-applied safely.

-- ── 0. Defensive backfill before the drop ────────────────────────────────────
-- 045 backfilled legacy holds into member_shift_signups, but /api/signup could
-- still write camp_signups.schedule_event_id after 045 was applied — so a hold
-- created through that path since then would exist ONLY in the legacy column
-- and be silently lost by the drop below. Rescue any such orphan first
-- (recurring events anchor to event_date, non-recurring stay NULL — the exact
-- convention 064's own backfill used). No-op when there are no orphans;
-- idempotent via the NOT EXISTS guard.
INSERT INTO member_shift_signups (clerk_user_id, schedule_event_id, occurrence_date)
SELECT cs.clerk_user_id,
       cs.schedule_event_id,
       CASE WHEN e.is_recurring IS TRUE THEN e.event_date ELSE NULL END
FROM camp_signups cs
JOIN schedule_events e ON e.id = cs.schedule_event_id
WHERE cs.schedule_event_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_shift_signups m
    WHERE m.clerk_user_id = cs.clerk_user_id
      AND m.schedule_event_id = cs.schedule_event_id
  );

-- ── 1. Legacy single-shift columns on camp_signups ────────────────────────────
-- A member's shifts live in member_shift_signups (many-to-many, per-night since
-- 064). shift_id pointed at the dead pre-2026-06-23 shifts table; the single
-- schedule_event_id was superseded by 045's backfill into member_shift_signups
-- (+ the rescue above). camp_signups itself STAYS — it still carries the
-- member's role (role_id / role_approval_status).
ALTER TABLE camp_signups DROP COLUMN IF EXISTS shift_id;           -- destructive
ALTER TABLE camp_signups DROP COLUMN IF EXISTS schedule_event_id;  -- destructive

-- ── 2. Dead shifts table ──────────────────────────────────────────────────────
-- Orphaned since its admin UI was deleted 2026-06-23 (commit a4efcf1); its last
-- reader, /api/admin/shifts, is removed in this commit's code.
DROP TABLE IF EXISTS shifts;                                       -- destructive

-- ── 3. Migration 045's dormant event-type registry ────────────────────────────
-- The first redesign model put behaviour + binding + hours on an event_types
-- registry; the same-day correction (046) replaced it with shift_types +
-- schedule_events.participation_type and left 045's shape dormant. No code ever
-- shipped reading it. Column (and its FK) first, then the table.
DROP INDEX IF EXISTS idx_schedule_events_event_type;               -- (index on event_type_id)
ALTER TABLE schedule_events DROP COLUMN IF EXISTS event_type_id;   -- destructive
DROP INDEX IF EXISTS idx_event_types_behavior;
DROP TABLE IF EXISTS event_types;                                  -- destructive

-- ── 4. Legacy categorical columns on schedule_events ──────────────────────────
-- All four are absorbed by the redesign's participation_type + shift_type_id
-- (046) — the compat shim (lib/event-type-compat.ts) that kept deriving them on
-- every admin write is deleted in this commit:
--   · contribution_type (016) — Setup/Teardown/Decor tag → shift_type_id
--   · event_type        (013) — ''/all_hands/camp_tending/service text →
--                               participation_type ('mandatory' = old all_hands)
--   · all_hands         (012) — boolean predecessor of event_type
--   · event_category    (021) — at_camp/pre_camp; pre_camp superseded by the
--                               lead_up_events table (039)
ALTER TABLE schedule_events DROP COLUMN IF EXISTS contribution_type; -- destructive
ALTER TABLE schedule_events DROP COLUMN IF EXISTS event_type;        -- destructive
ALTER TABLE schedule_events DROP COLUMN IF EXISTS all_hands;         -- destructive
ALTER TABLE schedule_events DROP COLUMN IF EXISTS event_category;    -- destructive
