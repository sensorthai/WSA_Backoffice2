-- Phase A3: Students — Master Data
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_number INT NOT NULL,
  prefix TEXT DEFAULT '',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  class_level TEXT NOT NULL,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  org_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_students_school_class 
  ON students(school_id, class_level, academic_year);
CREATE INDEX IF NOT EXISTS idx_students_active 
  ON students(is_active) WHERE is_active = true;
