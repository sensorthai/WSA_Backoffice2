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

async function setupStorage() {
  console.log('--- Setting up Supabase Storage ---');
  
  // 1. Create bucket 'receipts'
  const { data: bucket, error: bucketError } = await supabase.storage.createBucket('receipts', {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
  });

  if (bucketError) {
    if (bucketError.message === 'Bucket already exists') {
      console.log('✅ Bucket "receipts" already exists.');
    } else {
      console.error('❌ Error creating bucket:', bucketError);
    }
  } else {
    console.log('✅ Bucket "receipts" created successfully.');
  }

  // 2. Set Public Access Policy (via SQL since Storage API doesn't support policies directly)
  // Actually, for public buckets, files are public if the bucket is set to public.
  // But we need to allow INSERT/UPDATE for authenticated users.
  
  console.log('--- Setting up Storage RLS Policies ---');
  const sql = `
    -- Allow public read access
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');

    -- Allow authenticated uploads
    CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

    -- Allow users to update their own uploads (optional but good practice)
    CREATE POLICY "Owner Update" ON storage.objects FOR UPDATE
    USING (bucket_id = 'receipts' AND auth.uid() = owner);
  `;
  
  console.log('Please run the following SQL in your Supabase Dashboard to enable RLS for storage:');
  console.log(sql);
}

setupStorage();
