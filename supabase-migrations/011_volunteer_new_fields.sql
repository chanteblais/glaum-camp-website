-- Migration 011: Add new volunteer fields
ALTER TABLE volunteers
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS pronouns TEXT,
  ADD COLUMN IF NOT EXISTS brings_to_glaum TEXT,
  ADD COLUMN IF NOT EXISTS role_interests TEXT[],
  ADD COLUMN IF NOT EXISTS specific_interests TEXT,
  ADD COLUMN IF NOT EXISTS special_skills TEXT,
  ADD COLUMN IF NOT EXISTS familiar_with_glaum BOOLEAN,
  ADD COLUMN IF NOT EXISTS why_contribute TEXT;
