-- Migration 025: Rename community-specific column names to generic equivalents.
-- These columns had names tied to Glåüm's specific terminology.
-- Existing data is preserved; only the column names change.

ALTER TABLE applications
  RENAME COLUMN glaum_acceptance        TO community_acceptance;

ALTER TABLE applications
  RENAME COLUMN attunement_status       TO onboarding_status;

ALTER TABLE applications
  RENAME COLUMN attunement_status_other TO onboarding_status_other;

ALTER TABLE applications
  RENAME COLUMN draws_to_glaum         TO draws_to_community;

ALTER TABLE applications
  RENAME COLUMN camp_relationship       TO membership_type;
