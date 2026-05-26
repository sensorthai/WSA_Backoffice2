-- Migration: 034_add_work_done_to_checkins.sql
-- Description: Add work_done column to wfh_checkins table
ALTER TABLE wfh_checkins ADD COLUMN IF NOT EXISTS work_done TEXT;
