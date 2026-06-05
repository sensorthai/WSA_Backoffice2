import { createClient } from '@supabase/supabase-js'

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  // Check last 5 purchase records for vendor/customer data
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('id, title, vendor_name, vendor_address, customer_name, customer_address, customer_tax_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('=== Last 5 purchase records ===')
  for (const row of data) {
    console.log(`\nID: ${row.id.substring(0, 8)}`)
    console.log(`Title: ${row.title}`)
    console.log(`Created: ${row.created_at}`)
    console.log(`vendor_name: "${row.vendor_name || '(null)'}"`)
    console.log(`vendor_address: "${row.vendor_address || '(null)'}"`)
    console.log(`customer_name: "${row.customer_name || '(null)'}"`)
    console.log(`customer_address: "${row.customer_address || '(null)'}"`)
    console.log(`customer_tax_id: "${row.customer_tax_id || '(null)'}"`)
  }

  // Also check all column names in purchase_requests
  const { data: cols, error: colErr } = await supabase
    .rpc('exec_sql', {
      sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'purchase_requests' ORDER BY ordinal_position;`
    })

  if (colErr) {
    console.log('\nCannot query column info via rpc, trying raw query approach...')
    // Fallback: just select one row with *
    const { data: sample } = await supabase
      .from('purchase_requests')
      .select('*')
      .limit(1)
    if (sample && sample.length > 0) {
      console.log('\nAll columns in purchase_requests:')
      console.log(Object.keys(sample[0]).join(', '))
    }
  } else {
    console.log('\nAll columns:', cols)
  }
}

check()
