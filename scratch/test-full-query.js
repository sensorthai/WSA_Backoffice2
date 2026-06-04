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

async function testFullQuery() {
  console.log("Testing full query from route.ts...");
  const { data, error } = await supabase
    .from('weekly_reports')
    .select(`
      *,
      user:users!user_id(id, full_name, avatar_url, department:departments(name)),
      reviewer:users!reviewed_by(full_name),
      items:weekly_report_items(*)
    `)
    .order('week_start', { ascending: false })
    .limit(1);

  if (error) {
    console.error("Full query error:", error);
  } else {
    console.log("Success! Full query returned data:", data);
  }
}

testFullQuery();
