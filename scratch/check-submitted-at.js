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

async function checkSubmittedAt() {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('id, submitted_at, week_label');

  if (error) {
    console.error("Error fetching weekly_reports:", error);
    return;
  }

  console.log(`Fetched ${data.length} reports.`);
  const badSubmittedAt = data.filter(r => r.submitted_at !== null && isNaN(new Date(r.submitted_at).getTime()));
  console.log("Reports with invalid submitted_at:", badSubmittedAt);
  
  if (data.length > 0) {
    console.log("Sample submitted_at:", data.map(r => r.submitted_at).slice(0, 10));
  }
}

checkSubmittedAt();
