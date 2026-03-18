import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from './supabase/server'

export async function isSuperAdmin(supabase?: SupabaseClient) {
  const client = supabase || createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return false

  const { data: profile } = await client
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  // Super admin has role 'ADMIN' and no tenant_id
  return profile?.role === 'ADMIN' && !profile?.tenant_id
}

export async function getCurrentUserWithRole(supabase?: SupabaseClient) {
  const client = supabase || createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null

  const { data: profile } = await client
    .from('profiles')
    .select('role, tenant_id, username, name')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    profile
  }
}
