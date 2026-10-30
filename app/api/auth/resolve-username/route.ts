import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identifier = (searchParams.get("username") || searchParams.get("identifier") || "").trim().toLowerCase();

    if (!identifier) {
      return NextResponse.json({ error: "Identifier required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // 1. Lookup profile by username or phone
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id, username, phone")
      .or(`username.ilike.${identifier},phone.eq.${identifier}`)
      .limit(1)
      .maybeSingle();

    if (profile?.id) {
      // Get user email from Supabase Auth admin
      const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(profile.id);
      if (!userError && userData?.user?.email) {
        return NextResponse.json({ email: userData.user.email });
      }
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (err) {
    console.error("Resolve username error:", err);
    return NextResponse.json({ error: "Failed to resolve username" }, { status: 500 });
  }
}
