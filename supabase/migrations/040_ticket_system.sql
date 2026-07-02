-- Migration: 040_ticket_system.sql
-- Description: Create tables for Work Ticket System (External customers/partners)

-- 1. Modify users role check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'employee', 'supervisor', 'ceo', 'outsource', 'partner', 'customer'));

-- 2. Create Ticket Types table
CREATE TABLE IF NOT EXISTS ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    custom_fields JSONB NOT NULL DEFAULT '[]', -- List of fields: {name: 'device_name', label: 'Device Name', type: 'text', required: true}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Work Tickets table
CREATE TABLE IF NOT EXISTS work_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_contact TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    custom_answers JSONB NOT NULL DEFAULT '{}',
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    delegated_to UUID[] DEFAULT '{}',
    
    resolution_notes TEXT,
    obstacles TEXT,
    recommendations TEXT,
    photo_url TEXT,
    
    is_knowledge_base BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_tickets ENABLE ROW LEVEL SECURITY;

-- 5. Set up RLS Policies
CREATE POLICY "Anyone can view ticket types" ON ticket_types 
    FOR SELECT USING (true);

CREATE POLICY "Only admin/ceo can manage ticket types" ON ticket_types 
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));

CREATE POLICY "Users can view relevant tickets" ON work_tickets 
    FOR SELECT USING (
        auth.uid() = created_by 
        OR auth.uid() = assigned_to 
        OR auth.uid() = ANY(delegated_to) 
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo', 'supervisor'))
    );

CREATE POLICY "Authenticated users can create tickets" ON work_tickets 
    FOR INSERT WITH CHECK (
        auth.uid() = created_by 
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo', 'supervisor'))
    );

CREATE POLICY "Users can update relevant tickets" ON work_tickets 
    FOR UPDATE USING (
        auth.uid() = created_by AND status = 'pending'
        OR auth.uid() = assigned_to
        OR auth.uid() = ANY(delegated_to)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo', 'supervisor'))
    );

-- 6. Setup updated_at triggers
CREATE TRIGGER update_ticket_types_modtime
    BEFORE UPDATE ON ticket_types
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_work_tickets_modtime
    BEFORE UPDATE ON work_tickets
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 7. Seed Initial Ticket Types
INSERT INTO ticket_types (name, description, custom_fields) VALUES
(
  'IT & Network Support', 
  'การแก้ไขปัญหาอุปกรณ์ไอที ระบบเครือข่าย อินเทอร์เน็ต และคอมพิวเตอร์', 
  '[
    {"name": "device_type", "label": "ประเภทอุปกรณ์", "type": "select", "options": ["คอมพิวเตอร์/โน้ตบุ๊ก", "พริ้นเตอร์", "เราเตอร์/สวิตช์", "โทรศัพท์/แท็บเล็ต", "อื่นๆ"], "required": true},
    {"name": "serial_number", "label": "หมายเลขซีเรียล (Serial Number)", "type": "text", "required": false},
    {"name": "error_message", "label": "ข้อความแสดงข้อผิดพลาด (Error)", "type": "textarea", "required": true}
  ]'::jsonb
),
(
  'Onsite Installation', 
  'การขอให้ทีมงานเดินทางไปติดตั้งอุปกรณ์ ระบบเซิร์ฟเวอร์ หรือโปรแกรมที่หน้างาน', 
  '[
    {"name": "installation_address", "label": "สถานที่ติดตั้ง / โรงเรียน / บริษัท", "type": "text", "required": true},
    {"name": "device_quantity", "label": "จำนวนอุปกรณ์ที่จะติดตั้ง", "type": "number", "required": true},
    {"name": "preferred_date", "label": "วันที่ต้องการให้เข้าปฏิบัติงาน", "type": "date", "required": true}
  ]'::jsonb
),
(
  'Hardware Repair & Maintenance', 
  'การซ่อมแซมฮาร์ดแวร์ บำรุงรักษาเครื่องจักร หรือเปลี่ยนอุปกรณ์ชิ้นส่วนที่ชำรุด', 
  '[
    {"name": "hardware_name", "label": "ชื่ออุปกรณ์ / รุ่นฮาร์ดแวร์", "type": "text", "required": true},
    {"name": "failure_symptom", "label": "อาการเสียและรายละเอียดปัญหา", "type": "textarea", "required": true},
    {"name": "warranty_status", "label": "สถานะการรับประกัน", "type": "select", "options": ["อยู่ในประกัน", "หมดประกัน", "ไม่ทราบ"], "required": true}
  ]'::jsonb
);

-- 8. Seed Mock Users
INSERT INTO users (google_id, email, full_name, role, is_active) VALUES
('mock_partner_id_1', 'partner@wsa.com', 'พาร์ทเนอร์ ผู้ร่วมค้า (WSA Partner)', 'partner', true),
('mock_customer_id_1', 'customer@wsa.com', 'ลูกค้า ผู้ใช้บริการ (WSA Customer)', 'customer', true),
('mock_employee_id_1', 'employee1@wsa.com', 'สมบัติ ทำงานจริง (Worker 1)', 'employee', true),
('mock_employee_id_2', 'employee2@wsa.com', 'สมศรี มีชัย (Worker 2)', 'employee', true)
ON CONFLICT (email) DO NOTHING;
