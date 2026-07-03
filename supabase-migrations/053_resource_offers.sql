-- Migration 053: Open-ended resource offers
--
-- Members can offer gear that isn't listed ("I have a guitar amp — useful?").
-- An offer is just an item WITHOUT a target: quantity_needed becomes nullable
-- (NULL = open callout, no set need) and offered_by records the member who
-- listed it (NULL = admin-authored). The offerer's own claim row is created
-- with the offer, and others can pile on with normal claims. No approval
-- queue — an offer is a listing, not a request; admins edit a useful offer
-- into a real need (set a target) or delete noise.
--
-- The existing CHECK (quantity_needed >= 1) already passes NULL, so only the
-- NOT NULL constraint moves. Idempotent: DROP NOT NULL and ADD COLUMN IF NOT
-- EXISTS both no-op on re-run.

ALTER TABLE resources ALTER COLUMN quantity_needed DROP NOT NULL;

ALTER TABLE resources ADD COLUMN IF NOT EXISTS offered_by TEXT;
