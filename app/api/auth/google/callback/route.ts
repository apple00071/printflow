import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const supabase = createClient();
  
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=integrations&error=no_code`);
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await response.json();

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) throw new Error("Tenant not found");

    // Store tokens in tenant_integrations (Upsert)
    const { error: upsertError } = await supabase
      .from("tenant_integrations")
      .upsert({
        tenant_id: profile.tenant_id,
        type: "GMAIL",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token, // This is only provided on the first consent
        token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        is_active: true,
        settings: {
          email: tokens.id_token ? "decoded_email_here" : "connected" // Would need a JWT decode here
        }
      }, { onConflict: "tenant_id, type" });

    if (upsertError) throw upsertError;

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=integrations&success=gmail_connected`);
  } catch (error: any) {
    console.error("Gmail Callback Error:", error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=integrations&error=${encodeURIComponent(error.message)}`);
  }
}
