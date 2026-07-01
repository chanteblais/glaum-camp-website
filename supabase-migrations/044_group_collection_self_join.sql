-- Migration 044: Group Collection self-join
-- Splits the two concerns that `show_on_profile` (migration 043) was overloading.
-- Now two INDEPENDENT collection-level toggles:
--   * show_on_profile — whether a member's groups here appear on their profile
--     (own /profile + public /members/[id]). Display only. (043, unchanged.)
--   * self_join       — whether members may self-join the collection's groups on
--     the Participate page (/signup → "Your Contributions"). Eligibility only.
--
-- Self-join eligibility used to be a per-GROUP flag (`groups.apply_selectable`)
-- AND'd with `show_on_profile`. It is now a single collection-level flag: every
-- group in a self-join collection is self-joinable; profile display is orthogonal.
--
-- Default false (opt-in): no collection silently exposes self-join. Backfill
-- preserves prior intent — any collection that had a self-joinable group under
-- the old model (a member-opt-in group in a profile-visible collection) is
-- switched on so current behaviour is not lost.

ALTER TABLE group_collections
  ADD COLUMN IF NOT EXISTS self_join BOOLEAN NOT NULL DEFAULT false;

UPDATE group_collections c
SET self_join = true
WHERE c.show_on_profile = true
  AND EXISTS (
    SELECT 1 FROM groups g
    WHERE g.collection_id = c.id AND g.apply_selectable = true
  );

-- `groups.apply_selectable` is now dormant (no longer read by the self-join gate
-- and never surfaced in the admin UI). Left in place to avoid a destructive drop;
-- can be removed in a later migration once confirmed unused.
