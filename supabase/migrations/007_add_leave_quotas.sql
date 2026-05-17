-- Add leave quota columns to users table
ALTER TABLE users ADD COLUMN sick_quota INTEGER DEFAULT 30;
ALTER TABLE users ADD COLUMN personal_quota INTEGER DEFAULT 6;
ALTER TABLE users ADD COLUMN vacation_quota INTEGER DEFAULT 6;

-- Update existing users with default values
UPDATE users SET sick_quota = 30, personal_quota = 6, vacation_quota = 6;
