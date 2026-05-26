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
    env[key] = value
  }
})

let supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log("=== Updating Leave Quotas for Existing Users ===")
  const { data: users, error: selectError } = await supabase
    .from('users')
    .select('id, email, full_name, personal_quota, vacation_quota')

  if (selectError) {
    console.error("Error fetching users:", selectError)
    return
  }

  console.log(`Found ${users.length} users in database.`)

  for (const user of users) {
    console.log(`Updating ${user.full_name || user.email} (Current - Personal: ${user.personal_quota}, Vacation: ${user.vacation_quota})`)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        personal_quota: 3,
        vacation_quota: 6
      })
      .eq('id', user.id)

    if (updateError) {
      console.error(`Failed to update user ${user.id}:`, updateError)
    } else {
      console.log(`Successfully updated ${user.full_name || user.email} to Personal: 3, Vacation: 6`)
    }
  }

  console.log("=== Quota Update Complete ===")
}

run()
