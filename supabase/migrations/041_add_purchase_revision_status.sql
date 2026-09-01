-- Migration: 041_add_purchase_revision_status.sql
-- Description: Update purchase_requests status CHECK constraint to include 'need_revision' and add revision tracking fields

-- 1. Drop existing status check constraint if exists
ALTER TABLE purchase_requests 
  DROP CONSTRAINT IF EXISTS purchase_requests_status_check;

-- 2. Add updated status check constraint
ALTER TABLE purchase_requests 
  ADD CONSTRAINT purchase_requests_status_check 
  CHECK (status IN ('pending', 'supervisor_approved', 'approved', 'rejected', 'paid', 'need_revision'));

-- 3. Add revision tracking columns if not exists
ALTER TABLE purchase_requests 
  ADD COLUMN IF NOT EXISTS revision_note TEXT,
  ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revision_requested_by UUID REFERENCES users(id);
