import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ tenant: null }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (profile?.tenant_id) {
      const { data: tenant } = await adminClient
        .from("tenants")
        .select("*")
        .eq("id", profile.tenant_id)
        .single();
      return NextResponse.json({ tenant: tenant || null });
    }

    // For Super Admin (role ADMIN, tenant_id null), resolve to dedicated business or first tenant
    if (profile?.role === "ADMIN") {
      let { data: tenant } = await adminClient
        .from("tenants")
        .select("*")
        .or(`email.eq.${user.email},slug.eq.printflow`)
        .maybeSingle();

      if (!tenant) {
        const { data: firstTenant } = await adminClient
          .from("tenants")
          .select("*")
          .limit(1)
          .maybeSingle();
        tenant = firstTenant;
      }

      return NextResponse.json({ tenant: tenant || null, isSuperAdmin: true });
    }

    return NextResponse.json({ tenant: null });
  } catch (error) {
    console.error("Error in /api/tenant/current:", error);
    return NextResponse.json({ tenant: null }, { status: 500 });
  }
}
