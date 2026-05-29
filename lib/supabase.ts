import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singletons — clients are created on first access, not at module load time.
// This prevents build failures when env vars aren't present during Next.js
// static analysis / page data collection.

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

// Client-side safe (anon key)
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing Supabase public env vars')
    _supabase = createClient(url, key)
  }
  return _supabase
}

// Server-side only — never import this in client components
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing Supabase admin env vars')
    _supabaseAdmin = createClient(url, key)
  }
  return _supabaseAdmin
}

// Convenience proxy objects — these mimic the old named exports so most call
// sites don't need to change.  Accessing any property triggers lazy init.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getSupabase() as never)[prop]
  },
})

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getSupabaseAdmin() as never)[prop]
  },
})
