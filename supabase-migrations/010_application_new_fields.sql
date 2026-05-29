-- Migration 010: Add new application fields

ALTER TABLE applications
  -- Basic Info additions
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS referral TEXT,

  -- About You (new section)
  ADD COLUMN IF NOT EXISTS about_you TEXT,
  ADD COLUMN IF NOT EXISTS glaum_acceptance TEXT,
  ADD COLUMN IF NOT EXISTS special_skills TEXT,
  ADD COLUMN IF NOT EXISTS recent_achievements TEXT,
  ADD COLUMN IF NOT EXISTS official_designation TEXT,
  ADD COLUMN IF NOT EXISTS research_interests TEXT,
  ADD COLUMN IF NOT EXISTS known_side_effects TEXT,
  ADD COLUMN IF NOT EXISTS attunement_status TEXT[],
  ADD COLUMN IF NOT EXISTS attunement_status_other TEXT,

  -- Participation additions
  ADD COLUMN IF NOT EXISTS leadership_interest TEXT,
  ADD COLUMN IF NOT EXISTS setup_available TEXT,
  ADD COLUMN IF NOT EXISTS setup_preference TEXT[],
  ADD COLUMN IF NOT EXISTS setup_limitations TEXT[],
  ADD COLUMN IF NOT EXISTS setup_notes TEXT,
  ADD COLUMN IF NOT EXISTS community_contribution TEXT,
  ADD COLUMN IF NOT EXISTS welcome_support TEXT,
  ADD COLUMN IF NOT EXISTS leadership_note TEXT,
  ADD COLUMN IF NOT EXISTS skills_contribution TEXT;
