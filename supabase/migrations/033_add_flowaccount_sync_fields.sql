-- Migration: 033_add_flowaccount_sync_fields.sql
-- Description: Add fields to track FlowAccount synchronization status

-- 1. Add columns to purchase_requests
ALTER TABLE IF EXISTS purchase_requests 
ADD COLUMN IF NOT EXISTS flowaccount_doc_number TEXT,
ADD COLUMN IF NOT EXISTS flowaccount_synced_at TIMESTAMP WITH TIME ZONE;

-- 2. Add columns to reimbursements
ALTER TABLE IF EXISTS reimbursements 
ADD COLUMN IF NOT EXISTS flowaccount_doc_number TEXT,
ADD COLUMN IF NOT EXISTS flowaccount_synced_at TIMESTAMP WITH TIME ZONE;
