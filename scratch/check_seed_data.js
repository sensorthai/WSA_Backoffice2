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

// Fix URL if it contains /rest/v1/
let supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0];
}
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('\n--- Checking Seed Data Content ---\n');

  const { data: depts, error: deptsErr } = await supabase.from('departments').select('*');
  const { data: cars, error: carsErr } = await supabase.from('company_cars').select('*');
  
  if (deptsErr) console.log('Departments error:', deptsErr.message);
  else console.log(`Departments found: ${depts.length} rows`);

  if (carsErr) console.log('Cars error:', carsErr.message);
  else console.log(`Cars found: ${cars.length} rows`);

  if (depts && depts.length > 0) {
    console.log('Sample Department:', depts[0].name);
  } else {
    console.log('No departments found. Make sure to run seed.sql in the SQL Editor.');
  }
}

verify();
