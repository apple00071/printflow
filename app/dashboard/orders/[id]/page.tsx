"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Printer, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Edit3,
  IndianRupee,
  FileText,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { PRESS_CONFIG } from "@/lib/config";
import { getOrder, updateOrderStatus } from "@/lib/supabase/actions";

import { useLanguage } from "@/lib/context/LanguageContext";

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const { t, language } = useLanguage();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const statuses = [
    t("RECEIVED", "వచ్చింది"),
    t("DESIGNING", "డిజైనింగ్"),
    t("PRINTING", "ప్రింటింగ్"),
    t("READY", "సిద్ధంగా ఉంది"),
    t("DELIVERED", "డెలివరీ అయింది")
  ];

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      try {
        const data = await getOrder(params.id);
        setOrder(data);
      } catch (err) {
        console.error("Error fetching order:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [params.id]);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      setOrder({ ...order, status: newStatus });
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400">
       <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
       <p className="text-sm font-bold">{t("Loading Order Details...", "ఆర్డర్ వివరాలు లోడ్ అవుతున్నాయి...")}</p>
    </div>
  );

  if (!order) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400 text-center">
       <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("Order Not Found", "ఆర్డర్ కనుగొనబడలేదు")}</h2>
       <p className="mb-6">{t("The order ID provided does not exist in our system.", "అందించిన ఆర్డర్ ఐడి మా సిస్టమ్‌లో లేదు.")}</p>
       <Link href="/dashboard/orders" className="bg-primary text-white px-6 py-2 rounded-lg font-bold">
         {t("Back to Orders", "ఆర్డర్‌లకు తిరిగి వెళ్లండి")}
       </Link>
    </div>
  );

  const getWhatsAppLink = () => {
    const balance = order.total_amount - order.advance_paid;
    let message = "";
    if (language === "te") {
      message = `నమస్కారం ${order.customers.name} గారు, మీ ${order.job_type} ఆర్డర్ సిద్ధంగా ఉంది. మొత్తం: ₹${order.total_amount}. అడ్వాన్స్: ₹${order.advance_paid}. బకాయి: ₹${balance}. - ${PRESS_CONFIG.name}, చీరాల.`;
    } else {
      message = `Hi ${order.customers.name}, your order of ${order.job_type} is ready for pickup. Total: ₹${order.total_amount}. Advance: ₹${order.advance_paid}. Balance: ₹${balance}. - ${PRESS_CONFIG.name}, Chirala`;
    }
    return `https://wa.me/${order.customers.phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="max-w-full mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orders" className="p-2 hover:bg-white rounded-lg transition-colors border border-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl text-gray-900">{t("Order", "ఆర్డర్")} {order.friendly_id || `#${order.id.split('-')[0]}`}</h1>
            <p className="text-gray-500 text-sm">{order.job_type} {t("for", "కస్టమర్:")} {order.customers.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href={`/dashboard/billing/invoice/${order.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-primary" />
            {t("Print Invoice", "ఇన్వాయిస్ ప్రింట్ చేయండి")}
          </Link>
          <Link 
            href={`/dashboard/orders/edit/${order.id}`}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-primary transition-colors shadow-sm"
          >
            <Edit3 className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Tracker */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative">
            {updating && (
              <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center rounded-xl backdrop-blur-[1px]">
                 <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-6">{t("Order Status", "ఆర్డర్ స్థితి")}</h2>
            <div className="relative flex justify-between items-center px-4">
              {/* Progress Line */}
              <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-gray-100 -z-0" />
              <div 
                className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-primary transition-all duration-500 -z-0" 
                style={{ width: `${(statuses.indexOf(t(order.status, "")) / (statuses.length - 1)) * 92}%` }}
              />

              {statuses.map((s, i) => {
                const isCompleted = statuses.indexOf(t(order.status, "")) >= i;
                return (
                  <button
                    key={s}
                    disabled={updating}
                    onClick={() => handleStatusUpdate(s)}
                    className="relative z-10 flex flex-col items-center gap-2 group"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      isCompleted ? "bg-primary text-white scale-125 shadow-lg shadow-primary/20" : "bg-white border-2 border-gray-200 text-gray-300 group-hover:border-primary/50 group-hover:text-primary/50"
                    )}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "text-[10px] uppercase tracking-tighter absolute -bottom-6 whitespace-nowrap",
                      isCompleted ? "text-primary" : "text-gray-400 font-medium"
                    )}>
                      {s}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="h-8" />
          </div>

          {/* Job Details */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-gray-900 uppercase tracking-wide text-sm">{t("Job Details", "పని వివరాలు")}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t("Quantity", "పరిమాణం")}</p>
                <p className="text-sm text-gray-900">{order.quantity}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t("Paper Type", "పేపర్ రకం")}</p>
                <p className="text-sm text-gray-900">{order.paper_type || t("N/A", "లేదు")}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t("Size", "సైజు")}</p>
                <p className="text-sm text-gray-900">{order.size || t("N/A", "లేదు")}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t("Delivery Date", "డెలివరీ తేదీ")}</p>
                <p className="text-sm text-gray-900">{order.delivery_date || t("TBA", "త్వరలో")}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-50">
               <p className="text-[10px] text-gray-400 uppercase mb-2 tracking-wider">{t("Instructions", "సూచనలు")}</p>
               <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner">
                 {order.instructions || t("No special instructions", "ఎలాంటి ప్రత్యేక సూచనలు లేవు")}
               </p>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Payment Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-2">
              <IndianRupee className="w-5 h-5 text-primary" />
              <h2 className="text-gray-900 uppercase tracking-wide text-sm">{t("Finances", "డబ్బు వివరాలు")}</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{t("Total Amount", "మొత్తం ధర")}</span>
                <span className="text-gray-900">{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-green-600">
                <span className="text-gray-500">{t("Advance Paid", "చెల్లించిన అడ్వాన్స్")}</span>
                <span>-{formatCurrency(order.advance_paid)}</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-400 uppercase tracking-wider">{t("Balance Due", "బకాయి")}</span>
                <span className="text-xl text-primary">{formatCurrency(order.total_amount - order.advance_paid)}</span>
              </div>
            </div>
            <button className="w-full py-2.5 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95 mt-2">
              {t("Add Payment", "పేమెంట్ జోడించండి")}
            </button>
          </div>

          {/* WhatsApp Notification */}
          {order.status === "READY" && (
            <div className="bg-green-50 p-6 rounded-xl border border-green-200 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-green-700">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-sm uppercase">{t("Notify Customer", "కస్టమర్‌కు తెలియజేయండి")}</h3>
              </div>
              <p className="text-xs text-green-600 leading-relaxed">
                {t("The order is READY. Send a WhatsApp notification to the customer about pickup and balance.", "ఆర్డర్ సిద్ధంగా ఉంది. పికప్ మరియు బకాయి గురించి వాట్సాప్ ద్వారా కస్టమర్‌కు తెలియజేయండి.")}
              </p>
              <a 
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all shadow-lg shadow-green-200 active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                {t("Send WhatsApp", "వాట్సాప్ పంపండి")}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>

  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
