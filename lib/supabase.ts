import { createClient } from '@supabase/supabase-js'

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
if (supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser Client (Public)
export const createSupabaseClient = () => 
  createClient(supabaseUrl, supabaseAnonKey)

// Server Client (Service Role - for Auth/API)
export const createSupabaseServerClient = () => 
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

// Default export for backward compatibility if needed
export const supabase = createSupabaseClient()
