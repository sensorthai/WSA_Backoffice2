-- ===================================================
-- Teaching Management System Tables
-- ===================================================

-- 1. Schools (โรงเรียนลูกค้า)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  district TEXT,
  province TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Subjects (วิชาที่สอน)
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Teaching Assignments (การมอบหมายงานสอน)
CREATE TABLE teaching_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  
  start_date DATE NOT NULL,
  end_date DATE,
  schedule_days TEXT[] DEFAULT '{}',
  schedule_time_start TIME,
  schedule_time_end TIME,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  notes TEXT,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Teaching Logs (บันทึกการสอนรายวัน)
CREATE TABLE teaching_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES teaching_assignments(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  
  teach_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  
  topics_covered TEXT,
  student_count INTEGER,
  class_level TEXT,
  report_notes TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','submitted','reviewed')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_teaching_assignments_teacher ON teaching_assignments(teacher_id);
CREATE INDEX idx_teaching_assignments_school ON teaching_assignments(school_id);
CREATE INDEX idx_teaching_assignments_status ON teaching_assignments(status);
CREATE INDEX idx_teaching_logs_assignment ON teaching_logs(assignment_id);
CREATE INDEX idx_teaching_logs_teacher ON teaching_logs(teacher_id);
CREATE INDEX idx_teaching_logs_date ON teaching_logs(teach_date);

-- RLS Policies
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_logs ENABLE ROW LEVEL SECURITY;

-- Schools & Subjects: all read, admin write
CREATE POLICY "schools_read" ON schools FOR SELECT USING (TRUE);
CREATE POLICY "schools_admin" ON schools FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "subjects_read" ON subjects FOR SELECT USING (TRUE);
CREATE POLICY "subjects_admin" ON subjects FOR ALL USING (get_my_role() = 'admin');

-- Teaching Assignments: admin/employee can manage, teacher can read own
CREATE POLICY "assignments_admin_manage" ON teaching_assignments FOR ALL 
  USING (get_my_role() IN ('admin', 'employee', 'supervisor'));
CREATE POLICY "assignments_teacher_read" ON teaching_assignments FOR SELECT 
  USING (teacher_id = (SELECT id FROM users WHERE google_id = auth.jwt()->>'sub'));

-- Teaching Logs: teacher can manage own, admin/employee can read all
CREATE POLICY "logs_teacher_manage" ON teaching_logs FOR ALL 
  USING (teacher_id = (SELECT id FROM users WHERE google_id = auth.jwt()->>'sub'));
CREATE POLICY "logs_admin_read" ON teaching_logs FOR SELECT 
  USING (get_my_role() IN ('admin', 'employee', 'supervisor'));
CREATE POLICY "logs_admin_update" ON teaching_logs FOR UPDATE 
  USING (get_my_role() IN ('admin', 'employee', 'supervisor'));
