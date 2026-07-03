-- Migration 054: Resource item icons
--
-- Optional icon on a resource item ("camping stove" with the stove art),
-- following the departments.icon idiom: TEXT holding an image reference
-- (asset-library path or an uploaded group-badges URL), rendered via
-- isImageIcon at every site. Shown on the member Bring Something cards,
-- the admin item rows, and the profile BRINGING commitment rows.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS no-ops on re-run.

ALTER TABLE resources ADD COLUMN IF NOT EXISTS icon TEXT;
