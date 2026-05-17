-- Phase A4: Subject Materials — Teaching Resources
CREATE TABLE IF NOT EXISTS subject_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('manual','slide','video','document','link','other')),
  description TEXT,
  file_url TEXT,
  youtube_url TEXT,
  file_name TEXT,
  file_size INT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_subject ON subject_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON subject_materials(type);
