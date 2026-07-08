-- 067_volunteer_dues.sql
-- Camp dues can be configured to apply to volunteers as well as camp members
-- (page_content.config_dues → audience). Volunteers have no self-serve surface
-- (no /dues, no attunement), so their dues are admin-tracked only: no
-- `dues_reported_at` counterpart. Mirrors the member dues columns (065).
-- Additive, idempotent, non-destructive.
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS dues_paid_at TIMESTAMPTZ;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS dues_paid_by TEXT;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS dues_note    TEXT;
