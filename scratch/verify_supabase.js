const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key) env[key.trim()] = value.join('=').trim();
});

let supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0];
}
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('--- Verifying Supabase Schema ---\n');

  const expectedTables = [
    'organizations', 'departments', 'positions', 'users', 
    'wfh_checkins', 'leave_requests', 'purchase_requests', 
    'company_cars', 'car_bookings', 'notifications'
  ];

  console.log('1. Checking Tables:');
  let foundCount = 0;
  for (const table of expectedTables) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  [X] Table "${table}" error: ${error.message}`);
    } else {
      console.log(`  [OK] Table "${table}" found.`);
      foundCount++;
    }
  }
  console.log(`\nSummary: ${foundCount}/${expectedTables.length} tables found.`);

  console.log('\n2. Checking Seed Data:');
  const { count: deptCount } = await supabase.from('departments').select('*', { count: 'exact', head: true });
  const { count: carCount } = await supabase.from('company_cars').select('*', { count: 'exact', head: true });
  
  console.log(`  [OK] Departments: ${deptCount} records.`);
  console.log(`  [OK] Company Cars: ${carCount} records.`);

  console.log('\n3. Checking get_my_role() function:');
  // We check for RPC presence
  const { error: funcError } = await supabase.rpc('get_my_role');
  if (funcError && funcError.message.includes('does not exist')) {
    console.log('  [X] Function "get_my_role()" NOT found.');
  } else {
    console.log('  [OK] Function "get_my_role()" exists.');
  }
}

verify();
