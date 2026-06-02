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

async function testColumns() {
  console.log('Fetching sample record from company_cars...');
  const { data, error } = await supabase.from('company_cars').select('*').limit(1);
  if (error) {
    console.error('Error fetching company_cars:', error.message);
  } else {
    console.log('Record structure:', data[0] ? Object.keys(data[0]) : 'No records found');
    if (data[0]) {
      console.log('Contains registration_book_file_url:', 'registration_book_file_url' in data[0]);
    }
  }
}

testColumns();
