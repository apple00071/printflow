"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  IndianRupee, 
  Clock,
  Loader2
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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatCard {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
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
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logo_url?: string } | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const currentTenant = await getCurrentTenant(supabase);

        if (!currentTenant) {
          console.error('No tenant found for dashboard');
          setLoading(false);
          return;
        }

        setTenantInfo({ name: currentTenant.name, logo_url: currentTenant.logo_url });

        const now = new Date().toISOString();
        const today = new Date().toISOString().split('T')[0];
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // 1. Fetch Orders (filtered by tenant)
        const { data: dbOrders, error: orderError } = await supabase
          .from("orders")
          .select("*, customers(name)")
          .eq('tenant_id', currentTenant.id)
          .order('created_at', { ascending: false });
        
        if (orderError) throw orderError;

        // 2. Fetch Payments (for method breakdown and trend)
        const { data: dbPayments, error: payError } = await supabase
            .from("payments")
            .select("*")
            .eq('tenant_id', currentTenant.id)
            .gte('paid_at', sixMonthsAgo.toISOString());
        
        if (payError) throw payError;

        // 3. Fetch Inventory for Alerts
        const { data: invData } = await supabase
          .from("inventory")
          .select("quantity, low_stock_limit")
          .eq("tenant_id", currentTenant.id);
        
        const lowStock = (invData || []).filter(i => i.quantity <= i.low_stock_limit).length;
        setLowStockCount(lowStock);

        // 4. Process Stats & Overdue
        const todayOrders = (dbOrders || []).filter(o => o.created_at.startsWith(today));
        const pendingCount = (dbOrders || []).filter(o => o.status !== 'DELIVERED').length;
        const totalBalanceDue = (dbOrders || []).reduce((acc, curr) => acc + Number(curr.balance_due || 0), 0);
        
        const overdue = (dbOrders || []).filter(o => 
          o.status !== 'DELIVERED' && 
          o.delivery_date && 
          o.delivery_date < now
        );

        setOverdueOrders(overdue.slice(0, 3));

        setStats([
          { label: t("Pending Orders", "పెండింగ్ ఆర్డర్లు", "लंबित आदेश"), value: pendingCount.toString(), icon: Clock, color: "bg-orange" },
          { label: t("Today's Orders", "నేటి ఆర్డర్లు", "आज के आदेश"), value: todayOrders.length.toString(), icon: ShoppingBag, color: "bg-blue-500" },
          { label: t("Balance Due", "రావాల్సిన బాకీ", "बकाया राशि"), value: formatCurrency(totalBalanceDue), icon: IndianRupee, color: "bg-red-500" },
        ]);

        setRecentOrders((dbOrders || []).slice(0, 5));

        // 5. Job Types Chart
        const jobGroups = (dbOrders || []).reduce((acc: Record<string, number>, curr) => {
          const type = curr.job_type || 'Other';
          acc[type] = (acc[type] || 0) + Number(curr.total_with_gst || curr.total_amount || 0);
          return acc;
        }, {});
        const chartColors = ["#1e3a5f", "#f97316", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6"];
        setChartData(Object.keys(jobGroups).map((name, i) => ({
          name,
          value: jobGroups[name],
          color: chartColors[i % chartColors.length]
        })).sort((a, b) => b.value - a.value).slice(0, 6));

        // 6. Monthly Trend
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

/*
        // 7. Payment Breakdown
        const payGroups = (dbPayments || []).reduce((acc: Record<string, number>, curr) => {
            const method = curr.method?.toUpperCase() || 'OTHER';
            acc[method] = (acc[method] || 0) + Number(curr.amount);
            return acc;
        }, {});
        setPaymentBreakdown(Object.entries(payGroups).map(([name, value]) => ({
            name,
            value: Number(value),
            color: name === 'CASH' ? '#10b981' : name === 'UPI' ? '#3b82f6' : '#f59e0b'
        })));
*/

      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [t]); 

  return (
    <div className="space-y-8 pb-10">
      {/* Tenant Success Hub / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
         <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
         <div className="relative z-10">
            <h1 className="text-3xl font-medium text-gray-900 leading-tight tracking-tight">
               {t("Welcome back,", "మళ్ళీ స్వాగతం,", "स्वागत है,")} <span className="font-bold text-primary">{tenantInfo?.name || "Member"}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
               <p className="text-gray-500">{t("Here's what's happening today.", "ఈరోజు విశేషాలు ఇక్కడ ఉన్నాయి.", "आज क्या हो रहा है, यहाँ देखें।")}</p>
               {overdueOrders.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-tighter border border-red-200 animate-pulse">
                     {overdueOrders.length} Overdue
                  </span>
               )}
               {lowStockCount > 0 && (
                  <span className="px-2 py-0.5 bg-orange/10 text-orange rounded-full text-[10px] font-bold uppercase tracking-tighter border border-orange/20">
                     {lowStockCount} Low Stock
                  </span>
               )}
            </div>
         </div>
         <div className="flex items-center gap-3 relative z-10">
            {tenantInfo?.logo_url ? (
               <img src={tenantInfo.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl object-contain border border-gray-100 p-1 bg-white" />
            ) : (
               <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-100">
                  <ShoppingBag className="w-8 h-8 text-gray-300" />
               </div>
            )}
         </div>
      </div>
      
      <OnboardingProgress />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-4 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
                Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse h-24"></div>
                ))
            ) : stats.map((stat) => (
              <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 group hover:shadow-md transition-all">
                <div className={`${stat.color} p-3 rounded-xl text-white group-hover:scale-110 transition-transform shadow-lg shadow-current/10`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                   <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{stat.label}</p>
                   <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Trend */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[350px]">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-lg font-bold text-gray-900">{t("Revenue Trend", "ఆదాయం సరళి", "आय का रुझान")}</h2>
                 <span className="text-xs text-gray-400 font-medium">Last 6 Months</span>
              </div>
              {loading ? (
                <div className="flex flex-col items-center justify-center p-10">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
                </div>
              ) : (
                <div className="h-[250px]">
                   <DashboardCharts data={monthlyTrend} type="line" />
                </div>
              )}
            </div>

            {/* Job Types */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[350px]">
              <h2 className="text-lg font-bold text-gray-900 mb-8">{t("Revenue by Job Type", "ఆర్డర్ రకాలు", "काम के प्रकार आय")}</h2>
              {loading ? (
                  <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  </div>
              ) : (
                <div className="h-[250px]">
                   <DashboardCharts data={chartData} type="bar" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table Component (Simplified) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-900">{t("Recent Orders", "ఇటీవలి ఆర్డర్లు", "हाल के आदेश")}</h2>
          <Link href="/dashboard/orders" className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all border border-gray-100">
            {t("View Full Ledger", "పూర్తిగా చూడండి", "पूरा लेजर देखें")}
          </Link>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                 <tr className="border-b border-gray-50">
                    <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Customer", "కస్టమర్", "ग्राहक")}</th>
                    <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Job Type", "పని రకం", "काम का प्रकार")}</th>
                    <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Status", "స్థితి", "स्थिति")}</th>
                    <th className="pb-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Amount", "మొత్తం", "मात्रा")}</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {loading ? (
                    Array(3).fill(0).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={4} className="py-4 h-12 bg-gray-50 rounded-lg"></td></tr>)
                 ) : recentOrders.map((order) => (
                    <tr key={order.id} className="group hover:bg-gray-50/50 transition-all cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                       <td className="py-4">
                          <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{order.customers?.name}</p>
                          <p className="text-[10px] font-mono text-gray-400 uppercase">{order.friendly_id || `#${order.id.split('-')[0]}`}</p>
                       </td>
                       <td className="py-4">
                          <span className="text-xs text-gray-600">{order.job_type || "-"}</span>
                       </td>
                       <td className="py-4">
                          <span className={cn(
                             "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                             order.status === 'DELIVERED' ? "bg-green-100 text-green-700" :
                             order.status === 'READY' ? "bg-blue-100 text-blue-700" :
                             "bg-orange/10 text-orange"
                          )}>
                             {order.status}
                          </span>
                       </td>
                       <td className="py-4 text-right">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
