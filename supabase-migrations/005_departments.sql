-- Departments: groupings that contain roles
CREATE TABLE departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link roles to departments
ALTER TABLE roles ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE CASCADE;
