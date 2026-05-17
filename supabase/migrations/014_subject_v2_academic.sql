-- Phase A2: Subject V2 — Add academic year, periods, time, fee
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS semester TEXT,
  ADD COLUMN IF NOT EXISTS class_level TEXT,
  ADD COLUMN IF NOT EXISTS periods_per_day INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS time_start TIME,
  ADD COLUMN IF NOT EXISTS time_end TIME,
  ADD COLUMN IF NOT EXISTS teaching_fee DECIMAL(10,2) DEFAULT 0;
