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
  console.log("=== Diagnosing Purchase Requests ===")
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('id, title, status, total_amount, created_at')
  
  if (error) {
    console.error("Database error:", error)
    return
  }
  
  console.log(`Total purchase requests found: ${data.length}`)
  data.forEach((p, idx) => {
    console.log(`[${idx+1}] ID: ${p.id} | Title: "${p.title}" | Status: ${p.status} | Amount: ${p.total_amount} | Created At: ${p.created_at}`)
  })
}

run()
