import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
  || process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseKey = process.env.SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] Missing credentials. Check SUPABASE_URL and SUPABASE_ANON_KEY env vars.')
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '')
