import DashboardLayout from "@/components/dashboard/DashboardLayout";

// ponytail: Supabase removed temporarily — no auth/DB checks.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
