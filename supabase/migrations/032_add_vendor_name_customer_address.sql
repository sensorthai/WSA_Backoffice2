-- Add vendor_name and customer_address columns to purchase_requests
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS vendor_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT;
