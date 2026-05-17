-- Add new columns to company_cars table
ALTER TABLE company_cars 
ADD COLUMN caretaker_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN tax_renewal_date DATE,
ADD COLUMN insurance_expiry_date DATE,
ADD COLUMN ctp_expiry_date DATE,
ADD COLUMN insurance_file_url TEXT,
ADD COLUMN ctp_file_url TEXT;

-- Create bucket for car documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('car-documents', 'car-documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for car-documents bucket
CREATE POLICY "Public Access Car Docs" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'car-documents');

CREATE POLICY "Authenticated users can upload Car Docs" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'car-documents' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own Car Docs" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'car-documents' AND 
  auth.uid() = owner
);
