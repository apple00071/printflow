"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  IndianRupee, 
  Clock,
  Loader2,
  Search,
  ClipboardList
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
      {/* Top Professional Header */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-5">
           {tenantInfo?.logo_url ? (
              <img src={tenantInfo.logo_url} alt="Logo" className="w-14 h-14 rounded-2xl object-contain border border-gray-100 p-1 bg-gray-50" />
           ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/5">
                 <ShoppingBag className="w-7 h-7 text-primary" />
              </div>
           )}
           <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight tracking-tight">
                 {tenantInfo?.name || "PrintFlow"}
              </h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                 {t("Print Shop Management", "ప్రింట్ షాప్ మేనేజ్‌మెంట్", "प्रिंट शॉप प्रबंधन")}
              </p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="text-center px-4 py-1 border-x border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Jobs", "పనులు", "कार्य")}</p>
              <p className="text-lg font-bold text-gray-900">{tenantInfo?.orders_this_month || 0}</p>
           </div>
           <div className="text-center px-4 py-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Today", "ఈరోజు", "आज")}</p>
              <p className="text-sm font-bold text-gray-600">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
           </div>
        </div>
      </div>

      {/* Usage Banner */}
      <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-2xl px-6 py-3 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="text-xs font-medium text-blue-800">
               {tenantInfo?.orders_this_month || 0} {t("jobs this month on Free Plan (UTC)", "ఈ నెల పనులు ఫ్రీ ప్లాన్‌లో ఉన్నాయి", "इस महीने के कार्य फ्री प्लान पर हैं")}
            </p>
         </div>
         <Link href="/dashboard/billing" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">
            {t("View plans", "ప్లాన్‌లు చూడండి", "प्लान देखें")}
         </Link>
      </div>

      {/* Quick Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
         {[
            { label: t("Dashboard", "డాష్బోర్డ్", "डैशबोर्ड"), href: "/dashboard", active: true },
            { label: t("Quotes", "కొటేషన్లు", "कोटेशन"), href: "/dashboard/quotations" },
            { label: t("Ledger", "లెడ్జర్", "लेजर"), href: "/dashboard/orders" },
            { label: t("Statements", "స్టేట్‌మెంట్స్", "स्टेटमेंट"), href: "/dashboard/billing" },
            { label: t("Customers", "కస్టమర్లు", "ग्राहक"), href: "/dashboard/customers" },
            { label: t("Settings", "సెట్టింగులు", "सेटिंग्स"), href: "/dashboard/settings" },
         ].map((pill) => (
            <Link 
               key={pill.href} 
               href={pill.href}
               className={cn(
                  "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
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

      {/* Main Functional Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Add */}
        <div className="lg:col-span-4 space-y-6">
           <QuickJobForm />
           
           {/* Mini Stats Grid for sidebar */}
           <div className="grid grid-cols-1 gap-4">
             {stats.map((stat) => (
               <div key={stat.label} className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all group">
                 <div className={`${stat.color} p-3 rounded-2xl text-white shadow-lg shadow-current/10 group-hover:scale-110 transition-transform`}>
                   <stat.icon className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                    <p className="text-lg font-bold text-gray-900 tracking-tight">{stat.value}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Right Column: Recent Jobs */}
        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-gray-900">{t("Recent jobs", "ఇటీవలి పనులు", "हाल के कार्य")}</h2>
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
                            <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Customer", "కస్టమర్", "ग्राहक")}</th>
                            <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Product", "ఉత్పత్తి", "उत्पाद")}</th>
                            <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Status", "స్థితి", "स्थिति")}</th>
                            <th className="pb-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Amount", "మొత్తం", "मात्रा")}</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {recentOrders.map((order) => (
                            <tr key={order.id} className="group hover:bg-gray-50/50 transition-all cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                               <td className="py-4">
                                  <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{order.customers?.name}</p>
                                  <p className="text-[10px] font-mono text-gray-400 uppercase">{order.friendly_id || `#${order.id.split('-')[0]}`}</p>
                               </td>
                               <td className="py-4">
                                  <span className="text-xs font-medium text-gray-600">{order.job_type || "-"}</span>
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
              )}
              
              <div className="mt-8 pt-6 border-t border-gray-50 flex justify-center">
                 <Link href="/dashboard/orders" className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">
                    {t("View Full Ledger", "పూర్తిగా చూడండి", "पूरा लेजर देखें")}
                 </Link>
              </div>
           </div>
        </div>
      </div>

      {/* Secondary Analytics Section */}
      <div className="pt-10 border-t border-gray-100">
         <div className="mb-8">
            <h2 className="text-xl font-bold text-[#1e3a5f]">{t("Business Performance", "వ్యాపార పనితీరు", "व्यवसाय प्रदर्शन")}</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">{t("Insights and trends for your shop", "మీ షాప్ కోసం అంతర్దృష్టులు", "आपकी दुकान के लिए अंतर्दृष्टि और रुझान")}</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Revenue Trend */}
           <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm h-[400px]">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-gray-900">{t("Revenue Trend", "ఆదాయం సరళి", "आय का रुझान")}</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last 6 Months</span>
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
             <h3 className="text-lg font-bold text-gray-900 mb-8">{t("Revenue by Product", "ఆర్డర్ రకాలు", "उत्पाद के अनुसार आय")}</h3>
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
