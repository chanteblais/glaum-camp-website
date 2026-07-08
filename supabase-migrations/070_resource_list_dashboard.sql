-- Member-owned Shared Resources: per-list opt-in to the home dashboard.
-- The "Bring Something" dashboard widget now shows a compact row per list, but
-- only for lists a member has opted in (default OFF). Separate from `visible`
-- (which governs the /participate board). Additive + non-destructive.
ALTER TABLE resource_lists
  ADD COLUMN IF NOT EXISTS show_on_dashboard BOOLEAN NOT NULL DEFAULT false;
