const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}

const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, supervisor_id')
  
  if (error) {
    console.error(error)
    return
  }
  
  console.log('--- Users ---')
  console.table(data)
  
  const supervisors = data.filter(u => data.some(sub => sub.supervisor_id === u.id))
  console.log('\n--- Supervisors ---')
  console.table(supervisors)
}

checkUsers()
