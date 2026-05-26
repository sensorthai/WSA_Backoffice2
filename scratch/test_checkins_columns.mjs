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
  console.log("=== Checking wfh_checkins columns ===")
  const { data, error } = await supabase
    .from('wfh_checkins')
    .select('*')
    .limit(1)

  if (error) {
    console.error("Error:", error)
  } else {
    console.log("Columns found:", data.length > 0 ? Object.keys(data[0]) : "No rows in table")
  }
}

run()
