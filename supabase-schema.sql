-- Run this in the Supabase SQL editor to set up the database schema

CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Basic info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  preferred_name TEXT,
  pronouns TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  instagram TEXT,
  location TEXT,
  camped_before TEXT,

  -- What If plans
  attendance TEXT,
  arrival_date TEXT,
  departure_date TEXT,
  camp_relationship TEXT,
  vehicle TEXT,
  space_requirements TEXT,
  structures TEXT,
  rideshare TEXT,

  -- Participation
  contributions TEXT[],
  energizing_participation TEXT,

  -- Capacity & boundaries
  support_needs TEXT,
  accessibility TEXT,
  capacity TEXT,
  participation_style TEXT,

  -- Culture
  draws_to_glaum TEXT,
  healthy_community TEXT,

  -- Acknowledgements
  acknowledgements TEXT[],

  -- Fun
  shrimp_relationship TEXT,

  -- Admin fields
  status TEXT DEFAULT 'pending',  -- pending | approved | rejected | cancelled
  clerk_user_id TEXT,
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  cancel_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  profile_updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
