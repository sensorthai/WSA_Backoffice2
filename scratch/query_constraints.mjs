import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('./.env.local', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const parts = line.split('=')
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '')
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL.includes('/rest/v1/')
  ? env.NEXT_PUBLIC_SUPABASE_URL.split('/rest/v1/')[0]
  : env.NEXT_PUBLIC_SUPABASE_URL
const supabase = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const query = `
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conrelid = 'reimbursements'::regclass;
  `
  const { data, error } = await supabase.rpc('execute_sql', { query_text: query })
  if (error) {
    // If execute_sql RPC doesn't exist, we can fetch via standard query or try running raw SQL through a migration or another way.
    console.log("RPC Error (might not exist):", error.message)
    // Let's try to query information_schema orpg_catalog if allowed, or we can use another method.
    // Actually, RPC execute_sql is sometimes available or not. Let's see what happens.
  } else {
    console.log("Constraints:", data)
  }
}

run()
