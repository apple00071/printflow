import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const tenant = await getCurrentTenant(supabase);
    if (!tenant) {
      return NextResponse.json({ connected: false });
    }

    const { data, error } = await supabase
      .from("tenant_integrations")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("type", "GMAIL")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({ connected: !!data });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
