-- Migration: 039_reimbursements_workflow.sql
-- Description: Update reimbursements table to support two-stage approval workflow and audit columns.

-- 1. Drop existing inline CHECK constraint if it exists (automatically named in PostgreSQL)
ALTER TABLE reimbursements DROP CONSTRAINT IF EXISTS reimbursements_status_check;

-- 2. Add new CHECK constraint with 'paid' status
ALTER TABLE reimbursements ADD CONSTRAINT reimbursements_status_check CHECK (status IN ('pending', 'approved', 'paid', 'rejected'));

-- 3. Add audit columns for Training Manager approval and Finance Manager payment
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS training_note TEXT;
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES users(id);
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS finance_note TEXT;
