-- Add schedule_dates column for specific teaching dates
ALTER TABLE teaching_assignments 
  ADD COLUMN IF NOT EXISTS schedule_dates DATE[] DEFAULT '{}';

-- Create index for efficient date lookups
CREATE INDEX IF NOT EXISTS idx_teaching_assignments_schedule_dates 
  ON teaching_assignments USING GIN (schedule_dates);
