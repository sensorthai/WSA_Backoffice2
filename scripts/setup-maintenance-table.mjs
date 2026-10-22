import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0];
}
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Setting up tables for Sakon Maintenance Exchanges...");

  // 1. Create maintenance_exchanges
  const { error: err1 } = await supabase.rpc('exec_sql', {
    sql_string: `
      CREATE TABLE IF NOT EXISTS maintenance_exchanges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exchange_no TEXT UNIQUE NOT NULL,
        sakol_doc_no TEXT NOT NULL,
        sakol_doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
        partner_name TEXT NOT NULL DEFAULT 'บริษัท สากลเวิร์ค จำกัด',
        recipient_company TEXT NOT NULL DEFAULT 'บริษัท ยิบอินซอย จำกัด',
        pdf_file_url TEXT,
        status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'pending', 'completed', 'cancelled')),
        notes TEXT,
        received_by TEXT,
        issued_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS maintenance_exchange_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exchange_id UUID NOT NULL REFERENCES maintenance_exchanges(id) ON DELETE CASCADE,
        product_sku TEXT NOT NULL,
        product_name TEXT NOT NULL,
        defect_notes TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        refurbished_device_id UUID REFERENCES device_items(id) ON DELETE SET NULL,
        refurbished_sn TEXT,
        defective_received_sn TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (err1) {
    console.log("RPC exec_sql not available or error, falling back to direct table check...");
  }
}

run();
