import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's profile to determine tenant_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Only allow tenant users to access their own data
    if (!profile.tenant_id) {
      return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
    }

    // Fetch only the tenant's own data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', profile.tenant_id)
      .single();

    if (tenantError) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);

  } catch (error) {
    console.error('Error fetching tenant data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tenant data" },
      { status: 500 }
    );
  }
}
