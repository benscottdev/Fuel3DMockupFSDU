import { createClient } from '@supabase/supabase-js'

/** Project ref `fjghowhnccbcdaflmrux` — override with VITE_SUPABASE_URL if needed. */
const DEFAULT_SUPABASE_URL = 'https://fjghowhnccbcdaflmrux.supabase.co'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabase = supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function isSupabaseConfigured() {
  return supabase != null
}
