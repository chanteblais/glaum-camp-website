-- Migration 045: Schedule & shifts redesign — schema + backfill (Phase 1 of 6)
--
-- Design + rationale: docs/shifts-redesign.md
--
-- This migration is ADDITIVE and BACKFILL-ONLY. It drops nothing and does not
-- change any behaviour on its own — the current code keeps reading the old
-- columns (`event_type`, `contribution_type`, `capacity`, `all_hands`) until the
-- later phases rewire admin/member/attunement. The dead `shifts` table,
-- `camp_signups.shift_id`, and the now-redundant legacy columns are removed in a
-- follow-up migration (046) once this is verified live. This two-step keeps a
-- safe rollback on prod.
--
-- Model (decided 2026-07-01):
--   * event_types           — configurable registry; every event has a type.
--                             Each type is one of 3 fixed behaviours:
--                             general | shift | mandatory.
--   * a `shift` type carries a binding (everyone | group | role | department)
--     + required_hours → this is what creates a contribution requirement.
--   * schedule_events.event_type_id — the single driver (replaces the loose
--     event_type / contribution_type text columns).
--   * schedule_events.requires_ack — per-event ack toggle, meaningful only when
--     the type is `mandatory` (decided: per-event, not per-type).
--   * member_shift_signups — many-to-many (replaces single
--     camp_signups.schedule_event_id), keyed by clerk_user_id to match
--     group_members / camp_signups.
--
-- Idempotent: re-running will not duplicate types, re-key events, or duplicate
-- signups. Seeded types carry a `backfill_key` so provenance is traceable and
-- ON CONFLICT can no-op; admin-created types leave it NULL.

-- ── 1. Event-type registry ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_types (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  behavior       TEXT NOT NULL CHECK (behavior IN ('general', 'shift', 'mandatory')),
  -- Shift-only. Who owes this shift type:
  binding_type   TEXT CHECK (binding_type IN ('everyone', 'group', 'role', 'department')),
  binding_id     UUID,                      -- FK target depends on binding_type; NULL for 'everyone'
  required_hours NUMERIC(4, 1),             -- hours owed per member (NULL for non-shift types)
  icon           TEXT,
  sort_order     INT  NOT NULL DEFAULT 0,
  -- Provenance for the idempotent backfill below; NULL for admin-created types.
  backfill_key   TEXT UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_types_behavior ON event_types (behavior);

-- ── 2. schedule_events: point at a type + per-event ack ──────────────────────

ALTER TABLE schedule_events
  ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL;

ALTER TABLE schedule_events
  ADD COLUMN IF NOT EXISTS requires_ack BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_schedule_events_event_type ON schedule_events (event_type_id);

-- ── 3. Many-to-many shift signups ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS member_shift_signups (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id      TEXT NOT NULL,
  schedule_event_id  UUID NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clerk_user_id, schedule_event_id)
);

