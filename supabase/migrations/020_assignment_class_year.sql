-- Add class_level and academic_year to teaching_assignments
-- ดึงข้อมูลจากตารางนักเรียนเพื่อเชื่อมกับงานมอบหมาย

ALTER TABLE teaching_assignments
  ADD COLUMN IF NOT EXISTS class_level TEXT,
  ADD COLUMN IF NOT EXISTS academic_year TEXT;

CREATE INDEX IF NOT EXISTS idx_assignments_class ON teaching_assignments(school_id, class_level, academic_year);
