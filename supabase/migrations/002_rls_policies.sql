-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wfh_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_cars ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE google_id = auth.jwt()->>'sub'
$$ LANGUAGE SQL SECURITY DEFINER;

-- Policies

-- Users: employees see themselves, supervisors see their team, admin/ceo see all
CREATE POLICY "users_select" ON users FOR SELECT USING (
  google_id = auth.jwt()->>'sub'
  OR get_my_role() IN ('admin','ceo','supervisor')
);

CREATE POLICY "users_admin_insert" ON users FOR INSERT WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "users_admin_update" ON users FOR UPDATE USING (get_my_role() = 'admin' OR google_id = auth.jwt()->>'sub');

-- WFH: own records + supervisor/admin/ceo read all
CREATE POLICY "wfh_own" ON wfh_checkins FOR ALL USING (
  user_id = (SELECT id FROM users WHERE google_id = auth.jwt()->>'sub')
);

CREATE POLICY "wfh_manager_read" ON wfh_checkins FOR SELECT USING (
  get_my_role() IN ('supervisor','admin','ceo')
);

-- Leave requests: similar pattern
CREATE POLICY "leave_own" ON leave_requests FOR ALL USING (
  user_id = (SELECT id FROM users WHERE google_id = auth.jwt()->>'sub')
);

CREATE POLICY "leave_approver_read" ON leave_requests FOR SELECT USING (
  get_my_role() IN ('supervisor','admin','ceo')
);

CREATE POLICY "leave_approver_update" ON leave_requests FOR UPDATE USING (
  get_my_role() IN ('supervisor','ceo')
);

-- Purchase requests
CREATE POLICY "purchase_own" ON purchase_requests FOR ALL USING (
  user_id = (SELECT id FROM users WHERE google_id = auth.jwt()->>'sub')
);

CREATE POLICY "purchase_approver" ON purchase_requests FOR SELECT USING (
  get_my_role() IN ('supervisor','admin','ceo')
);

CREATE POLICY "purchase_approver_update" ON purchase_requests FOR UPDATE USING (
  get_my_role() IN ('supervisor','ceo')
);

-- Car bookings
CREATE POLICY "car_own" ON car_bookings FOR ALL USING (
  user_id = (SELECT id FROM users WHERE google_id = auth.jwt()->>'sub')
);

CREATE POLICY "car_approver" ON car_bookings FOR SELECT USING (
  get_my_role() IN ('supervisor','admin','ceo')
);

CREATE POLICY "car_update" ON car_bookings FOR UPDATE USING (
  get_my_role() IN ('supervisor','admin','ceo')
);

-- Cars list: all authenticated users can read
CREATE POLICY "cars_read" ON company_cars FOR SELECT USING (TRUE);

CREATE POLICY "cars_admin" ON company_cars FOR ALL USING (get_my_role() = 'admin');

-- Departments & Positions: all read, admin write
CREATE POLICY "dept_read" ON departments FOR SELECT USING (TRUE);

CREATE POLICY "dept_admin" ON departments FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "pos_read" ON positions FOR SELECT USING (TRUE);

CREATE POLICY "pos_admin" ON positions FOR ALL USING (get_my_role() = 'admin');

-- Notifications: own only
CREATE POLICY "notif_own" ON notifications FOR ALL USING (
  user_id = (SELECT id FROM users WHERE google_id = auth.jwt()->>'sub')
);
