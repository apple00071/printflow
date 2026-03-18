"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Users, 
  IndianRupee, 
  Clock,
  Loader2 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { useLanguage } from "@/lib/context/LanguageContext";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";

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
  status: string;
  customers: {
    name: string;
  };
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [chartData, setChartData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [tenant, setTenant] = useState<{ plan: string; orders_this_month: number } | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const currentTenant = await getCurrentTenant(supabase);
        setTenant(currentTenant);

        const today = new Date().toISOString().split('T')[0];

        // 1. Fetch Orders
        const { data: dbOrders, error: orderError } = await supabase
          .from("orders")
          .select("*, customers(name)")
          .order('created_at', { ascending: false });
        
        if (orderError) throw orderError;

        // 2. Fetch Customers Count
        const { count: customerCount, error: custError } = await supabase
          .from("customers")
          .select("*", { count: 'exact', head: true });
        
        if (custError) throw custError;

        // 3. Process Stats
        const todayOrders = (dbOrders || []).filter(o => o.created_at.startsWith(today));
        const todayRevenue = todayOrders.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
        const pendingCount = (dbOrders || []).filter(o => o.status !== 'DELIVERED').length;

        setStats([
          { label: t("Today's Orders", "నేటి ఆర్డర్లు"), value: todayOrders.length.toString(), icon: ShoppingBag, color: "bg-blue-500" },
          { label: t("Pending Orders", "పెండింగ్ ఆర్డర్లు"), value: pendingCount.toString(), icon: Clock, color: "bg-orange" },
          { label: t("Today's Revenue", "నేటి ఆదాయం"), value: formatCurrency(todayRevenue), icon: IndianRupee, color: "bg-green-500" },
          { label: t("Total Customers", "కస్టమర్లు"), value: (customerCount || 0).toString(), icon: Users, color: "bg-purple-500" },
        ]);

        setRecentOrders((dbOrders || []).slice(0, 5));

        // 4. Group by Job Type for Chart
        const jobGroups = (dbOrders || []).reduce((acc: Record<string, number>, curr) => {
          const type = curr.job_type || 'Other';
          acc[type] = (acc[type] || 0) + Number(curr.total_amount || 0);
          return acc;
        }, {});

        const chartColors = ["#1e3a5f", "#f97316", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6"];
        const localChartData = Object.keys(jobGroups).map((name, i) => ({
          name,
          value: jobGroups[name],
          color: chartColors[i % chartColors.length]
        })).sort((a, b) => b.value - a.value).slice(0, 6);

        setChartData(localChartData);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [t]); 

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
             Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse h-24"></div>
             ))
        ) : stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`${stat.color} p-3 rounded-lg text-white`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 ">{stat.label}</p>
              <p className="text-2xl  text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Meter & Plan Status */}
      {!loading && tenant && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">{t("Monthly Usage", "నెలవారీ వినియోగం")}</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">{tenant.plan === 'FREE' ? t("Free Plan Limit: 50 Orders", "ఉచిత ప్లాన్ పరిమితి: 50 ఆర్డర్లు") : t("Unlimited Pro Plan", "అపరిమిత ప్రో ప్లాన్")}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-primary">{tenant.orders_this_month || 0}</span>
              <span className="text-xs text-gray-300"> / {tenant.plan === 'FREE' ? 50 : '∞'}</span>
            </div>
          </div>
          {tenant.plan === 'FREE' && (
            <div className="space-y-2">
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    ((tenant.orders_this_month || 0) / 50) > 0.8 ? 'bg-red-500' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(((tenant.orders_this_month || 0) / 50) * 100, 100)}%` }}
                />
              </div>
              {((tenant.orders_this_month || 0) / 50) > 0.8 && (
                <p className="text-[10px] text-red-500 font-bold animate-pulse uppercase tracking-tighter">
                  {t("Warning: You are approaching your monthly limit. Upgrade soon!", "హెచ్చరిక: మీరు మీ నెలవారీ పరిమితికి చేరుకుంటున్నారు. త్వరలో అప్‌గ్రేడ్ చేయండి!")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[350px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg  text-gray-900">{t("Recent Orders", "ఇటీవలి ఆర్డర్లు")}</h2>
            <Link href="/dashboard/orders" className="text-primary text-sm  hover:underline">
              {t("View All", "అన్నీ చూడండి")}
            </Link>
          </div>
          <div className="space-y-4">
             {loading ? (
                <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                   <Loader2 className="w-8 h-8 animate-spin mb-2" />
                   <p className="text-sm">{t("Loading orders...", "ఆర్డర్లు లోడ్ అవుతున్నాయి...")}</p>
                </div>
             ) : recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                    <ShoppingBag className="w-12 h-12 text-gray-100 mb-2" />
                    <p className="text-sm">{t("No recent orders found", "ఇటీవలి ఆర్డర్లు లేవు")}</p>
                </div>
             ) : recentOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-all">
                   <div className="flex flex-col">
                      <span className="text-sm  text-gray-900">{order.customers?.name || "Unknown"}</span>
                      <span className="text-[10px] text-gray-400  font-mono uppercase">{order.friendly_id || `#${order.id.split('-')[0]}`}</span>
                   </div>
                   <div className="text-right">
                      <p className="text-sm  text-primary">{formatCurrency(order.total_amount)}</p>
                      <p className="text-[10px]  text-orange uppercase tracking-tighter">{order.status}</p>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Orders by Job Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[350px]">
          <h2 className="text-lg  text-gray-900 mb-6">{t("Revenue by Job Type", "ఆర్డర్ రకాలు")}</h2>
          {loading ? (
             <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm">{t("Generating chart...", "చార్ట్ తయారవుతోంది...")}</p>
             </div>
          ) : (
             <DashboardCharts data={chartData} />
          )}
        </div>
      </div>
    </div>
  );
}