CREATE INDEX IF NOT EXISTS idx_member_shift_signups_user  ON member_shift_signups (clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_member_shift_signups_event ON member_shift_signups (schedule_event_id);

-- ── 4. Seed event types from existing data ───────────────────────────────────
-- NOTE: required_hours is seeded to a PLACEHOLDER of 1.0 for shift types. Real
-- hour targets are set by the organiser in the Configure → Event Types UI
-- (Phase 2). Nothing enforces these hours until attunement is rewired (Phase 5),
-- so the placeholder is inert until then.

-- 4a. One `shift` type per distinct contribution crew present on events, bound to
--     the matching group by name (case-insensitive). If no group matches, the
--     type is still created with binding_type='group' and a NULL binding_id for
--     the admin to fix — flagged by the placeholder name.
INSERT INTO event_types (name, behavior, binding_type, binding_id, required_hours, sort_order, backfill_key)
SELECT
  ct.contribution_type,
  'shift',
  'group',
  g.id,
  1.0,
  ROW_NUMBER() OVER (ORDER BY ct.contribution_type) - 1,
  'crew:' || ct.contribution_type
FROM (
  SELECT DISTINCT contribution_type
  FROM schedule_events
  WHERE contribution_type IS NOT NULL AND contribution_type <> ''
) ct
LEFT JOIN groups g ON LOWER(g.name) = LOWER(ct.contribution_type)
ON CONFLICT (backfill_key) DO NOTHING;

-- 4b. The everyone-bound "Volunteer" shift type (covers capacity slots that carry
--     no contribution crew — the required-of-all shift).
INSERT INTO event_types (name, behavior, binding_type, binding_id, required_hours, sort_order, backfill_key)
VALUES ('Volunteer', 'shift', 'everyone', NULL, 1.0, 100, 'everyone:volunteer')
ON CONFLICT (backfill_key) DO NOTHING;

-- 4c. A single `mandatory` type for existing all-hands events.
INSERT INTO event_types (name, behavior, binding_type, binding_id, required_hours, sort_order, backfill_key)
VALUES ('Mandatory', 'mandatory', NULL, NULL, NULL, 200, 'mandatory')
ON CONFLICT (backfill_key) DO NOTHING;

-- 4d. General types — preserve distinct non-all-hands event_type tags
--     (e.g. camp_tending, service) as named general types, plus a base
--     "General" for untyped events. This keeps display data lossless.
INSERT INTO event_types (name, behavior, sort_order, backfill_key)
SELECT
  et.event_type,
  'general',
  300 + (ROW_NUMBER() OVER (ORDER BY et.event_type) - 1),
  'general:' || et.event_type
FROM (
  SELECT DISTINCT event_type
  FROM schedule_events
  WHERE event_type IS NOT NULL AND event_type <> '' AND event_type <> 'all_hands'
) et
ON CONFLICT (backfill_key) DO NOTHING;

INSERT INTO event_types (name, behavior, sort_order, backfill_key)
VALUES ('General', 'general', 299, 'general')
ON CONFLICT (backfill_key) DO NOTHING;

-- ── 5. Assign event_type_id to every existing event ──────────────────────────
-- Priority (only sets rows where event_type_id IS NULL, so re-runs and later
-- admin edits are never clobbered):
--   1. capacity IS NOT NULL  → a signable shift slot
--        · contribution_type set → that crew's shift type
--        · else                  → Volunteer (everyone) shift type
--   2. all-hands             → Mandatory type
--   3. otherwise             → matching general type (tag or base General)

-- 5.1 Capacity + contribution crew → crew shift type
UPDATE schedule_events se
SET event_type_id = et.id
FROM event_types et
WHERE se.event_type_id IS NULL
  AND se.capacity IS NOT NULL
  AND se.contribution_type IS NOT NULL AND se.contribution_type <> ''
  AND et.backfill_key = 'crew:' || se.contribution_type;

-- 5.2 Capacity, no crew → Volunteer (everyone) shift type
UPDATE schedule_events se
SET event_type_id = et.id
FROM event_types et
WHERE se.event_type_id IS NULL
  AND se.capacity IS NOT NULL
  AND (se.contribution_type IS NULL OR se.contribution_type = '')
  AND et.backfill_key = 'everyone:volunteer';

-- 5.3 All-hands (via event_type tag or legacy boolean) → Mandatory
UPDATE schedule_events se
SET event_type_id = et.id
FROM event_types et
WHERE se.event_type_id IS NULL
  AND (se.event_type = 'all_hands' OR se.all_hands = TRUE)
  AND et.backfill_key = 'mandatory';

-- 5.4 Remaining tagged general events → matching named general type
UPDATE schedule_events se
SET event_type_id = et.id
FROM event_types et
WHERE se.event_type_id IS NULL
  AND se.event_type IS NOT NULL AND se.event_type <> '' AND se.event_type <> 'all_hands'
  AND et.backfill_key = 'general:' || se.event_type;

-- 5.5 Everything left → base General
UPDATE schedule_events se
SET event_type_id = et.id
FROM event_types et
WHERE se.event_type_id IS NULL
  AND et.backfill_key = 'general';

-- ── 6. Carry existing signups into the many-to-many table ────────────────────
INSERT INTO member_shift_signups (clerk_user_id, schedule_event_id)
SELECT clerk_user_id, schedule_event_id
FROM camp_signups
WHERE schedule_event_id IS NOT NULL
ON CONFLICT (clerk_user_id, schedule_event_id) DO NOTHING;

-- ── Post-apply verification (run manually; expect zero problem rows) ──────────
-- Every event should now have a type:
--   SELECT count(*) FROM schedule_events WHERE event_type_id IS NULL;      -- expect 0
-- Crew shift types that failed to bind to a group (need admin attention):
--   SELECT name FROM event_types WHERE backfill_key LIKE 'crew:%' AND binding_id IS NULL;
-- Signup counts should match:
--   SELECT (SELECT count(*) FROM camp_signups WHERE schedule_event_id IS NOT NULL) AS old,
--          (SELECT count(*) FROM member_shift_signups) AS new;            -- expect equal
