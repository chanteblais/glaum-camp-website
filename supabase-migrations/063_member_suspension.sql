-- 063: Member suspension.
--
-- A member (or an admin acting on their behalf) can suspend their attendance:
-- ALL their commitments are released — role, groups, shifts, and shared-resource
-- claims — and the join endpoints refuse new ones until the suspension is lifted,
-- but they keep full read access to the site and their status stays 'approved'.
-- Suspension is deliberately orthogonal to members.status so every existing
-- "approved member" gate keeps working unchanged.
--
-- suspended_at IS NOT NULL  = currently suspended
-- suspended_by              = clerk_user_id of who suspended (== the member's
--                             own id for self-suspension, an admin's otherwise)
-- suspension_note           = optional note left at suspension time
--
-- Additive + idempotent. Non-destructive.

ALTER TABLE members ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS suspended_by TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS suspension_note TEXT;
