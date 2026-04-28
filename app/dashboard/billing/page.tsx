"use client";

import { useState, useEffect } from "react";
import { 
  Receipt, 
  TrendingUp, 
  Clock, 
  Plus,
  Loader2,
  FileText,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  CheckCircle2,
  X,
  Zap
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { useLanguage } from "@/lib/context/LanguageContext";
import AddPaymentModal from "@/components/dashboard/AddPaymentModal";

interface Order {
  id: string;
  friendly_id?: string;
  created_at: string;
  total_amount: number;
  total_with_gst?: number;
  advance_paid: number;
  status: string;
  customers?: {
    name: string;
  } | null;
}

export default function BillingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstandingBalance: 0,
    pendingPayments: 0
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaidPlan, setIsPaidPlan] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const currentTenant = await getCurrentTenant(supabase);

      // Determine plan
      if (currentTenant) {
        const tier1 = (currentTenant.subscription_tier || '').toString().toUpperCase().trim();
        const tier2 = (currentTenant.plan || '').toString().toUpperCase().trim();
        const PAID = ['PRO', 'BUSINESS', 'ENTERPRISE'];
        const paid = PAID.includes(tier1) && PAID.includes(tier2);
        const isExpiredTrial =
          paid &&
          currentTenant.trial_ends_at &&
          new Date(currentTenant.trial_ends_at) < new Date();
        setIsPaidPlan(paid && !isExpiredTrial);
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(name)")
        .eq('tenant_id', currentTenant?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      const rev = (data || []).reduce((acc, ord) => acc + Number(ord.advance_paid || 0), 0);
      const bal = (data || []).reduce((acc, ord) => acc + (Number(ord.total_with_gst || ord.total_amount || 0) - Number(ord.advance_paid || 0)), 0);
      const pendingCount = (data || []).filter(ord => (Number(ord.total_with_gst || ord.total_amount || 0) - Number(ord.advance_paid || 0)) > 0.01).length;

      setOrders(data || []);
      setStats({
        totalRevenue: Math.round(rev * 100) / 100,
        outstandingBalance: Math.round(bal * 100) / 100,
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

  const handleGSTClick = () => {
    if (isPaidPlan) {
      router.push('/dashboard/billing/gst-reports');
    } else {
      setShowUpgradeModal(true);
    }
  };

  const benefits = [
    { icon: FileSpreadsheet, title: t("Monthly GST Summary", "నెలవారీ GST సారాంశం"), desc: t("Auto-compiled B2B & B2C tax breakdowns every month", "ప్రతి నెలా B2B & B2C పన్ను వివరాలు స్వయంచాలకంగా") },
    { icon: Download, title: t("GSTR-1 CSV Export", "GSTR-1 CSV ఎగుమతి"), desc: t("One-click export ready for your CA or tax portal upload", "CA లేదా పన్ను పోర్టల్ కోసం ఒక క్లిక్ ఎగుమతి") },
    { icon: ShieldCheck, title: t("CGST / SGST / IGST Tracking", "CGST / SGST / IGST ట్రాకింగ్"), desc: t("Automatic tax calculation on every invoice you generate", "ప్రతి ఇన్వాయిస్‌లో స్వయంచాలక పన్ను లెక్కింపు") },
    { icon: TrendingUp, title: t("Taxable Value Reports", "పన్ను విధించదగిన విలువ నివేదికలు"), desc: t("Track revenue, outstanding balances and tax liability at a glance", "రాబడి, బకాయిలు మరియు పన్ను బాధ్యతను చూడండి") },
  ];

  const statCards = [
    { label: t("Total Revenue (Advances)", "మొత్తం రాబడి (అడ్వాన్స్)"), value: stats.totalRevenue, color: "bg-green-500", icon: TrendingUp },
    { label: t("Outstanding Balance", "మొత్తం బకాయిలు"), value: stats.outstandingBalance, color: "bg-red-500", icon: Clock },
    { label: t("Active Pending Payments", "పెండింగ్ చెల్లింపులు"), value: stats.pendingPayments, color: "bg-orange", icon: Receipt, isCount: true },
  ];

  return (
    <div className="space-y-8">

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Top banner */}
            <div className="bg-white border-b border-gray-50 p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              {/* Close button */}
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors z-10"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">PRO Feature</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-50 rounded-2xl">
                    <FileSpreadsheet className="w-8 h-8 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold uppercase tracking-tighter leading-tight text-gray-900">
                      {t("GST Reports & Compliance", "GST నివేదికలు & కంప్లయన్స్")}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1 font-medium">
                      {t("Available on Pro & Business plans", "Pro & Business ప్లాన్లలో అందుబాటులో ఉంది")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                {t("What you unlock with Pro", "Pro తో మీకు లభించేవి")}
              </p>
              <ul className="space-y-3">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="p-1.5 bg-green-50 rounded-lg mt-0.5 flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{b.title}</p>
                      <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing + CTA */}
            <div className="px-6 pb-6 space-y-3">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 uppercase tracking-widest font-semibold">Pro Plan</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-semibold text-gray-900">₹499</span>
                    <span className="text-xs text-gray-400 font-medium">/ month</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Includes</p>
                  <p className="text-xs text-gray-600 font-semibold">Unlimited orders + All reports</p>
                </div>
              </div>
              <Link
                href="/dashboard/settings"
                onClick={() => setShowUpgradeModal(false)}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 rounded-2xl text-sm font-semibold uppercase tracking-widest shadow-lg shadow-orange-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {t("Upgrade to Pro Now", "ఇప్పుడు Pro కు అప్‌గ్రేడ్ చేయండి")}
              </Link>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 font-medium hover:text-gray-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                {t("Maybe later", "తర్వాత చేస్తాను")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 uppercase tracking-tighter">{t("Billing & Finance", "బిల్లింగ్ మరియు ఫైనాన్స్")}</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">{t("Revenue & Tax Management", "రాబడి మరియు పన్ను నిర్వహణ")}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* GST Reports — intercepts for FREE users */}
          <button
            onClick={handleGSTClick}
            className="relative bg-gray-50 text-gray-900 border border-gray-100 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-gray-100 active:scale-[0.97] transition-all"
          >
            <TrendingUp className="w-4 h-4 text-primary" /> {t("GST Reports", "GST నివేదికలు")}
            {!isPaidPlan && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm border border-white">PRO</span>
            )}
          </button>
          <button 
            onClick={() => setIsPaymentModalOpen(true)}
            className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm"
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
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-xl font-semibold text-gray-900 tracking-tight">
                    {stat.isCount ? stat.value : formatCurrency(stat.value)}
                  </p>
               </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
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
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-semibold uppercase tracking-widest">
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
                  const balance = Number(ord.total_with_gst || ord.total_amount) - Number(ord.advance_paid);
                  return (
                    <tr key={ord.id} className="hover:bg-gray-50/50 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="text-[10px]  font-mono text-gray-400 uppercase">{ord.friendly_id || `# ${ord.id.split('-')[0]}`}</span>
                         <p className="text-[10px] font-medium text-gray-400">{formatDate(ord.created_at)}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{ord.customers?.name || "Walk-in"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[9px]  rounded-full uppercase tracking-widest ${
                          ord.status === "DELIVERED" ? "bg-gray-100 text-gray-600" : "bg-primary text-white"
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-green-600">+{formatCurrency(ord.advance_paid)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-semibold ${balance > 0 ? "text-red-500" : "text-gray-300"}`}>
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
                              className="bg-primary/10 text-primary text-[10px] font-normal px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white active:scale-[0.95] transition-all uppercase tracking-wider shadow-sm shadow-primary/5"
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
          balanceDue={selectedOrder ? Math.round((Number(selectedOrder.total_with_gst || selectedOrder.total_amount) - Number(selectedOrder.advance_paid)) * 100) / 100 : undefined}
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
