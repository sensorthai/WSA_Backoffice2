import { createClient } from '@supabase/supabase-js'

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  // Add vendor_name column
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS vendor_name TEXT;`
  }).maybeSingle()
  
  // Add customer_address column  
  const { error: e2 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS customer_address TEXT;`
  }).maybeSingle()

  // Try direct approach if rpc doesn't work - just test by selecting
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('vendor_name, customer_address')
    .limit(1)

  if (error) {
    console.log('Columns do not exist yet. Error:', error.message)
    console.log('')
    console.log('Please run this SQL in the Supabase Dashboard SQL Editor:')
    console.log('---')
    console.log('ALTER TABLE public.purchase_requests')
    console.log('  ADD COLUMN IF NOT EXISTS vendor_name TEXT,')
    console.log('  ADD COLUMN IF NOT EXISTS customer_address TEXT;')
    console.log('---')
  } else {
    console.log('✅ Columns vendor_name and customer_address already exist!')
    console.log('Sample data:', data)
  }
}

run()
