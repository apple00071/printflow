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
  Sparkles,
  Zap
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
  color: string;
  hexColor: string;
  href: string;
  trend?: string;
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
  const [overdueOrders, setOverdueOrders] = useState<Order[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [chartData, setChartData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ name: string; value: number }[]>([]);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logo_url?: string; orders_this_month?: number } | null>(null);

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
          { label: t("Daily Volume", "నేటి ఆర్డర్లు"), value: todayOrders.length.toString(), icon: Zap, color: "bg-slate-900", hexColor: "#0f172a", href: "/dashboard/orders", trend: "+12%" },
          { label: t("Active Pipeline", "పెండింగ్ ఆర్డర్లు"), value: pendingCount.toString(), icon: Clock, color: "bg-slate-900", hexColor: "#0f172a", href: "/dashboard/orders", trend: "Normal" },
          { label: t("Receivables", "రావాల్సిన బాకీ"), value: formatCurrency(totalBalanceDue), icon: IndianRupee, color: "bg-slate-900", hexColor: "#0f172a", href: "/dashboard/billing", trend: "-5%" },
        ]);

        setRecentOrders((dbOrders || []).slice(0, 6));

        const jobGroups = (dbOrders || []).reduce((acc: Record<string, number>, curr) => {
          const type = curr.job_type || 'Other';
          acc[type] = (acc[type] || 0) + Number(curr.total_with_gst || curr.total_amount || 0);
          return acc;
        }, {});
        const chartColors = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1"];
        setChartData(Object.keys(jobGroups).map((name, i) => ({
          name,
          value: jobGroups[name],
          color: chartColors[i % chartColors.length]
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading Workspace</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-1000">
      
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden rounded-[40px] bg-slate-900 p-10 md:p-16 text-white shadow-2xl">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <Sparkles className="w-64 h-64 text-white" />
        </div>
        
        <div className="relative z-10 space-y-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
            <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tenantInfo?.name || "Workspace"}</span>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none italic uppercase">
              {t("Production", "ప్రొడక్షన్")} <br />
              <span className="text-slate-400 not-italic font-medium">{t("Dashboard", "డాష్బోర్డ్")}</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-md">
              {t("Welcome back. Your shop is currently processing", "తిరిగి స్వాగతం. మీ షాప్ ప్రస్తుతం ప్రాసెస్ చేస్తోంది")} {tenantInfo?.orders_this_month || 0} {t("orders this month.", "ఈ నెల ఆర్డర్లు.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
             <Link href="/dashboard/orders/new" className="h-14 px-8 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 hover:bg-slate-100 transition-all hover:translate-y-[-2px]">
               <Plus className="w-4 h-4" /> {t("New Job", "కొత్త పని")}
             </Link>
             <button onClick={() => window.scrollTo({ top: 1200, behavior: 'smooth' })} className="h-14 px-8 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] border border-white/5 flex items-center justify-center gap-3 hover:bg-slate-700 transition-all">
               <TrendingUp className="w-4 h-4" /> {t("View Trends", "ట్రెండ్స్ చూడండి")}
             </button>
          </div>
        </div>
      </section>

      <OnboardingProgress />

      {/* Architectural Grid: Stats & Quick Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         
         {/* Left: Intelligence & Stats */}
         <div className="lg:col-span-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.map((stat) => (
                <Link 
                  key={stat.label} 
                  href={stat.href}
                  className="group relative overflow-hidden bg-white rounded-[32px] p-8 border border-slate-100/80 shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all duration-500 hover:translate-y-[-4px]"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                          <stat.icon className="w-5 h-5" />
                       </div>
                       {stat.trend && (
                         <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">{stat.trend}</span>
                       )}
                    </div>
                    <div>
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                       <p className="text-2xl font-black text-slate-900 tracking-tight leading-none italic uppercase">{stat.value}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Ingestor Integration */}
            <GmailHistoryScanner />

            {/* Recent Table */}
            <div className="bg-white rounded-[32px] border border-slate-100/80 p-10 shadow-sm">
               <div className="flex items-center justify-between mb-10">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">{t("Recent Pipeline", "ఇటీవలి పనులు")}</h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">Latest active production jobs</p>
                  </div>
                  <Link href="/dashboard/orders" className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
                     <ArrowUpRight className="w-5 h-5" />
                  </Link>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="border-b border-slate-50">
                           <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("Customer", "కస్టమర్")}</th>
                           <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("Product", "ఉత్పత్తి")}</th>
                           <th className="pb-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("Amount", "మొత్తం")}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {recentOrders.map((order) => (
                           <tr key={order.id} className="group cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                              <td className="py-6">
                                 <p className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{order.customers?.name}</p>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.friendly_id || "TRK-ORD"}</p>
                              </td>
                              <td className="py-6">
                                 <div className="flex items-center gap-2">
                                    <div className={cn(
                                       "w-2 h-2 rounded-full",
                                       order.status === 'DELIVERED' ? "bg-green-500" : "bg-blue-500"
                                    )} />
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{order.job_type || "Standard"}</span>
                                 </div>
                              </td>
                              <td className="py-6 text-right">
                                 <p className="text-sm font-black text-slate-900 italic uppercase">{formatCurrency(order.total_amount)}</p>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         {/* Right: Quick Actions */}
         <div className="lg:col-span-4 space-y-10">
            <div className="sticky top-10">
               <QuickJobForm />
            </div>
         </div>
      </div>

      {/* Analytics Overhaul */}
      <div className="space-y-10">
         <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{t("Market Insights", "వ్యాపార పనితీరు")}</h2>
            <div className="h-1 w-20 bg-slate-900" />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white rounded-[32px] border border-slate-100/80 p-10 shadow-sm">
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">{t("Revenue Flow", "ఆదాయం సరళి")}</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">6M Growth</span>
               </div>
               <div className="h-[320px]">
                  <DashboardCharts data={monthlyTrend} type="line" />
               </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100/80 p-10 shadow-sm">
               <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight mb-10">{t("Product Mix", "ఉత్పత్తి ఆదాయం")}</h3>
               <div className="h-[320px]">
                  <DashboardCharts data={chartData} type="bar" />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
