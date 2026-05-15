"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  IndianRupee, 
  Clock,
  Loader2,
  Search,
  ClipboardList,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Zap,
  Calendar
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils/format";
import { useLanguage } from "@/lib/context/LanguageContext";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import OnboardingProgress from "@/components/dashboard/OnboardingProgress";
import QuickJobForm from "@/components/dashboard/QuickJobForm";
import GmailHistoryScanner from "@/components/dashboard/GmailHistoryScanner";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatCard {
  label: string;
  value: string;
  icon: React.ElementType;
  href: string;
  description: string;
}

interface Order {
  id: string;
  friendly_id?: string;
  created_at: string;
  total_amount: number;
  total_with_gst?: number;
  status: string;
  delivery_date? : string;
  job_type? : string;
  balance_due? : number;
  customers: {
    name: string;
  };
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logo_url?: string; orders_this_month?: number } | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<{ name: string; value: number }[]>([]);
  const [chartData, setChartData] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const currentTenant = await getCurrentTenant(supabase);

        if (!currentTenant) {
          setLoading(false);
          return;
        }

        setTenantInfo({ 
          name: currentTenant.name, 
          logo_url: currentTenant.logo_url,
          orders_this_month: currentTenant.orders_this_month || 0
        });

        const today = new Date().toISOString().split('T')[0];
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: dbOrders, error: orderError } = await supabase
          .from("orders")
          .select("*, customers(name)")
          .eq('tenant_id', currentTenant.id)
          .order('created_at', { ascending: false });
        
        if (orderError) throw orderError;

        const { data: dbPayments } = await supabase
            .from("payments")
            .select("*")
            .eq('tenant_id', currentTenant.id)
            .gte('paid_at', sixMonthsAgo.toISOString());

        const todayOrders = (dbOrders || []).filter(o => o.created_at.startsWith(today));
        const pendingCount = (dbOrders || []).filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
        const totalBalanceDue = (dbOrders || []).reduce((acc, curr) => acc + Number(curr.balance_due || 0), 0);
        
        setStats([
          { label: t("Daily Orders", "నేటి ఆర్డర్లు"), value: todayOrders.length.toString(), icon: Zap, href: "/dashboard/orders", description: "Orders received today" },
          { label: t("Pending Jobs", "పెండింగ్ పనులు"), value: pendingCount.toString(), icon: Clock, href: "/dashboard/orders", description: "In production pipeline" },
          { label: t("Account Receivables", "రావాల్సిన బాకీ"), value: formatCurrency(totalBalanceDue), icon: IndianRupee, href: "/dashboard/billing", description: "Outstanding balance" },
        ]);

        setRecentOrders((dbOrders || []).slice(0, 6));

        // Charts
        const jobGroups = (dbOrders || []).reduce((acc: Record<string, number>, curr) => {
          const type = curr.job_type || 'Other';
          acc[type] = (acc[type] || 0) + Number(curr.total_with_gst || curr.total_amount || 0);
          return acc;
        }, {});
        setChartData(Object.keys(jobGroups).map((name) => ({
          name,
          value: jobGroups[name],
          color: "#0f172a"
        })).sort((a, b) => b.value - a.value).slice(0, 5));

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const trendData: Record<string, number> = {};
        for(let j = 5; j >= 0; j--) {
            const d = new Date();
            d.setMonth(d.getMonth() - j);
            const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
            trendData[key] = 0;
        }
        (dbPayments || []).forEach(p => {
            const d = new Date(p.paid_at);
            const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
            if(trendData[key] !== undefined) trendData[key] += Number(p.amount);
        });
        setMonthlyTrend(Object.entries(trendData).map(([name, value]) => ({ name, value })));

      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [t]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{t("Dashboard", "డాష్బోర్డ్")}</h1>
          <p className="text-sm text-slate-500">{t("Welcome back to", "స్వాగతం")} {tenantInfo?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/orders/new')} className="h-10 px-4 bg-slate-900 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors">
            <Plus className="w-4 h-4" />
            {t("New Order", "కొత్త ఆర్డర్")}
          </button>
        </div>
      </div>

      <OnboardingProgress />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Link 
            key={stat.label} 
            href={stat.href}
            className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-all">
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Pipeline */}
        <div className="lg:col-span-2 space-y-8">
          
          <GmailHistoryScanner />

          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">{t("Recent Pipeline", "ఇటీవలి పనులు")}</h2>
              <Link href="/dashboard/orders" className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white border-b border-slate-50">
                    <th className="px-6 py-4 text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t("Customer", "కస్టమర్")}</th>
                    <th className="px-6 py-4 text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t("Job Type", "పని రకం")}</th>
                    <th className="px-6 py-4 text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t("Status", "స్థితి")}</th>
                    <th className="px-6 py-4 text-right text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t("Amount", "మొత్తం")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">{order.customers?.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase">{order.friendly_id || `#${order.id.split('-')[0]}`}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600 font-medium">{order.job_type || "Standard"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                          order.status === 'DELIVERED' ? "bg-green-100 text-green-700" :
                          order.status === 'READY' ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(order.total_amount)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions & Side Column */}
        <div className="space-y-8">
           <QuickJobForm />
           
           <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">{t("Revenue Overview", "ఆదాయం")}</h3>
              <div className="h-[240px]">
                 <DashboardCharts data={monthlyTrend} type="line" />
              </div>
           </div>

           <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">{t("Product Mix", "ఉత్పత్తి మిశ్రమం")}</h3>
              <div className="h-[240px]">
                 <DashboardCharts data={chartData} type="bar" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
