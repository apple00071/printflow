import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/superadmin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const authorized = await isSuperAdmin(supabase);

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all profiles with role ADMIN and no tenant_id
    const { data: profiles, error } = await adminSupabase
      .from("profiles")
      .select("id, name, username, role, created_at")
      .eq("role", "ADMIN")
      .is("tenant_id", null);

    if (error) throw error;

    // Fetch auth emails for these profiles
    const { data: { users }, error: usersError } = await adminSupabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const userMap = new Map((users || []).map(u => [u.id, u.email]));

    const admins = (profiles || []).map(p => ({
      id: p.id,
      name: p.name || p.username || "Super Admin",
      username: p.username,
      email: userMap.get(p.id) || "N/A",
      created_at: p.created_at
    }));

    return NextResponse.json(admins);
  } catch (err) {
    console.error("Error fetching admins:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch admins" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const authorized = await isSuperAdmin(supabase);

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, password } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const tempPassword = password || (Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-6).toUpperCase() + "!");

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: name || "Super Admin",
        username: email.split("@")[0],
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Create profile with role ADMIN and tenant_id null
    const { error: profileError } = await adminSupabase
      .from("profiles")
      .upsert({
        id: authData.user.id,
        name: name || "Super Admin",
        username: email.split("@")[0],
        role: "ADMIN",
        tenant_id: null,
        status: "ACTIVE"
      });

    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: authData.user.id,
        email,
        name: name || "Super Admin",
        tempPassword
      }
    });
  } catch (err) {
    console.error("Error creating admin:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create admin" },
      { status: 500 }
    );
  }
}
