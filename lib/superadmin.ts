import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from './supabase/server'
import { createClient as createAdminClient } from './supabase/admin'

export async function isSuperAdmin(supabase?: SupabaseClient) {
  const client = supabase || createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return false

  // Use admin client to bypass RLS for profile checking
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
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

  // Use admin client to bypass RLS for profile checking
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, tenant_id, username, name')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    profile
  }
}
