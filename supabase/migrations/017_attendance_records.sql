-- Phase B1: Attendance Records + Teaching Reports V2
-- =================================================

-- 1. Attendance Records (เช็คชื่อนักเรียนรายคน)
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teaching_log_id UUID NOT NULL REFERENCES teaching_logs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','leave')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_log ON attendance_records(teaching_log_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- 2. Add V2 fields to teaching_logs for enhanced reports
ALTER TABLE teaching_logs
  ADD COLUMN IF NOT EXISTS homework_assigned TEXT,
  ADD COLUMN IF NOT EXISTS student_behavior TEXT CHECK (student_behavior IN ('excellent','good','fair','needs_improvement')),
  ADD COLUMN IF NOT EXISTS teaching_method TEXT;
