"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  IndianRupee, 
  Clock,
  Loader2,
  Search,
  ClipboardList,
  Settings,
  Wallet,
  ChevronRight
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
          console.error('No tenant found for dashboard');
          setLoading(false);
          return;
        }

        setTenantInfo({ 
          name: currentTenant.name, 
          logo_url: currentTenant.logo_url,
          orders_this_month: currentTenant.orders_this_month || 0
        });

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
        const pendingCount = (dbOrders || []).filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
        const totalBalanceDue = (dbOrders || []).reduce((acc, curr) => acc + Number(curr.balance_due || 0), 0);
        
        const overdue = (dbOrders || []).filter(o => 
          o.status !== 'DELIVERED' && 
          o.delivery_date && 
          o.delivery_date < now
        );

        setOverdueOrders(overdue.slice(0, 3));

        setStats([
          { label: t("Today's Orders", "నేటి ఆర్డర్లు", "आज के आदेश"), value: todayOrders.length.toString(), icon: ClipboardList, color: "bg-blue-600", hexColor: "#2563eb", href: "/dashboard/orders" },
          { label: t("Pending Orders", "పెండింగ్ ఆర్డర్లు", "लंबित आदेश"), value: pendingCount.toString(), icon: Clock, color: "bg-orange", hexColor: "#f97316", href: "/dashboard/orders" },
          { label: t("Balance Due", "రావాల్సిన బాకీ", "बकाया राशि"), value: formatCurrency(totalBalanceDue), icon: IndianRupee, color: "bg-red-500", hexColor: "#ef4444", href: "/dashboard/billing" },
        ]);

        setRecentOrders((dbOrders || []).slice(0, 8));

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

      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [t]); 

  return (
    <div className="space-y-6 pb-20">
      {/* Quick Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
         {[
            { label: t("Dashboard", "డాష్బోర్డ్", "डैशबोर्ड"), href: "/dashboard", active: true },
            { label: t("Jobs", "పనులు", "कार्य"), href: "/dashboard/orders" },
            { label: t("Quotes", "కొటేషన్లు", "कोटेशन"), href: "/dashboard/quotations" },
            { label: t("Ledger", "లెడ్జర్", "लेजर"), href: "/dashboard/billing" },
            { label: t("Customers", "కస్టమర్లు", "ग्राहक"), href: "/dashboard/customers" },
            { label: t("Settings", "సెట్టింగులు", "सेटिंग्स"), href: "/dashboard/settings" },
         ].map((pill) => (
            <Link 
               key={pill.href} 
               href={pill.href}
               className={cn(
                  "px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                  pill.active 
                     ? "bg-[#e2f2ed] text-[#10b981] border-[#d1e9e0]" 
                     : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50"
               )}
            >
               {pill.label}
            </Link>
         ))}
      </div>
      
      <OnboardingProgress />
      
      {/* High-Level Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link 
            key={stat.label} 
            href={stat.href}
            className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 group cursor-pointer border-b-2" 
            style={{ borderBottomColor: stat.hexColor }}
          >
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-xl text-white shadow-lg shadow-current/20 group-hover:scale-110 transition-transform duration-500`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 opacity-80">{stat.label}</p>
                 <p className="text-xl font-extrabold text-gray-900 tracking-tight">{stat.value}</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Main Functional Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Add */}
        <div className="lg:col-span-4 space-y-6">
           <QuickJobForm />
        </div>

        {/* Right Column: Recent Jobs */}
        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-semibold text-gray-900">{t("Recent jobs", "ఇటీవలి పనులు", "हाल के कार्य")}</h2>
                <div className="flex items-center gap-2">
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder={t("Filter job list", "ఫిల్టర్ చేయండి", "फ़िल्टर करें")}
                        className="pl-8 pr-4 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                   </div>
                </div>
              </div>

              {recentOrders.length === 0 ? (
                 <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                       <ClipboardList className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">{t("No jobs yet.", "ఇంకా పనులు లేవు.", "अभी तक कोई कार्य नहीं।")}</p>
                 </div>
              ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="border-b border-gray-50">
                            <th className="pb-4 text-[10px] font-medium text-gray-400 uppercase tracking-widest">{t("Customer", "కస్టమర్", "ग्राहक")}</th>
                            <th className="pb-4 text-[10px] font-medium text-gray-400 uppercase tracking-widest">{t("Product", "ఉత్పత్తి", "उत्पाद")}</th>
                            <th className="pb-4 text-[10px] font-medium text-gray-400 uppercase tracking-widest">{t("Status", "స్థితి", "स्थिति")}</th>
                            <th className="pb-4 text-right text-[10px] font-medium text-gray-400 uppercase tracking-widest">{t("Amount", "మొత్తం", "मात्रा")}</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {recentOrders.map((order) => (
                            <tr key={order.id} className="group hover:bg-gray-50/50 transition-all cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                               <td className="py-4">
                                  <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">{order.customers?.name}</p>
                                  <p className="text-[10px] font-mono text-gray-400 uppercase">{order.friendly_id || `#${order.id.split('-')[0]}`}</p>
                               </td>
                               <td className="py-4">
                                  <span className="text-xs font-medium text-gray-600">{order.job_type || "-"}</span>
                               </td>
                               <td className="py-4">
                                  <span className={cn(
                                     "px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-tighter",
                                     order.status === 'DELIVERED' ? "bg-green-100 text-green-700" :
                                     order.status === 'READY' ? "bg-blue-100 text-blue-700" :
                                     "bg-orange/10 text-orange"
                                  )}>
                                     {order.status}
                                  </span>
                               </td>
                               <td className="py-4 text-right">
                                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
              )}
              
              <div className="mt-8 pt-6 border-t border-gray-50 flex justify-center">
                 <Link href="/dashboard/orders" className="text-xs font-semibold text-primary hover:underline uppercase tracking-widest">
                    {t("View All Jobs", "అన్ని పనులు చూడండి", "सभी कार्य देखें")}
                 </Link>
              </div>
           </div>
        </div>
      </div>

      {/* Secondary Analytics Section */}
      <div className="pt-10 border-t border-gray-100">
         <div className="mb-8">
            <h2 className="text-xl font-semibold text-[#1e3a5f]">{t("Business Performance", "వ్యాపార పనితీరు", "व्यवसाय प्रदर्शन")}</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">{t("Insights and trends for your shop", "మీ షాప్ కోసం అంతర్దృష్టులు", "आपकी दुकान के लिए अंतर्दृष्टि और रुझान")}</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Revenue Trend */}
           <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm h-[400px]">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-semibold text-gray-900">{t("Revenue Trend", "ఆదాయం సరళి", "आय का रुझान")}</h3>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Last 6 Months</span>
             </div>
             {loading ? (
               <div className="flex flex-col items-center justify-center h-[280px]">
                   <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
               </div>
             ) : (
               <div className="h-[280px]">
                  <DashboardCharts data={monthlyTrend} type="line" />
               </div>
             )}
           </div>

           {/* Job Types */}
           <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm h-[400px]">
             <h3 className="text-lg font-semibold text-gray-900 mb-8">{t("Revenue by Product", "ఆర్డర్ రకాలు", "उत्पाद के अनुसार आय")}</h3>
             {loading ? (
                 <div className="flex flex-col items-center justify-center h-[280px]">
                     <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
                 </div>
             ) : (
               <div className="h-[280px]">
                  <DashboardCharts data={chartData} type="bar" />
               </div>
             )}
           </div>
         </div>
      </div>
    </div>
  );
}
