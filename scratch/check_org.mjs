import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '')
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOrg() {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()

  if (error) {
    console.log('Org not found, creating...')
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'WSA Group'
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating org:', createError)
    } else {
      console.log('Org created:', newOrg)
    }
  } else {
    console.log('Org exists:', data)
  }
}

checkOrg()
