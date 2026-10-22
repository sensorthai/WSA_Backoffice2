-- Migration: 043_installation_and_inventory_system.sql
-- Description: Land and Houses projects, plots, serial inventory, requisitions, cover sheets, site handover & technician commissions

-- 1. Land & Houses Projects (โครงการ)
CREATE TABLE IF NOT EXISTS lh_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code TEXT NOT NULL,         -- เช่น 'LH372', 'LH380', 'LA030'
    project_code TEXT NOT NULL,         -- เช่น 'MRI', 'C13', 'VY'
    project_name TEXT NOT NULL,         -- เช่น 'มัณฑนา ราชพฤกษ์-นครอินทร์'
    developer_name TEXT DEFAULT 'Land and Houses',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_code, project_code)
);

-- 2. Land & Houses House Plots (แปลงบ้าน)
CREATE TABLE IF NOT EXISTS lh_house_plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES lh_projects(id) ON DELETE CASCADE,
    plot_code TEXT UNIQUE NOT NULL,      -- ฟิลด์ name เช่น 'LH372-02B01-210PW334T'
    occ_id TEXT,                         -- '90/109 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02B01'
    land_plot TEXT NOT NULL,             -- '02B01' (แปลง)
    house_number TEXT,                   -- '90/109' (บ้านเลขที่)
    home_series TEXT NOT NULL,           -- '210PW334T' (รูปแบบบ้าน)
    label TEXT,                          -- '90/109 มัณฑนา ราชพฤกษ์-นครอินทร์'
    full_address TEXT,                   -- ที่อยู่เต็มสำหรับไปหน้างาน
    po_number TEXT,                      -- รหัสใบสั่งซื้อ เช่น 'LH3726300837'
    po_date DATE,                        -- วันที่สั่งซื้อ
    po_new_date DATE,                    -- วันที่ PO เพิ่มใหม่
    lot_name TEXT,                       -- เช่น 'PM 2.5', 'Lot 1,500'
    sheet_source TEXT,                   -- แหล่งชีต เช่น 'Asset_House 1,500'
    delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'cancelled')),
    delivered_at TIMESTAMPTZ,            -- วันที่ส่งมอบจริง
    warranty_expire_date DATE,           -- วันหมดประกัน
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lh_plots_search ON lh_house_plots (land_plot, house_number, po_number, delivery_status);
CREATE INDEX IF NOT EXISTS idx_lh_plots_project ON lh_house_plots (project_id);

-- 3. Product Catalog (แคตตาล็อกสินค้าหลัก)
CREATE TABLE IF NOT EXISTS product_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,             -- 'AP-CTRL', 'AP-8PORT', 'SN-PM25'
    name TEXT NOT NULL,                   -- 'Air Plus Controller', 'Air Plus 8 Port Extension', 'เซ็นเซอร์ PM 2.5'
    device_type TEXT NOT NULL,            -- 'controller', 'port_hub', 'sensor'
    default_warranty_days INTEGER DEFAULT 365,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial products if not exists
INSERT INTO product_catalog (sku, name, device_type, description)
VALUES 
    ('AP-CTRL', 'ชุดควบคุมระบบเติมอากาศ กรองฝุ่น PM 2.5 (Air Plus Controller)', 'controller', 'ชุดควบคุมกระแสไฟฟ้า Air Plus Controller'),
    ('AP-8PORT', 'Air Plus 8 Port Extension', 'port_hub', 'กล่องขยายสัญญาณ Air Plus 8 Port Extension'),
    ('SN-PM25', 'เซ็นเซอร์ PM 2.5', 'sensor', 'เซ็นเซอร์ตรวจวัดค่าฝุ่นละออง PM 2.5')
ON CONFLICT (sku) DO NOTHING;

-- 4. Device Items with Serial Numbers (อุปกรณ์รายชิ้น)
CREATE TABLE IF NOT EXISTS device_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES product_catalog(id) ON DELETE CASCADE,
    serial_number TEXT UNIQUE NOT NULL,
    ownership_type TEXT NOT NULL DEFAULT 'customer_consignment' CHECK (ownership_type IN ('company_owned', 'customer_consignment')),
    owner_company_name TEXT DEFAULT 'Land and Houses',
    condition TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new', 'repaired_refurbished', 'defective')),
    status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN (
        'in_stock', 'under_repair', 'reserved', 'with_technician', 'installed', 'scrapped'
    )),
    current_plot_id UUID REFERENCES lh_house_plots(id) ON DELETE SET NULL,
    installed_at TIMESTAMPTZ,
    warranty_start DATE,
    warranty_expire DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_items_status ON device_items (status, condition, ownership_type);
CREATE INDEX IF NOT EXISTS idx_device_items_sn ON device_items (serial_number);

-- 5. Inventory Requisitions (ใบเบิกอุปกรณ์ออกจากคลัง)
CREATE TABLE IF NOT EXISTS inventory_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_no TEXT UNIQUE NOT NULL,      -- เช่น 'REQ-202610-0001'
    requested_by UUID REFERENCES users(id),
    requester_name TEXT NOT NULL,
    requester_phone TEXT,
    purpose_type TEXT NOT NULL DEFAULT 'installation_new' CHECK (purpose_type IN (
        'installation_new', 'warranty_replace', 'out_of_warranty_refurbished', 'office_testing'
    )),
    plot_id UUID REFERENCES lh_house_plots(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN (
        'issued', 'completed', 'returned_part', 'cancelled'
    )),
    issued_by UUID REFERENCES users(id),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Inventory Requisition Items (รายการอุปกรณ์ในใบเบิก)
