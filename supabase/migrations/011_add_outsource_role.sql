-- Add 'outsource' to the role CHECK constraint on users table
-- First, drop the old constraint, then add the updated one

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'employee', 'supervisor', 'ceo', 'outsource'));
