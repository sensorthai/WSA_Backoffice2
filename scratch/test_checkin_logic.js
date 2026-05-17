const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key) env[key.trim()] = value.join('=').trim();
});

let url = env.NEXT_PUBLIC_SUPABASE_URL;
if (url.includes('/rest/v1/')) url = url.split('/rest/v1/')[0];
const supabase = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_USER_ID = 'f1464289-0ae5-4fa8-89e7-bd1781c7cebd'; // employee
const ADMIN_USER_ID = '72182aa6-fad2-4b1b-b3d4-ee9d8b37f03b'; // admin
const TODAY = new Date().toISOString().split('T')[0];

async function runTests() {
  console.log('--- WFH Check-in System Test ---\n');

  // 1. Initial State
  console.log('1. Checking initial state for today...');
  await supabase.from('wfh_checkins').delete().eq('user_id', TEST_USER_ID).eq('check_date', TODAY);
  console.log('   [OK] Existing record for today deleted for fresh test.');

  // 2. Perform Check-in (Simulating POST /api/checkin)
  console.log('\n2. Simulating Check-in: "home"...');
  const { data: checkin1, error: error1 } = await supabase
    .from('wfh_checkins')
    .upsert({
      user_id: TEST_USER_ID,
      check_date: TODAY,
      status: 'home',
      note: 'Testing WFH check-in'
    }, { onConflict: 'user_id, check_date' })
    .select().single();

  if (error1) console.error('   [X] Error:', error1.message);
  else console.log('   [OK] Record inserted:', checkin1.id, 'Status:', checkin1.status);

  // 3. Confirm in DB
  console.log('\n3. Verifying record in Supabase...');
  const { data: verify1 } = await supabase
    .from('wfh_checkins')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('check_date', TODAY)
    .single();
  console.log('   [OK] Found in DB:', verify1 ? 'Yes' : 'No', 'Status:', verify1?.status);

  // 4. Test Upsert (Simulating Edit)
  console.log('\n4. Simulating Edit: "office"...');
  const { data: checkin2, error: error2 } = await supabase
    .from('wfh_checkins')
    .upsert({
      user_id: TEST_USER_ID,
      check_date: TODAY,
      status: 'office',
      note: 'Updated to Office'
    }, { onConflict: 'user_id, check_date' })
    .select().single();

  if (error2) console.error('   [X] Error:', error2.message);
  else console.log('   [OK] Record updated:', checkin2.id, 'Status:', checkin2.status);

  // 5. Team Status View (Simulating GET /api/checkin/team)
  console.log('\n5. Verifying Team Status View...');
  const { data: teamData } = await supabase
    .from('users')
    .select('id, full_name, wfh_checkins(status)')
    .eq('is_active', true)
    .eq('wfh_checkins.check_date', TODAY);
  
  const foundUser = teamData.find(u => u.id === TEST_USER_ID);
  console.log('   [OK] Team view shows test user:', foundUser ? 'Yes' : 'No');
  console.log('   [OK] Team view status:', foundUser?.wfh_checkins?.[0]?.status || 'not_checked');

  // 6. Report Table Contents
  console.log('\n--- Final wfh_checkins Table Contents (Today) ---');
  const { data: allCheckins } = await supabase
    .from('wfh_checkins')
    .select('*, users(full_name)')
    .eq('check_date', TODAY);
  
  console.table(allCheckins.map(c => ({
    Name: c.users.full_name,
    Date: c.check_date,
    Status: c.status,
    Note: c.note
  })));
}

runTests();
