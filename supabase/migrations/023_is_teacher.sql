-- ===================================================
-- Add is_teacher flag to users table
-- Allows employees/supervisors to also function as teachers
-- without changing their primary role
-- ===================================================

-- 1. Add the is_teacher column (default false)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_teacher BOOLEAN DEFAULT FALSE;

-- 2. Auto-set is_teacher=true for existing outsource users
UPDATE users SET is_teacher = TRUE WHERE role = 'outsource';

-- 3. Index for quick teacher lookups
CREATE INDEX IF NOT EXISTS idx_users_is_teacher ON users(is_teacher) WHERE is_teacher = TRUE;
