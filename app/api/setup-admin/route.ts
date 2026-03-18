import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const username = "Apple"; // provided by user
  const password = "Sulochana5%"; // provided by user
  const email = "apple@applegraphics.local";

  try {
    // 1. Create User in Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        name: "Apple Admin",
      },
    });

    if (authError) {
      if (authError.message.includes("already exists")) {
        return new Response("Admin already exists", { status: 200 });
      }
      throw authError;
    }

    // 2. Set Admin Role
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "ADMIN" })
      .eq("id", authUser.user.id);

    if (profileError) throw profileError;

    return new Response("Admin created successfully! You can now login with Username: Apple", { status: 200 });
  } catch (error: any) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
