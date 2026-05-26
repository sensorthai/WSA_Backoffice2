-- Migration: 033_update_leave_quotas.sql
-- Description: Update default values for leave quotas in users table
ALTER TABLE users ALTER COLUMN personal_quota SET DEFAULT 3;
ALTER TABLE users ALTER COLUMN vacation_quota SET DEFAULT 6;
