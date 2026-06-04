const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

let supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0];
}
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log("Checking columns of weekly_report_items...");
  
  // We can query information_schema if we have service role key, but Supabase API doesn't expose it directly via REST.
  // Instead, we can do a RPC or we can try to insert a dummy record with the columns and check the error.
  // Or we can fetch a single record or try to select those columns explicitly.
  const { data, error } = await supabase
    .from('weekly_report_items')
    .select('manager_comment, deadline')
    .limit(1);

  if (error) {
    console.error("Column check error (do columns exist?):", error);
  } else {
    console.log("Success! Columns exist. Result:", data);
  }
}

checkColumns();
