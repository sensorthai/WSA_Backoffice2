-- Add has_teaching_fee column to teaching_logs table
ALTER TABLE teaching_logs
  ADD COLUMN IF NOT EXISTS has_teaching_fee BOOLEAN DEFAULT TRUE;
