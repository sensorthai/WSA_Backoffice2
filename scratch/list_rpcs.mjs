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

async function run() {
  const url = `${supabaseUrl}/rest/v1/`
  console.log("Fetching from url:", url)
  const res = await fetch(url, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  })
  
  if (!res.ok) {
    console.error("Failed to fetch OpenAPI spec:", res.status, await res.text())
    return
  }

  const spec = await res.json()
  const paths = Object.keys(spec.paths || {})
  console.log("Available paths:")
  paths.forEach(p => {
    if (p.startsWith('/rpc/')) {
      console.log(`  RPC: ${p}`)
    }
  })
}

run()
