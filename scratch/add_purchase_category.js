const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env variables
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key) env[key.trim()] = value.join('=').trim();
});

let url = env.NEXT_PUBLIC_SUPABASE_URL;
if (url.includes('/rest/v1/')) url = url.split('/rest/v1/')[0];
const supabase = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY);

async function addCategoryColumn() {
  console.log('--- Adding category column to purchase_requests ---');
  
  // Note: Supabase JS client doesn't support ALTER TABLE directly.
  // I will provide the SQL for the user or try to run it via an RPC if available.
  // But usually, I should just assume I can suggest it or if I have a DB tool I'd use it.
  
  const sql = `
    ALTER TABLE purchase_requests 
    ADD COLUMN IF NOT EXISTS category TEXT;
  `;
  
  console.log('Please run the following SQL in your Supabase Dashboard to add the category column:');
  console.log(sql);
}

addCategoryColumn();
