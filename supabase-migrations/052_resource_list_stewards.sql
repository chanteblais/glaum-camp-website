-- Migration 052: Resource-list stewards beyond groups
--
-- A resource list's steward ("who looks after this list") can now be a GROUP,
-- a DEPARTMENT, or a ROLE — e.g. "Shared Kitchen, stewarded by the Department
-- of Nourishment". Modeled as three nullable FKs with an at-most-one check
-- (exclusive arc), keeping real referential integrity per steward type instead
-- of a loose polymorphic type/id pair.
--
-- Stewardship remains DISPLAY CONTEXT ONLY — never a permission gate. This
-- extends who a list can point at, not what stewardship does.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS no-ops on re-run; the constraint is
-- guarded by a pg_constraint existence check.

ALTER TABLE resource_lists
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_lists_one_steward') THEN
    ALTER TABLE resource_lists
      ADD CONSTRAINT resource_lists_one_steward
      CHECK (num_nonnulls(group_id, department_id, role_id) <= 1);
  END IF;
END $$;
