-- Add draft status to teaching_logs
ALTER TABLE teaching_logs
  DROP CONSTRAINT IF EXISTS teaching_logs_status_check;

ALTER TABLE teaching_logs
  ADD CONSTRAINT teaching_logs_status_check
  CHECK (status IN ('draft','pending','submitted','reviewed'));
