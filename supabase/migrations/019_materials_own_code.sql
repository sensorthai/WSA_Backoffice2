-- Fix: สื่อการสอนมีรหัสของตัวเอง (material_code)
-- วิชาอ้างอิง material_code เพื่อเลือกชุดสื่อที่ใช้

-- 1. Rename subject_code → material_code in subject_materials
ALTER TABLE subject_materials
  ADD COLUMN IF NOT EXISTS material_code TEXT;

-- Copy data if any
UPDATE subject_materials SET material_code = subject_code WHERE material_code IS NULL AND subject_code IS NOT NULL;

ALTER TABLE subject_materials
  DROP COLUMN IF EXISTS subject_code;

DROP INDEX IF EXISTS idx_materials_code;
CREATE INDEX IF NOT EXISTS idx_materials_material_code ON subject_materials(material_code);

-- 2. Add material_code to subjects
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS material_code TEXT;
