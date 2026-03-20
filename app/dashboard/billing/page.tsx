"use client";

import { useState, useEffect } from "react";
import { 
  Receipt, 
  TrendingUp, 
  Clock, 
  Plus,
  Loader2,
  FileText
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { useLanguage } from "@/lib/context/LanguageContext";
import AddPaymentModal from "@/components/dashboard/AddPaymentModal";

interface Order {
  id: string;
  friendly_id?: string;
  created_at: string;
  total_amount: number;
  advance_paid: number;
  status: string;
  customers?: {
    name: string;
  } | null;
}

export default function BillingPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstandingBalance: 0,
    pendingPayments: 0
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const currentTenant = await getCurrentTenant(supabase);
      
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(name)")
        .eq('tenant_id', currentTenant?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      const rev = (data || []).reduce((acc, ord) => acc + Number(ord.advance_paid || 0), 0);
      const bal = (data || []).reduce((acc, ord) => acc + (Number(ord.total_amount || 0) - Number(ord.advance_paid || 0)), 0);
      const pendingCount = (data || []).filter(ord => (Number(ord.total_amount || 0) - Number(ord.advance_paid || 0)) > 0).length;

      setOrders(data || []);
      setStats({
        totalRevenue: rev,
        outstandingBalance: bal,
        pendingPayments: pendingCount
      });
    } catch {
      console.error("Error fetching billing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const statCards = [
    { label: t("Total Revenue (Advances)", "మొత్తం రాబడి (అడ్వాన్స్)"), value: stats.totalRevenue, color: "bg-green-500", icon: TrendingUp },
    { label: t("Outstanding Balance", "మొత్తం బకాయిలు"), value: stats.outstandingBalance, color: "bg-red-500", icon: Clock },
    { label: t("Active Pending Payments", "పెండింగ్ చెల్లింపులు"), value: stats.pendingPayments, color: "bg-orange", icon: Receipt, isCount: true },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-medium text-gray-900 uppercase tracking-tighter">{t("Billing & Finance", "బిల్లింగ్ మరియు ఫైనాన్స్")}</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t("Revenue & Tax Management", "రాబడి మరియు పన్ను నిర్వహణ")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/billing/gst-reports" className="bg-white text-primary border border-primary/20 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-primary/5 hover:border-primary/40 active:scale-[0.97] transition-all shadow-sm">
            <TrendingUp className="w-4 h-4" /> {t("GST Reports", "GST నివేదికలు")}
          </Link>
          <button 
            onClick={() => setIsPaymentModalOpen(true)}
            className="bg-gradient-to-br from-primary to-[#2a4d7d] text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.97] transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> {t("New Transaction", "కొత్త లావాదేవీ")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
           {[1, 2, 3].map(i => (
             <div key={i} className="bg-gray-100 h-24 rounded-xl"></div>
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className={`${stat.color} p-3 rounded-lg text-white`}>
                  <stat.icon className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm text-gray-500 ">{stat.label}</p>
                  <p className="text-xl  text-gray-900">
                    {stat.isCount ? stat.value : formatCurrency(stat.value)}
                  </p>
               </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-lg  text-gray-900">
            {t("Recent Revenue Events", "ఇటీవలి రాబడి")}
          </h2>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400">
             <Loader2 className="w-10 h-10 animate-spin mb-4" />
             <p className="text-sm">{t("Loading transactions...", "లావాదేవీలు లోడ్ అవుతున్నాయి...")}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400 text-center">
             <Receipt className="w-10 h-10 mb-4 opacity-20" />
             <p className=" text-gray-900">{t("No Transactions Found", "లావాదేవీలు లేవు")}</p>
             <p className="text-xs">{t("Create an order to see revenue updates here", "రాబడి నవీకరణలను ఇక్కడ చూడటానికి ఒక ఆర్డర్ సృష్టించండి")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs  uppercase tracking-wider">
                  <th className="px-6 py-4">{t("Reference", "రెఫరెన్స్")}</th>
                  <th className="px-6 py-4">{t("Customer", "కస్టమర్")}</th>
                  <th className="px-6 py-4">{t("Status", "స్థితి")}</th>
                  <th className="px-6 py-4 text-right">{t("Income (Advance)", "ఆదాయం (అడ్వాన్స్)")}</th>
                  <th className="px-6 py-4 text-right">{t("Balance Due", "బకాయి")}</th>
                  <th className="px-6 py-4 text-right">{t("Actions", "చర్యలు")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((ord) => {
                  const balance = Number(ord.total_amount) - Number(ord.advance_paid);
                  return (
                    <tr key={ord.id} className="hover:bg-gray-50/50 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="text-[10px]  font-mono text-gray-400 uppercase">{ord.friendly_id || `# ${ord.id.split('-')[0]}`}</span>
                         <p className="text-[10px] text-gray-400">{formatDate(ord.created_at)}</p>
                      </td>
                      <td className="px-6 py-4 text-sm  text-gray-900">{ord.customers?.name || "Walk-in"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[9px]  rounded-full uppercase tracking-widest ${
                          ord.status === "DELIVERED" ? "bg-gray-100 text-gray-600" : "bg-primary text-white"
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm  text-green-600">+{formatCurrency(ord.advance_paid)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm  ${balance > 0 ? "text-red-500" : "text-gray-300"}`}>
                           {balance > 0 ? formatCurrency(balance) : t("PAID", "చెల్లించారు")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {balance > 0 && (
                            <button 
                              onClick={() => {
                                setSelectedOrder(ord);
                                setIsPaymentModalOpen(true);
                              }}
                              className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white active:scale-[0.95] transition-all uppercase tracking-wider shadow-sm shadow-primary/5"
                            >
                              {t("PAY", "పేమెంట్")}
                            </button>
                          )}
                          <Link 
                            href={`/dashboard/billing/invoice/${ord.id}`}
                            className="bg-gray-50 text-gray-500 hover:text-primary hover:bg-primary/5 p-1.5 rounded-lg transition-all active:scale-90"
                            title={t("INVOICE", "ఇన్వాయిస్")}
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isPaymentModalOpen && (
        <AddPaymentModal
          orderId={selectedOrder?.id}
          balanceDue={selectedOrder ? (Number(selectedOrder.total_amount) - Number(selectedOrder.advance_paid)) : undefined}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            fetchBillingData();
          }}
        />
      )}
    </div>
  );
}
