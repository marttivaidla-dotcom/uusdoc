import { createClient } from '@supabase/supabase-js'

function env(name: string) {
  const v = (process.env[name] ?? '').trim()
  return v.charCodeAt(0) === 0xFEFF ? v.slice(1) : v
}

export function createSupabaseServer() {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
}

// Admin klient teenindab RLS-i mööda minnes (kasutada ainult pärast kasutaja verifitseerimist)
export function createSupabaseAdmin() {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SECRET_KEY'))
}
