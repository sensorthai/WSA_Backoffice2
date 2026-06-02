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

async function checkHealth() {
  console.log('Checking users health columns...');
  const { data: userData, error: userError } = await supabase.from('users').select('*').limit(1);
  if (userError) {
    console.error('Error fetching users:', userError.message);
  } else if (userData[0]) {
    console.log('Users keys:', Object.keys(userData[0]));
    console.log('Contains health fields (blood_type):', 'blood_type' in userData[0]);
  }

  console.log('\nChecking doctor_appointments table...');
  const { data: appData, error: appError } = await supabase.from('doctor_appointments').select('*').limit(1);
  if (appError) {
    console.error('❌ doctor_appointments table error:', appError.message);
  } else {
    console.log('✅ doctor_appointments table EXISTS!');
  }
}

checkHealth();
