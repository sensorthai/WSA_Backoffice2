-- Phase A4-fix: Change subject_materials to reference subject_code instead of subject_id
-- สื่อการสอนอ้างอิงกับรหัสวิชาเท่านั้น ใช้ได้กับทุกโรงเรียน/ชั้น

ALTER TABLE subject_materials
  ADD COLUMN IF NOT EXISTS subject_code TEXT;

-- Copy existing codes from subjects table
UPDATE subject_materials sm
  SET subject_code = s.code
  FROM subjects s
  WHERE sm.subject_id = s.id AND sm.subject_code IS NULL;

-- Drop old FK (subject_id) after migration
ALTER TABLE subject_materials
  DROP COLUMN IF EXISTS subject_id;

CREATE INDEX IF NOT EXISTS idx_materials_code ON subject_materials(subject_code);
