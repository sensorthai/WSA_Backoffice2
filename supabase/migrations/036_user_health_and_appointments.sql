-- 1. Add health columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chronic_disease TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS severe_allergies TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_security_hospital TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS attending_physician TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_hospital TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS health_exam_history TEXT;

-- 2. Create doctor_appointments table
CREATE TABLE IF NOT EXISTS doctor_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    doctor_name TEXT,
    hospital_name TEXT,
    appointment_date DATE NOT NULL,
    appointment_time TIME,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for doctor_appointments
ALTER TABLE doctor_appointments ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for doctor_appointments
CREATE POLICY "Users can view their own appointments"
    ON doctor_appointments FOR SELECT
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));

CREATE POLICY "Users can insert their own appointments"
    ON doctor_appointments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
    ON doctor_appointments FOR UPDATE
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));

CREATE POLICY "Users can delete their own appointments"
    ON doctor_appointments FOR DELETE
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));

-- 4. Set up updated_at trigger for doctor_appointments
CREATE TRIGGER update_doctor_appointments_modtime
    BEFORE UPDATE ON doctor_appointments
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
