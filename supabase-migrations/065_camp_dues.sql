-- 065_camp_dues.sql
-- Camp dues. This year dues are collected manually (by email / e-transfer);
-- a Stripe integration is a future TODO that will write the same `dues_paid_at`.
--
-- Per-member paid state mirrors the suspension columns (063): a timestamp that
-- is non-NULL exactly when the member's dues are recorded paid, who marked it,
-- and an optional free-text note (amount / method, e.g. "$50 e-transfer Jul 3").
-- Additive, idempotent, non-destructive.
ALTER TABLE members ADD COLUMN IF NOT EXISTS dues_paid_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS dues_paid_by TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS dues_note    TEXT;
