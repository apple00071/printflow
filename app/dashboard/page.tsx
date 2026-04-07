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
  total_with_gst?: number;
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
  const [monthlyTrend, setMonthlyTrend] = useState<{ name: string; value: number }[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<{ name: string; value: number; color: string }[]>([]);

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

        const { count: customerCount } = await supabase
          .from("customers")
          .select("*", { count: 'exact', head: true })
          .eq('tenant_id', currentTenant.id);

        // 3. Process Stats
        const todayOrders = (dbOrders || []).filter(o => o.created_at.startsWith(today));
        
        const pendingCount = (dbOrders || []).filter(o => o.status !== 'DELIVERED').length;
        const totalBalanceDue = (dbOrders || []).reduce((acc, curr) => acc + Number(curr.balance_due || 0), 0);

        setStats([
          { label: t("Today's Orders", "నేటి ఆర్డర్లు"), value: todayOrders.length.toString(), icon: ShoppingBag, color: "bg-blue-500" },
          { label: t("Pending Orders", "పెండింగ్ ఆర్డర్లు"), value: pendingCount.toString(), icon: Clock, color: "bg-orange" },
          { label: t("Balance Due", "రావాల్సిన బాకీ"), value: formatCurrency(totalBalanceDue), icon: IndianRupee, color: "bg-red-500" },
          { label: t("Total Customers", "కస్టమర్లు"), value: (customerCount || 0).toString(), icon: Users, color: "bg-purple-500" },
        ]);

        setRecentOrders((dbOrders || []).slice(0, 5));

        // 4. Job Types Chart
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

        // 5. Monthly Trend
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

        // 6. Payment Breakdown
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
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[350px]">
          <h2 className="text-lg font-bold text-gray-900 mb-6">{t("Revenue Trend (Last 6 Months)", "ఆదాయం సరళి (గత 6 నెలలు)")}</h2>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-10">
                <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
            </div>
          ) : (
            <DashboardCharts data={monthlyTrend} type="line" />
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[350px]">
          <h2 className="text-lg font-bold text-gray-900 mb-6">{t("Payment Methods", "చెల్లింపు పద్ధతులు")}</h2>
          {loading ? (
             <div className="flex flex-col items-center justify-center p-10">
                <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
             </div>
          ) : (
            <div className="relative">
                <DashboardCharts data={paymentBreakdown} type="pie" />
                <div className="mt-4 space-y-2">
                    {paymentBreakdown.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                           <div className="flex items-center gap-2">
                               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                               <span className="text-gray-600">{item.name}</span>
                           </div>
                           <span className="font-bold">{formatCurrency(item.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[350px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">{t("Recent Orders", "ఇటీవలి ఆర్డర్లు")}</h2>
            <Link href="/dashboard/orders" className="text-primary text-sm font-medium hover:underline">
              {t("View All", "అన్నీ చూడండి")}
            </Link>
          </div>
          <div className="space-y-4">
             {loading ? (
                <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                   <Loader2 className="w-8 h-8 animate-spin mb-2" />
                </div>
             ) : recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                    <ShoppingBag className="w-12 h-12 text-gray-100 mb-2" />
                    <p className="text-sm">{t("No recent orders found", "ఇటీవలి ఆర్డర్లు లేవు")}</p>
                </div>
             ) : recentOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-all cursor-pointer" onClick={() => window.location.href=`/dashboard/orders/${order.id}`}>
                   <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{order.customers?.name || "Unknown"}</span>
                      <span className="text-[10px] text-gray-400 font-mono uppercase">{order.friendly_id || `#${order.id.split('-')[0]}`}</span>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatCurrency(order.total_with_gst || order.total_amount)}</p>
                      <p className="text-[10px] font-bold text-orange uppercase tracking-tighter">{order.status}</p>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Revenue by Job Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[350px]">
          <h2 className="text-lg font-bold text-gray-900 mb-6">{t("Revenue by Job Type", "ఆర్డర్ రకాలు")}</h2>
          {loading ? (
              <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
              </div>
          ) : (
            <DashboardCharts data={chartData} type="bar" />
          )}
        </div>
      </div>
    </div>
  );
}
