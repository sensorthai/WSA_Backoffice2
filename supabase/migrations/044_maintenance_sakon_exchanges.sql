-- Migration: 044_maintenance_sakon_exchanges.sql
-- Description: Maintenance exchanges with Sakol Work Co., Ltd. (Sakon) for defective vs refurbished devices

CREATE TABLE IF NOT EXISTS maintenance_exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_no TEXT UNIQUE NOT NULL,                       -- เช่น EXC-202610-0001
    sakol_doc_no TEXT NOT NULL,                             -- เช่น LHSAV-SQ-6707-C030
    sakol_doc_date DATE NOT NULL DEFAULT CURRENT_DATE,      -- วันที่ตามเอกสารของ Sakon
    partner_name TEXT NOT NULL DEFAULT 'บริษัท สากลเวิร์ค จำกัด',
    recipient_company TEXT NOT NULL DEFAULT 'บริษัท ยิบอินซอย จำกัด',
    pdf_file_url TEXT,                                     -- ลิงก์ไฟล์ PDF ของ Sakon ที่อัปโหลด
    pdf_filename TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'pending', 'completed', 'cancelled')),
    notes TEXT,
    received_by TEXT,                                      -- ผู้รับอุปกรณ์ (ตัวแทน สากลเวิร์ค)
    issued_by TEXT,                                        -- ผู้ให้เบิกอุปกรณ์ (ยิบอินซอย/WSA)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_exchange_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID NOT NULL REFERENCES maintenance_exchanges(id) ON DELETE CASCADE,
    product_sku TEXT NOT NULL,                              -- AP-CTRL, AP-8PORT, SN-PM25
    product_name TEXT NOT NULL,                            -- Controller " Airplus ", Controller " PM2.5 ", Sensor
    defect_notes TEXT,                                     -- อาการเสียและแปลงบ้าน เช่น "- MMK2 140/54 สั่งให้พัดลมทำงานไม่ได้"
    quantity INTEGER NOT NULL DEFAULT 1,
    refurbished_device_id UUID REFERENCES device_items(id) ON DELETE SET NULL,
    refurbished_sn TEXT,                                   -- Serial Number ของตัว Refurbished ที่เบิกจ่ายให้ Sakon
    defective_received_sn TEXT,                            -- Serial Number ของตัวเสียที่รับเข้ามา (ถ้ามี)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE maintenance_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_exchange_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users on maintenance_exchanges" ON maintenance_exchanges FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users on maintenance_exchange_items" ON maintenance_exchange_items FOR ALL USING (true);
