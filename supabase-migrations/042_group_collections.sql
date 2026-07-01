-- Migration 042: Group Collections
-- Generalizes the flat `groups` list into named, configurable collections.
--
-- A Group Collection (e.g. "Contributions", "Volunteer Teams", "Committees",
-- "Guilds") is an organizing container the organizer names. Its child groups
-- (Setup, Decor, Teardown, …) remain the joinable, thread-bearing, badge-bearing
-- leaves — nothing about a `group` changes. The platform no longer knows
-- anything about "Setup"; it only knows there is a configurable collection whose
-- children are the selectable groups.
--
-- Additive & non-breaking: every existing surface (getMemberGroups, apply,
-- messaging, badges, distinctions) keys off leaf `groups`, so adding a container
-- above them changes no behaviour. Existing groups are backfilled into a default
-- collection so current membership is preserved exactly.

CREATE TABLE IF NOT EXISTS group_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  -- How many child groups a member may belong to within this collection:
  --   'multi'  → e.g. Contributions: Setup AND Decor together.
  --   'single' → e.g. Cabin assignment / T-shirt size: exactly one.
  selection TEXT NOT NULL DEFAULT 'multi' CHECK (selection IN ('single', 'multi')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES group_collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_groups_collection ON groups (collection_id);

-- ── Backfill ────────────────────────────────────────────────────────────────
-- Adopt every currently-uncollected group into a single default collection so
-- all existing membership / apply / messaging behaviour is preserved unchanged.
-- The seed name "Contributions" is Glåüm's framing (see docs/generalizability-log.md);
-- other communities rename it or create their own collections.
-- Idempotent: only runs while an orphan group exists, and reuses the collection
-- if it already exists (e.g. on re-run after admin edits).
DO $$
DECLARE
  default_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM groups WHERE collection_id IS NULL) THEN
    SELECT id INTO default_id FROM group_collections WHERE name = 'Contributions' LIMIT 1;
    IF default_id IS NULL THEN
      INSERT INTO group_collections (name, selection, sort_order)
      VALUES ('Contributions', 'multi', 0)
      RETURNING id INTO default_id;
    END IF;
    UPDATE groups SET collection_id = default_id WHERE collection_id IS NULL;
  END IF;
END $$;
