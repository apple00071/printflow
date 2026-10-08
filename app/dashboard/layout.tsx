import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  // Super admin (ADMIN with no tenant) belongs in /admin, not /dashboard
  if (profile.role === "ADMIN" && !profile.tenant_id) redirect("/admin");

  // Check onboarding completion for tenant users
  if (profile.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("onboarding_complete")
      .eq("id", profile.tenant_id)
      .single();

    if (tenant && !tenant.onboarding_complete) redirect("/onboarding");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
