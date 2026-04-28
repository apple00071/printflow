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
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', params.id)
      .eq('role', 'ADMIN')
      .single();
    
    // It's possible there's no admin profile yet or it's named differently
    // In that case, don't throw, just return what we have

    const mappedTenant = {
      ...tenant,
      plan: tenant.plan?.toUpperCase() || 'FREE',
      subscription_tier: tenant.subscription_tier?.toUpperCase() || tenant.plan?.toUpperCase() || 'FREE',
      plan_status: tenant.plan_status || 'ACTIVE',
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
    if (body.plan_status) updateData.plan_status = body.plan_status;

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

    const adminSupabase = createAdminClient();

    // 1. Get all profiles for this tenant
    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', params.id);

    // 2. Delete auth users first
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        await adminSupabase.auth.admin.deleteUser(profile.id);
      }
    }

    // 3. Delete tenant (profiles and other data cascade depending on setup)
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
