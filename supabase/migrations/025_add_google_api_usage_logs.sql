-- Migration 025: Google API Usage Logs and Settings

-- Create table to log Google API/Gemini usage
CREATE TABLE IF NOT EXISTS google_api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  tokens_used INT,
  cost NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
  status TEXT NOT NULL, -- 'success' or 'error'
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE google_api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read usage logs
CREATE POLICY "All authenticated users can select google_api_usage_logs" ON google_api_usage_logs
  FOR SELECT TO authenticated
  USING (true);

-- Allow system and admins to manage logs
CREATE POLICY "Admins can manage google_api_usage_logs" ON google_api_usage_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Seed system settings for Google API if not exists
INSERT INTO system_settings (key, value)
VALUES ('google_api_settings', '{"total_budget_usd": 300.00, "cost_per_request_usd": 0.015, "currency": "USD"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Seed some mock historical usage logs to make charts look beautiful
INSERT INTO google_api_usage_logs (api_name, tokens_used, cost, status, created_at)
VALUES 
('Gemini 1.5 Flash - Receipt OCR', 1250, 0.01875, 'success', NOW() - INTERVAL '7 days'),
('Gemini 1.5 Flash - Receipt OCR', 1400, 0.02100, 'success', NOW() - INTERVAL '7 days'),
('Gemini 1.5 Flash - Receipt OCR', 950, 0.01425, 'success', NOW() - INTERVAL '6 days'),
('Gemini 1.5 Flash - Receipt OCR', 2100, 0.03150, 'success', NOW() - INTERVAL '5 days'),
('Gemini 1.5 Flash - Receipt OCR', 1150, 0.01725, 'success', NOW() - INTERVAL '4 days'),
('Gemini 1.5 Flash - Receipt OCR', 850, 0.01275, 'success', NOW() - INTERVAL '4 days'),
('Gemini 1.5 Flash - Receipt OCR', 1300, 0.01950, 'success', NOW() - INTERVAL '3 days'),
('Gemini 1.5 Flash - Receipt OCR', 1650, 0.02475, 'success', NOW() - INTERVAL '2 days'),
('Gemini 1.5 Flash - Receipt OCR', 1800, 0.02700, 'success', NOW() - INTERVAL '1 day'),
('Gemini 1.5 Flash - Receipt OCR', 1500, 0.02250, 'success', NOW());
