-- Add registration_book_file_url column to company_cars table
ALTER TABLE company_cars ADD COLUMN IF NOT EXISTS registration_book_file_url TEXT;
