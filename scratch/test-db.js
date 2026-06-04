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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Fetching users...");
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name, role, department_id, departments(name)');

  if (userError) {
    console.error("User Query Error:", userError);
  } else {
    console.log("--- USERS ---");
    console.log(JSON.stringify(users, null, 2));
  }

  console.log("\nFetching departments...");
  const { data: depts, error: deptError } = await supabase
    .from('departments')
    .select('id, name');

  if (deptError) {
    console.error("Dept Query Error:", deptError);
  } else {
    console.log("--- DEPARTMENTS ---");
    console.log(JSON.stringify(depts, null, 2));
  }
}

test();
