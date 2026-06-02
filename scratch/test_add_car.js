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

async function testAddCar() {
  const mockCar = {
    license_plate: 'TEST-1234',
    model: 'Test Toyota Vios',
    color: 'Red',
    type: 'car',
    is_available: true,
    caretaker_id: null,
    tax_renewal_date: null,
    insurance_expiry_date: null,
    ctp_expiry_date: null,
    oil_change_date: null,
    insurance_file_url: null,
    ctp_file_url: null,
    registration_book_file_url: null
  };

  console.log('Inserting mock car:', mockCar);
  const { data, error } = await supabase
    .from('company_cars')
    .insert(mockCar)
    .select()
    .single();

  if (error) {
    console.error('❌ Insert failed! Database Error:', error);
  } else {
    console.log('✅ Insert successful! Inserted Data:', data);
    
    // Clean up the mock car
    console.log('Cleaning up mock car...');
    const { error: deleteError } = await supabase
      .from('company_cars')
      .delete()
      .eq('id', data.id);
      
    if (deleteError) {
      console.error('Error cleaning up mock car:', deleteError);
    } else {
      console.log('Cleaned up mock car successfully.');
    }
  }
}

testAddCar();
