-- Migration: 032_new_modules.sql
-- Description: Create tables for Petty Cash, Assets, Noticeboard, Helpdesk, and Knowledge Base

-- 1. Petty Cash / Reimbursements
CREATE TABLE IF NOT EXISTS reimbursements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    expense_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    receipt_url TEXT,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for reimbursements
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reimbursements"
    ON reimbursements FOR SELECT
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));

CREATE POLICY "Users can insert their own reimbursements"
    ON reimbursements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending reimbursements"
    ON reimbursements FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can update reimbursements"
    ON reimbursements FOR UPDATE
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));


-- 2. Assets
CREATE TABLE IF NOT EXISTS assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    asset_tag TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    purchase_date DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view assets"
    ON assets FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage assets"
    ON assets FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));


-- 3. Announcements (Noticeboard & Calendar)
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'news' CHECK (type IN ('news', 'holiday', 'policy')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active announcements"
    ON announcements FOR SELECT
    USING (is_active = true OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));

CREATE POLICY "Only admins can manage announcements"
    ON announcements FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));


-- 4. Helpdesk Tickets
CREATE TABLE IF NOT EXISTS helpdesk_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('it', 'facility', 'hr', 'other')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for helpdesk_tickets
ALTER TABLE helpdesk_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets or admins can view all"
    ON helpdesk_tickets FOR SELECT
    USING (auth.uid() = reported_by OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));

CREATE POLICY "Users can create tickets"
    ON helpdesk_tickets FOR INSERT
    WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can update their own open tickets"
    ON helpdesk_tickets FOR UPDATE
    USING (auth.uid() = reported_by AND status IN ('open', 'in_progress'));

CREATE POLICY "Admins can update tickets"
    ON helpdesk_tickets FOR UPDATE
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));


-- 5. Knowledge Base
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT NOT NULL,
    attachment_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for knowledge_base
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view knowledge base"
    ON knowledge_base FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage knowledge base"
    ON knowledge_base FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ceo')));


-- Set up updated_at triggers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reimbursements_modtime
    BEFORE UPDATE ON reimbursements
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_assets_modtime
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_announcements_modtime
    BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_helpdesk_tickets_modtime
    BEFORE UPDATE ON helpdesk_tickets
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_knowledge_base_modtime
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
