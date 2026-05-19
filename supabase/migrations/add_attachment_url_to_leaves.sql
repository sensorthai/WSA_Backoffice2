-- Add attachment_url column to leave_requests table
-- This column stores the URL of uploaded medical certificates (required for sick leave)
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS attachment_url TEXT;
