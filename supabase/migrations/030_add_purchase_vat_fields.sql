-- Add VAT related columns to purchase_requests table
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  -- existing columns assumed from prior migrations
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  category TEXT,
  items JSONB,
  purpose TEXT,
  receipt_url TEXT,
  payment_method TEXT,
  document_type TEXT,
  manifest_text TEXT,
  total_amount NUMERIC,
  -- new columns
  document_number TEXT,
  document_date DATE,
  amount_before_vat NUMERIC,
  vat_amount NUMERIC,
  total_after_vat NUMERIC
);

-- If table already exists, add columns if not exist
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS document_date DATE,
  ADD COLUMN IF NOT EXISTS amount_before_vat NUMERIC,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS total_after_vat NUMERIC;
