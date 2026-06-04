import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}

const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data: depts, error: e1 } = await supabase.from('departments').select('*')
  console.log('--- Departments ---')
  console.table(depts)

  const { data: positions, error: e2 } = await supabase.from('positions').select('*')
  console.log('--- Positions ---')
  console.table(positions)
}

run()
