import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

// ponytail: 8s hard ceiling — if Supabase is down/paused, fail fast to /login
// rather than hanging for 25s and returning a 504 to the user.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), 8000);

    if (!user) redirect("/login");

    const { data: profile } = await withTimeout(
      supabase.from("profiles").select("tenant_id, role").eq("id", user.id).single(),
      8000
    );

    if (!profile) redirect("/onboarding");

    // Super admin (ADMIN with no tenant) belongs in /admin, not /dashboard
    if (profile.role === "ADMIN" && !profile.tenant_id) redirect("/admin");

    // Check onboarding completion for tenant users
    if (profile.tenant_id) {
      const { data: tenant } = await withTimeout(
        supabase.from("tenants").select("onboarding_complete").eq("id", profile.tenant_id).single(),
        8000
      );
      if (tenant && !tenant.onboarding_complete) redirect("/onboarding");
    }
  } catch (err: unknown) {
    // If Supabase is unreachable (paused project, DNS failure, timeout),
    // redirect to login rather than serving a 504.
    const isRedirect = err instanceof Error && err.message === "NEXT_REDIRECT";
    if (isRedirect) throw err; // let Next.js handle redirects normally
    console.error("Dashboard layout: Supabase unreachable, redirecting to login", err);
    redirect("/login");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
