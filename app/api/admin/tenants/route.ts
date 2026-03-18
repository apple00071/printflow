import { createClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/superadmin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const superAdmin = await isSuperAdmin(supabase);
    
    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('tenants')
      .select(`
        *,
        profiles!inner(id, username, name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const superAdmin = await isSuperAdmin(supabase);
    
    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      slug, 
      business_type, 
      city, 
      state, 
      phone, 
      email, 
      admin_email,
      admin_password,
      admin_name
    } = body;

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name,
        slug,
        business_type,
        city,
        state,
        phone,
        email,
        plan: 'FREE',
        plan_status: 'ACTIVE',
        onboarding_complete: true
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Create admin user for tenant
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: {
        username: admin_email.split('@')[0],
        name: admin_name,
      },
    });

    if (authError) throw authError;

    // Create profile for admin user
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        username: admin_email.split('@')[0],
        name: admin_name,
        role: 'ADMIN',
        tenant_id: tenant.id
      });

    if (profileError) throw profileError;

    return NextResponse.json({ 
      message: "Tenant created successfully",
      tenant 
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  }
}
