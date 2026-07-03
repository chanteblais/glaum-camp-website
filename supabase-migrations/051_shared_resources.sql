-- Migration 051: Shared resources
--
-- Communities coordinate physical objects members bring to the event (stoves,
-- coolers, shade structures). Resources are a first-class concept: an admin
-- authors NEEDS (items with a target quantity, organized into named lists);
-- members meet them with one-click CLAIMS ("I'll bring one"). Totals are always
-- derived from claim rows, never stored — same rule as distinctions.
--
-- Deliberately simple (see docs/shared-resources.md → Non-goals):
--   • Lists are community-scoped. The single optional group_id marks a
--     "stewarding" group for display; it is NOT a permission gate and NOT a
--     polymorphic owner (no department/event owners — departments aren't an
--     entity, and event scoping is a multi-tenant concern, logged).
--   • One claim row per member per resource, carrying a quantity — someone
--     bringing three coolers is one row with quantity 3, not three rows.
--   • A claim IS the confirmation. No pledge→confirm workflow.
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS no-op on re-run.

CREATE TABLE IF NOT EXISTS resource_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  -- Optional stewarding group ("Setup Team looks after this list") — display
  -- context only. Deleting the group keeps the list, unlinked.
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES resource_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  note TEXT,
  quantity_needed INT NOT NULL DEFAULT 1 CHECK (quantity_needed >= 1),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resource_id, clerk_user_id)
);

CREATE INDEX IF NOT EXISTS idx_resources_list ON resources (list_id);
CREATE INDEX IF NOT EXISTS idx_resource_claims_resource ON resource_claims (resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_claims_user ON resource_claims (clerk_user_id);
