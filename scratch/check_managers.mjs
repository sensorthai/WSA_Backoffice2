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
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      full_name,
      email,
      role,
      department:department_id (id, name),
      position:position_id (id, name, approval_limit),
      supervisor_id
    `)
  
  if (error) {
    console.error(error)
    return
  }

  console.log('--- All WSA Staff ---')
  const mapped = users.map(u => ({
    name: u.full_name,
    email: u.email,
    role: u.role,
    dept: u.department?.name || 'None',
    pos: u.position?.name || 'None',
    limit: u.position?.approval_limit || 0
  }))
  console.table(mapped)
}

run()
