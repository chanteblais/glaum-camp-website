-- Migration 030: Groups
-- Configurable groups (e.g. Setup, Teardown, Decor) that members belong to.
-- Phase 1: additive. Admins create/assign; applicants can optionally opt in
-- on the application form (per-group `apply_selectable` flag).
-- The existing contribution-types (`setup_preference`) machinery is left intact
-- for now and is retired in Phase 2.

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  apply_selectable BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'admin',   -- 'admin' | 'application'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, clerk_user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members (clerk_user_id);

-- ── Backfill ────────────────────────────────────────────────────────────────
-- Seed one group per distinct contribution value members have actually picked,
-- then carry each approved member's selections over as 'application' memberships.
-- Idempotent: re-running won't duplicate groups or memberships.

INSERT INTO groups (name, apply_selectable, sort_order)
SELECT v.name, true, (ROW_NUMBER() OVER (ORDER BY v.name) - 1)::int
FROM (
  SELECT DISTINCT TRIM(pref) AS name
  FROM applications a
  CROSS JOIN LATERAL UNNEST(a.setup_preference) AS pref
  WHERE a.setup_preference IS NOT NULL
    AND TRIM(pref) <> ''
) v
WHERE NOT EXISTS (SELECT 1 FROM groups g WHERE g.name = v.name);

INSERT INTO group_members (group_id, clerk_user_id, source)
SELECT g.id, a.clerk_user_id, 'application'
FROM applications a
CROSS JOIN LATERAL UNNEST(a.setup_preference) AS pref
JOIN groups g ON g.name = TRIM(pref)
WHERE a.clerk_user_id IS NOT NULL
  AND a.status = 'approved'
  AND TRIM(pref) <> ''
ON CONFLICT (group_id, clerk_user_id) DO NOTHING;
