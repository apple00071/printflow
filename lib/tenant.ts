import { SupabaseClient } from '@supabase/supabase-js'

export async function getCurrentTenant(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Use regular client to respect RLS for tenant checking
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single()

  return tenant
}

export async function checkOrderLimit(tenant: { plan: string; orders_this_month: number }) {
  if (tenant.plan === 'FREE' && (tenant.orders_this_month || 0) >= 50) {
    return { allowed: false, reason: 'limit_reached' }
  }
  return { allowed: true }
}
