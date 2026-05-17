-- Drop existing constraint
ALTER TABLE wfh_checkins DROP CONSTRAINT wfh_checkins_status_check;

-- Add updated constraint with 'onsite'
ALTER TABLE wfh_checkins ADD CONSTRAINT wfh_checkins_status_check CHECK (status IN ('office', 'home', 'onsite', 'leave', 'holiday'));
