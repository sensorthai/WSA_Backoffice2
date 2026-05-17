// Run this script to apply the teaching management migration
// Usage: node scratch/run_migration.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read env file
const envContent = readFileSync('.env.local', 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) env[key.trim()] = rest.join('=').trim()
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

// Read migration SQL
const sql = readFileSync('supabase/migrations/010_teaching_management.sql', 'utf-8')

// Split by semicolons and run each statement
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`Found ${statements.length} SQL statements to run`)

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i]
  const firstLine = stmt.split('\n').find(l => l.trim().length > 0)
  console.log(`\n[${i+1}/${statements.length}] ${firstLine?.substring(0, 60)}...`)
  
  const { error } = await supabase.rpc('', {}).catch(() => ({}))
  
  // Use the REST API to run raw SQL via Supabase management API
  // Since we can't run raw SQL via the JS client, we'll use fetch
  const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: stmt })
  })
  
  if (!resp.ok) {
    // Try a different approach - just test table existence
    console.log(`  → Statement needs to be run directly in Supabase SQL Editor`)
  } else {
    console.log(`  → OK`)
  }
}

console.log('\n⚠️  Please run the migration SQL directly in Supabase SQL Editor')
console.log('File: supabase/migrations/010_teaching_management.sql')
