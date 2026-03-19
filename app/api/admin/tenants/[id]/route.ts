import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/superadmin";
import { NextResponse } from "next/server";

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
    const updateData: any = {};
    if (body.plan) updateData.subscription_tier = body.plan.toLowerCase();
    if (body.plan_status) updateData.subscription_status = body.plan_status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error } = await adminSupabase
      .from('tenants')
      .update(updateData)
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update tenant" },
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
