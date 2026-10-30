import { SupabaseClient } from '@supabase/supabase-js'

export async function getCurrentTenant(supabase?: SupabaseClient) {
  // If running in browser, fetch from server endpoint to guarantee RLS bypass and super admin resolution
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/tenant/current');
      if (res.ok) {
        const data = await res.json();
        return data.tenant || null;
      }
    } catch (e) {
      console.error('Error fetching current tenant from API:', e);
    }
    return null;
  }

  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // In Node.js / Server environment, use admin client if available to bypass RLS
  let adminClient: SupabaseClient | null = null;
  try {
    const { createClient: createAdminClient } = await import('@/lib/supabase/admin');
    adminClient = createAdminClient();
  } catch {
    adminClient = null;
  }

  const client = adminClient || supabase;

  const { data: profile } = await client
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (profile?.tenant_id) {
    const { data: tenant } = await client
      .from('tenants')
      .select('*')
      .eq('id', profile.tenant_id)
      .single()
    if (tenant) return tenant
  }

  // If super admin has no specific tenant assigned, resolve to dedicated business or first available tenant
  if (profile?.role === 'ADMIN') {
    let { data: adminTenant } = await client
      .from('tenants')
      .select('*')
      .or(`email.eq.${user.email},slug.eq.printflow`)
      .maybeSingle()
    if (adminTenant) return adminTenant

    const { data: firstTenant } = await client
      .from('tenants')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (firstTenant) return firstTenant
  }

  return null
}

export async function getTenantBySlug(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data;
}
