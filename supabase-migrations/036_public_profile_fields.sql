-- Migration 036: Curated public-profile fields
--
-- The public member profile (app/members/[id]) shows an "About" paragraph and a
-- "Skills & Gifts" list. These are deliberately SEPARATE from the application
-- answers (about_you / special_skills), which stay admin-only: members curate
-- what they want shown publicly, so nothing private is exposed by the directory.

ALTER TABLE applications
  -- Freeform public bio shown in the profile's About card.
  ADD COLUMN IF NOT EXISTS public_bio TEXT,
  -- Comma-separated skills/gifts, rendered as chips on the public profile.
  ADD COLUMN IF NOT EXISTS public_skills TEXT;
