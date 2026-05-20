-- Migration 024: Add AI Analysis Fields to Purchase Requests
-- Add document_type to categorize documents analyzed by AI
-- Add manifest_text to store the plain-text manifest/voucher summary for approvals

ALTER TABLE purchase_requests 
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS manifest_text TEXT;
