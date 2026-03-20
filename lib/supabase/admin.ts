import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)");
  }

  if (!supabaseServiceKey) {
    throw new Error("Missing Supabase Service Role Key (SUPABASE_SERVICE_ROLE_KEY, SERVICE_ROLE_KEY, or SUPABASE_SERVICE_KEY)");
  }

  return createSupabaseClient(
    supabaseUrl,
    supabaseServiceKey
  )
}
