import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load .env.local manually
const envPath = './.env.local'
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const parts = line.split('=')
  if (parts.length >= 2) {
    const key = parts[0].trim()
    const value = parts.slice(1).join('=').trim()
    // strip surrounding quotes if any
    let cleanedValue = value
    if ((cleanedValue.startsWith('"') && cleanedValue.endsWith('"')) ||
        (cleanedValue.startsWith("'") && cleanedValue.endsWith("'"))) {
      cleanedValue = cleanedValue.slice(1, -1)
    }
    env[key] = cleanedValue
  }
})

let supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log("=== Departments ===")
  const { data: depts, error: deptsErr } = await supabase.from('departments').select('*')
  if (deptsErr) console.error("Error fetching departments:", deptsErr)
  else console.log(depts)

  console.log("=== Positions ===")
  const { data: positions, error: positionsErr } = await supabase.from('positions').select('*')
  if (positionsErr) console.error("Error fetching positions:", positionsErr)
  else console.log(positions)

  console.log("=== Users ===")
  const { data: users, error: usersErr } = await supabase.from('users').select('id, full_name, email, role, department_id, position_id, is_active')
  if (usersErr) console.error("Error fetching users:", usersErr)
  else console.log(users)
}

run()
