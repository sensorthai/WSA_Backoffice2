import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// 1. Manually parse .env.local
const envPath = path.resolve('.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
      process.env[key] = value
    }
  })
}

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log('--- Running Migration 033 ---')
  const sqlPath = path.resolve('supabase/migrations/033_add_flowaccount_sync_fields.sql')
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ Migration SQL file not found at:', sqlPath)
    process.exit(1)
  }

  const sql = fs.readFileSync(sqlPath, 'utf8')
  console.log('SQL to execute:')
  console.log(sql)

  const { error } = await supabase.rpc('exec_sql', { sql })

  if (error) {
    console.error('❌ RPC exec_sql failed:', error.message)
    console.log('\nPlease run the SQL manually in the Supabase Dashboard SQL Editor.')
  } else {
    console.log('✅ Migration SQL executed successfully!')
  }

  // Verify columns exist
  console.log('\n--- Verifying Columns ---')
  const { data: pSample, error: pError } = await supabase
    .from('purchase_requests')
    .select('id, flowaccount_doc_number, flowaccount_synced_at')
    .limit(1)

  if (pError) {
    console.error('❌ Verification failed for purchase_requests:', pError.message)
  } else {
    console.log('✅ Checked purchase_requests columns successfully. Sample:', pSample)
  }

  const { data: rSample, error: rError } = await supabase
    .from('reimbursements')
    .select('id, flowaccount_doc_number, flowaccount_synced_at')
    .limit(1)

  if (rError) {
    console.error('❌ Verification failed for reimbursements:', rError.message)
  } else {
    console.log('✅ Checked reimbursements columns successfully. Sample:', rSample)
  }
}

run()
