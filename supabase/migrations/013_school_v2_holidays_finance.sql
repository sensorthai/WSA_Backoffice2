-- Phase A1: School V2 — Add holidays + finance contact
ALTER TABLE schools 
  ADD COLUMN IF NOT EXISTS holidays DATE[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS finance_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS finance_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS finance_contact_email TEXT;
