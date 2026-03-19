import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/superadmin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const superAdmin = await isSuperAdmin(supabase);
    
    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tenants, error } = await adminSupabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get all profiles to manually join
    const { data: profiles, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*');
    
    if (profileError) throw profileError;

    // Map the column names for frontend compatibility and manually join profiles
    const mappedTenants = tenants.map(tenant => {
      const adminProfile = profiles.find(p => p.tenant_id === tenant.id && p.role === 'ADMIN');
      
      return {
        ...tenant,
        plan: tenant.subscription_tier?.toUpperCase() || 'FREE',
        plan_status: tenant.subscription_status || 'ACTIVE',
        orders_this_month: 0, // Default to 0 since column doesn't exist yet
        // Manually join profile data
        profiles: adminProfile ? {
          id: adminProfile.id,
          username: adminProfile.username || 'N/A',
          name: adminProfile.name || 'No Admin'
        } : {
          id: '',
          username: 'N/A',
          name: 'No Admin'
        }
      };
    });

    return NextResponse.json(mappedTenants);

  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const superAdmin = await isSuperAdmin(supabase);
    
    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, plan = 'FREE', business_type, city, state, phone } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Create slug from name
    const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const slug = `${baseSlug}-${Date.now()}`;
    
    // Create tenant with admin client to bypass RLS
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .insert({
        name,
        slug,
        business_type: business_type || 'Printing Press',
        city: city || '',
        state: state || '',
        phone: phone || '',
        email,
        subscription_tier: plan.toLowerCase(), // Map plan to subscription_tier
        subscription_status: 'ACTIVE' // Map plan_status to subscription_status
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      return NextResponse.json(
        { error: `Failed to create tenant: ${tenantError.message}` },
        { status: 500 }
      );
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

    // Create user account
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        username: email.split('@')[0],
      },
    });

    if (authError) {
      console.error('User creation error:', authError);
      // Clean up the tenant if user creation fails
      await adminSupabase.from('tenants').delete().eq('id', tenant.id);
      return NextResponse.json(
        { error: `Failed to create user account: ${authError.message}` },
        { status: 500 }
      );
    }

    // Create or update profile with admin client
    const { data: existingProfile, error: profileCheckError } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('Profile check error:', profileCheckError);
      // Clean up tenant and user if profile check fails
      await adminSupabase.from('tenants').delete().eq('id', tenant.id);
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: `Failed to check user profile: ${profileCheckError.message}` },
        { status: 500 }
      );
    }

    let profileError;
    if (existingProfile) {
      // Update existing profile
      const { error } = await adminSupabase
        .from('profiles')
        .update({
          username: email.split('@')[0],
          name,
          role: 'ADMIN',
          tenant_id: tenant.id
        })
        .eq('id', authData.user.id);
      profileError = error;
    } else {
      // Create new profile
      const { error } = await adminSupabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: email.split('@')[0],
          name,
          role: 'ADMIN',
          tenant_id: tenant.id
        });
      profileError = error;
    }

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up tenant and user if profile creation fails
      await adminSupabase.from('tenants').delete().eq('id', tenant.id);
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: `Failed to create user profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tenant created successfully",
      tenant: {
        ...tenant,
        tempPassword // Include temporary password for the admin
      }
    });

  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create tenant" },
      { status: 500 }
    );
  }
}