CREATE TABLE IF NOT EXISTS inventory_requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID NOT NULL REFERENCES inventory_requisitions(id) ON DELETE CASCADE,
    device_item_id UUID NOT NULL REFERENCES device_items(id) ON DELETE CASCADE,
    item_status TEXT DEFAULT 'with_technician' CHECK (item_status IN ('with_technician', 'installed', 'returned')),
    returned_at TIMESTAMPTZ,
    return_condition TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Installation Site Reports & Checklist (รายงานผลงานติดตั้งหน้างาน & ใบปะหน้า)
CREATE TABLE IF NOT EXISTS installation_site_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID REFERENCES inventory_requisitions(id) ON DELETE SET NULL,
    plot_id UUID NOT NULL REFERENCES lh_house_plots(id) ON DELETE CASCADE,
    lead_technician_id UUID REFERENCES users(id),
    lead_technician_name TEXT,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'issues_found')),
    
    -- ผลการติดตั้งอุปกรณ์ชุดควบคุมกระแสไฟฟ้า (ตามใบปะหน้าจริง)
    led_status_ok BOOLEAN DEFAULT FALSE,
    app_connect_controller_ok BOOLEAN DEFAULT FALSE,
    app_connect_ext_ok BOOLEAN DEFAULT FALSE,
    sensor1_living_room_ok BOOLEAN DEFAULT FALSE,
    sensor2_garage_ok BOOLEAN DEFAULT FALSE,
    fan_filter_control_ok BOOLEAN DEFAULT FALSE,
    fan_airplus_count INTEGER DEFAULT 0,
    
    -- ตรวจสอบหลังจบงาน (3 ข้อตามใบปะหน้าจริง)
    marker_cable_ok BOOLEAN DEFAULT FALSE,
    lan_signal_note TEXT,
    controller_screw_tight BOOLEAN DEFAULT FALSE,
    technician_notes TEXT,
    
    -- ลายเซ็นผู้ตรวจรับ & วันที่
    customer_sign_name TEXT,
    customer_sign_phone TEXT,
    signed_at TIMESTAMPTZ,
    
    -- รูปถ่าย 5 จุดบังคับ
    photo_controller_led TEXT,
    photo_sensor_living_room TEXT,
    photo_sensor_garage TEXT,
    photo_app_screen TEXT,
    photo_signed_sheet TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Installation Technicians & Commissions (ตารางคำนวณค่าคอมมิชชั่นช่าง)
CREATE TABLE IF NOT EXISTS installation_technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES installation_site_reports(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES users(id),
    technician_name TEXT NOT NULL,
    base_rate_per_house NUMERIC(10, 2) DEFAULT 50.00,
    technician_count INTEGER DEFAULT 1,
    commission_earned NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'approved', 'paid')),
    payment_cycle TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(report_id, technician_name)
);

-- 9. Device Repairs & Refurbish (งานซ่อมและรับของเสียเข้าคลัง)
CREATE TABLE IF NOT EXISTS device_repairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_item_id UUID NOT NULL REFERENCES device_items(id) ON DELETE CASCADE,
    pulled_from_plot_id UUID REFERENCES lh_house_plots(id) ON DELETE SET NULL,
    defect_symptom TEXT NOT NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    repair_status TEXT NOT NULL DEFAULT 'diagnosing' CHECK (repair_status IN (
        'diagnosing', 'waiting_parts', 'repairing', 'tested_passed', 'unrepairable'
    )),
    repair_details TEXT,
    repaired_by UUID REFERENCES users(id),
    completed_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for all newly created tables
ALTER TABLE lh_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lh_house_plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_site_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_repairs ENABLE ROW LEVEL SECURITY;

-- Default permissive RLS policies for authenticated users
CREATE POLICY "Allow all actions for authenticated users on lh_projects" ON lh_projects FOR ALL USING (true);
CREATE POLICY "Allow all actions for authenticated users on lh_house_plots" ON lh_house_plots FOR ALL USING (true);
CREATE POLICY "Allow all actions for authenticated users on product_catalog" ON product_catalog FOR ALL USING (true);
CREATE POLICY "Allow all actions for authenticated users on device_items" ON device_items FOR ALL USING (true);
CREATE POLICY "Allow all actions for authenticated users on inventory_requisitions" ON inventory_requisitions FOR ALL USING (true);
CREATE POLICY "Allow all actions for authenticated users on inventory_requisition_items" ON inventory_requisition_items FOR ALL USING (true);
CREATE POLICY "Allow all actions for authenticated users on installation_site_reports" ON installation_site_reports FOR ALL USING (true);
CREATE POLICY "Allow all actions for authenticated users on installation_technicians" ON installation_technicians FOR ALL USING (true);
CREATE POLICY "Allow all actions for authenticated users on device_repairs" ON device_repairs FOR ALL USING (true);
