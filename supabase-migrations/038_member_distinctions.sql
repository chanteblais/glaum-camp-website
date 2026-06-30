-- Migration 038: member_distinctions — manually attributed distinctions
--
-- Distinctions are normally DERIVED from facts (lib/distinctions.ts) and never
-- persisted. This table is the exception: it records distinctions an admin grants
-- by HAND (honorary / one-off awards, or overrides). The evaluator unions these
-- with the rule-derived ones — a distinction is earned if its conditions pass OR
-- it appears here for the member. Rules with no conditions are "manual only".
--
-- Run in the Supabase SQL editor. Additive + idempotent; safe on production.

CREATE TABLE IF NOT EXISTS member_distinctions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id      UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  -- Matches DistinctionRule.id in page_content.config_distinctions.
  distinction_id TEXT NOT NULL,
  note           TEXT,
  granted_by     TEXT,                       -- clerk_user_id of the granting admin
  granted_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (member_id, distinction_id)
);

CREATE INDEX IF NOT EXISTS member_distinctions_member_idx ON member_distinctions (member_id);
