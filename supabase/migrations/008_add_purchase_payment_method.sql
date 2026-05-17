-- Add payment_method column to purchase_requests table
ALTER TABLE purchase_requests ADD COLUMN payment_method TEXT;

-- Update existing records to 'petty_cash' as a default
UPDATE purchase_requests SET payment_method = 'petty_cash' WHERE payment_method IS NULL;
