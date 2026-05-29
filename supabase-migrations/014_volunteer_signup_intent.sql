-- Add signup_intent to volunteers
-- Values: 'shift' | 'role' | 'other' | NULL (null = not specified, shows both tasks)
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS signup_intent TEXT;
