-- Migration 037: members + member_profiles  (Phase 1 of profile-as-source-of-truth)
--
-- See docs/profile-architecture.md. Splits the two roles `applications` plays
-- today — submission/review artifact vs. canonical identity+profile record —
-- into dedicated tables:
--   • members          — canonical identity (one row per person)
--   • member_profiles  — configurable profile values (1:1), keyed by the
--                        registry field key (page_content.config_profile_fields)
--
-- This migration is ADDITIVE. Nothing reads these tables yet — Phase 1 only
-- backfills them and the app dual-writes. Reads stay on `applications` until
-- later phases. Safe to run on production; re-runnable (idempotent).
--
-- Run in the Supabase SQL editor.

-- ── members ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Identity. clerk_user_id is the stable join key once the account exists;
  -- nullable until first sign-in (multiple NULLs allowed by Postgres UNIQUE).
  clerk_user_id  TEXT UNIQUE,
  email          TEXT,
  -- Locked core identity columns — queried for display everywhere, kept as real
  -- columns (not in the JSONB values bag).
  first_name     TEXT,
  last_name      TEXT,
  preferred_name TEXT,
  pronouns       TEXT,
  phone          TEXT,
  avatar_url     TEXT,
  -- Membership gate that applications.status carries today; becomes the canonical
  -- status the app reads in Phase 5. pending | approved | rejected | cancelled.
  status         TEXT DEFAULT 'pending',
  -- Originating application (nullable; SET NULL if that application is deleted).
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS members_email_idx ON members (lower(email));
CREATE INDEX IF NOT EXISTS members_application_idx ON members (application_id);

-- ── member_profiles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_profiles (
  member_id  UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  -- Profile values keyed by registry field key, e.g. {"eventExperience":["2024"]}.
  values     JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- One member per distinct person (by clerk_user_id, else lower(email)), taking
-- the most recent application's identity. Guarded so re-running is a no-op.
INSERT INTO members (
  clerk_user_id, email, first_name, last_name, preferred_name,
  pronouns, phone, avatar_url, status, application_id, created_at
)
SELECT DISTINCT ON (COALESCE(a.clerk_user_id, lower(a.email)))
  a.clerk_user_id, a.email, a.first_name, a.last_name, a.preferred_name,
  a.pronouns, a.phone, a.avatar_url, a.status, a.id, a.submitted_at
FROM applications a
WHERE NOT EXISTS (
  SELECT 1 FROM members m
  WHERE (a.clerk_user_id IS NOT NULL AND m.clerk_user_id = a.clerk_user_id)
     OR (m.email IS NOT NULL AND lower(m.email) = lower(a.email))
)
ORDER BY COALESCE(a.clerk_user_id, lower(a.email)), a.submitted_at DESC;

-- Seed each member's profile from the application's already-keyed custom answers.
-- Typed built-in columns (about_you, special_skills, …) stay in `applications`
-- and are migrated field-by-field in Phase 3, once their registry fields exist
-- with matching keys.
INSERT INTO member_profiles (member_id, values)
SELECT m.id, COALESCE(a.custom_answers, '{}'::jsonb)
FROM members m
JOIN applications a ON a.id = m.application_id
ON CONFLICT (member_id) DO NOTHING;
