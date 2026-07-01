-- Migration 046: Shifts redesign — reshape to the corrected model
--
-- Design + rationale: docs/shifts-redesign.md
--
-- 045 wrongly put required-ness ON the shift kind (binding + hours on event_types).
-- The corrected model: a shift *type* is just a requirement-free KIND of shift
-- (some are optional, e.g. Tea). Requirement-ness is authored separately:
--   · conditional → on a group or role (owe N hours of a shift type)
--   · universal   → as an attunement task (everyone owes N hours) — later phase
--
-- This migration:
--   1. shift_types                    — requirement-free kinds of shift
--   2. schedule_events.participation_type ('general'|'shift'|'mandatory') + shift_type_id
--   3. groups/roles                   — OPTIONAL shift requirement (shift_type_id + hours)
--
-- ADDITIVE + backfill. Drops nothing: 045's event_types / event_type_id are left
-- DORMANT (unused by code after this) and removed in the final cleanup migration.
-- Idempotent via backfill_key + IF NOT EXISTS + IS NULL guards.

-- ── 1. Shift types (requirement-free) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_types (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  icon         TEXT,
  sort_order   INT  NOT NULL DEFAULT 0,
  -- Provenance for the idempotent backfill; NULL for admin-created types.
  backfill_key TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Carry the shift-behaved event_types from 045 across, name-preserving. The
-- everyone-bound "Volunteer" type comes too as a plain shift type; its universal
-- requirement becomes an attunement task later, NOT a property of the type.
INSERT INTO shift_types (name, icon, sort_order, backfill_key)
SELECT name, icon, sort_order, 'from_event_type:' || id
FROM event_types
WHERE behavior = 'shift'
ON CONFLICT (backfill_key) DO NOTHING;

-- ── 2. schedule_events: participation type + shift type ──────────────────────
ALTER TABLE schedule_events
  ADD COLUMN IF NOT EXISTS participation_type TEXT NOT NULL DEFAULT 'general'
  CHECK (participation_type IN ('general', 'shift', 'mandatory'));

ALTER TABLE schedule_events
  ADD COLUMN IF NOT EXISTS shift_type_id UUID REFERENCES shift_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_events_shift_type ON schedule_events (shift_type_id);

-- Backfill from 045's event_type_id + behavior (only where not already reshaped).
UPDATE schedule_events se
SET participation_type = 'shift', shift_type_id = st.id
FROM event_types et
JOIN shift_types st ON st.backfill_key = 'from_event_type:' || et.id
WHERE se.event_type_id = et.id AND et.behavior = 'shift' AND se.shift_type_id IS NULL;

UPDATE schedule_events se
SET participation_type = 'mandatory'
FROM event_types et
WHERE se.event_type_id = et.id AND et.behavior = 'mandatory' AND se.participation_type = 'general';

-- (general is the column default, so behavior='general' needs no explicit update.)

-- ── 3. Optional shift requirement on groups + roles ──────────────────────────
ALTER TABLE groups ADD COLUMN IF NOT EXISTS required_shift_type_id UUID REFERENCES shift_types(id) ON DELETE SET NULL;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS required_shift_hours   NUMERIC(4, 1);
ALTER TABLE roles  ADD COLUMN IF NOT EXISTS required_shift_type_id UUID REFERENCES shift_types(id) ON DELETE SET NULL;
ALTER TABLE roles  ADD COLUMN IF NOT EXISTS required_shift_hours   NUMERIC(4, 1);

-- Backfill group requirements from 045's group-bound shift types: a Setup type
-- bound to the Setup group ⇒ the Setup group requires that shift type + hours.
UPDATE groups g
SET required_shift_type_id = st.id, required_shift_hours = et.required_hours
FROM event_types et
JOIN shift_types st ON st.backfill_key = 'from_event_type:' || et.id
WHERE et.behavior = 'shift' AND et.binding_type = 'group' AND et.binding_id = g.id
  AND g.required_shift_type_id IS NULL;

-- ── Post-apply verification (run manually) ───────────────────────────────────
-- Shift types carried over (expect Setup/Teardown/Decor/Volunteer):
--   SELECT name FROM shift_types ORDER BY sort_order;
-- Every previously-shift event now has a shift_type_id:
--   SELECT count(*) FROM schedule_events WHERE participation_type = 'shift' AND shift_type_id IS NULL;  -- expect 0
-- Group requirements backfilled (expect Setup/Teardown/Decor rows):
--   SELECT g.name, st.name AS shift_type, g.required_shift_hours
--   FROM groups g JOIN shift_types st ON st.id = g.required_shift_type_id;
