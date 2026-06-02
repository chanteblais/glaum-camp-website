-- Migration 023: Add custom_answers column to applications
-- Stores answers to admin-added custom application sections

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS custom_answers JSONB;
