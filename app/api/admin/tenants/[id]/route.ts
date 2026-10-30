import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/superadmin";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const superAdmin = await isSuperAdmin(supabase);
    
    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tenant, error } = await adminSupabase
      .from('tenants')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    // Get the admin profile for this tenant
    let { data: profile } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', params.id)
      .eq('role', 'ADMIN')
      .maybeSingle();
    
    if (!profile && (tenant.email === 'pavankumarv1497@gmail.com' || tenant.slug === 'printflow')) {
      const { data: superAdminProfile } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('role', 'ADMIN')
        .is('tenant_id', null)
        .maybeSingle();
      profile = superAdminProfile;
    }

    const mappedTenant = {
      ...tenant,
      plan: (tenant.plan || tenant.subscription_tier || 'FREE').toUpperCase(),
      subscription_tier: (tenant.subscription_tier || tenant.plan || 'FREE').toUpperCase(),
      plan_status: (tenant.subscription_status || tenant.plan_status || 'ACTIVE').toUpperCase(),
      orders_this_month: tenant.orders_this_month || 0,
      profiles: profile ? {
        id: profile.id,
        username: profile.username || 'N/A',
        name: profile.name || 'No Admin'
      } : {
        id: '',
        username: 'N/A',
        name: 'No Admin'
      }
    };

    return NextResponse.json(mappedTenant);

  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tenant" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const superAdmin = await isSuperAdmin(supabase);
    
    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const adminSupabase = createAdminClient();

    // Mapping payload logic to the database columns
    const updateData: Record<string, string> = {};
    if (body.plan) {
      updateData.plan = body.plan.toLowerCase();
      updateData.subscription_tier = body.plan.toUpperCase(); // keep both fields in sync
    }
    if (body.plan_status) {
      updateData.subscription_status = body.plan_status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    console.log('Update Tenant Payload:', { id: params.id, updateData });
    const { data: updateResult, error } = await adminSupabase
      .from('tenants')
      .update(updateData)
      .eq('id', params.id)
      .select();

    if (error) {
      console.error('Supabase Update Error Object:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('Update Successful:', updateResult);
    return NextResponse.json({ success: true, data: updateResult });
  } catch (error) {
    console.error('Detailed Error updating tenant:', error);
    // Log the full error to see if it's the Cloudflare HTML
    const errorMessage = error instanceof Error ? error.message : "Failed to update tenant";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const superAdmin = await isSuperAdmin(supabase);
    
    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    const adminSupabase = createAdminClient();

    // 1. Get all profiles for this tenant
    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', params.id);

    // 2. Delete auth users first (skip current super admin user)
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        if (profile.id !== user?.id) {
          try {
            await adminSupabase.auth.admin.deleteUser(profile.id);
          } catch (err) {
            console.warn("Failed to delete auth user:", profile.id, err);
          }
        }
      }
    }

    // 3. Delete dependent tenant records first to ensure no foreign key violation
    await adminSupabase.from('price_table').delete().eq('tenant_id', params.id);
    await adminSupabase.from('payments').delete().eq('tenant_id', params.id);
    await adminSupabase.from('orders').delete().eq('tenant_id', params.id);
    await adminSupabase.from('quotations').delete().eq('tenant_id', params.id);
    await adminSupabase.from('customers').delete().eq('tenant_id', params.id);
    await adminSupabase.from('expenses').delete().eq('tenant_id', params.id);
    await adminSupabase.from('inventory').delete().eq('tenant_id', params.id);
    await adminSupabase.from('tenant_integrations').delete().eq('tenant_id', params.id);
    await adminSupabase.from('profiles').delete().eq('tenant_id', params.id);

    // 4. Delete tenant
    const { error } = await adminSupabase
      .from('tenants')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete tenant" },
      { status: 500 }
    );
  }
}
