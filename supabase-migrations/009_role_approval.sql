ALTER TABLE roles ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE camp_signups ADD COLUMN role_approval_status TEXT;
-- role_approval_status: null = no approval needed, 'pending', 'approved', 'rejected'
