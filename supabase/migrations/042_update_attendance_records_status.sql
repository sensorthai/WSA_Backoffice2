-- Update status check constraint for attendance_records to support sick and personal leave
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check 
  CHECK (status IN ('present', 'absent', 'late', 'leave', 'sick', 'personal', 'sick_leave', 'personal_leave'));
