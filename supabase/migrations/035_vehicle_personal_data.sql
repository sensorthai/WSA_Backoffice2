-- 1. Add password column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Create private_vehicles table
CREATE TABLE IF NOT EXISTS private_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_plate TEXT NOT NULL,
    model TEXT,
    color TEXT,
    type TEXT CHECK (type IN ('car', 'motorcycle')) DEFAULT 'car',
    tax_renewal_date DATE,
    insurance_expiry_date DATE,
    ctp_expiry_date DATE,
    oil_change_date DATE,
    insurance_file_url TEXT,
    ctp_file_url TEXT,
    tax_file_url TEXT,
    other_file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for private_vehicles
ALTER TABLE private_vehicles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for private_vehicles
CREATE POLICY "Users can view their own private vehicles"
    ON private_vehicles FOR SELECT
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));

CREATE POLICY "Users can insert their own private vehicles"
    ON private_vehicles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own private vehicles"
    ON private_vehicles FOR UPDATE
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));

CREATE POLICY "Users can delete their own private vehicles"
    ON private_vehicles FOR DELETE
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));

-- 4. Update company_cars table
ALTER TABLE company_cars ADD COLUMN IF NOT EXISTS oil_change_date DATE;
ALTER TABLE company_cars ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('car', 'motorcycle')) DEFAULT 'car';

-- 5. Set up updated_at trigger for private_vehicles
CREATE TRIGGER update_private_vehicles_modtime
    BEFORE UPDATE ON private_vehicles
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
