-- Add teaching_fee (per period) and periods_per_day to teaching_assignments
ALTER TABLE teaching_assignments
  ADD COLUMN IF NOT EXISTS teaching_fee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS periods_per_day INTEGER DEFAULT 1;
