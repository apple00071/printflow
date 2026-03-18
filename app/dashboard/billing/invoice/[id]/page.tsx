"use client";

import { useState, useEffect } from "react";
import { Printer, ArrowLeft, CheckCircle2, IndianRupee, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { PRESS_CONFIG } from "@/lib/config";
import { getOrder } from "@/lib/supabase/actions";

import { useLanguage } from "@/lib/context/LanguageContext";

export default function InvoicePage({ params }: { params: { id: string } }) {
  const { t } = useLanguage();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      try {
        const data = await getOrder(params.id);
        setOrder(data);
      } catch (err) {
        console.error("Error fetching invoice data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-20 text-gray-400">
       <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
       <p className="text-sm uppercase tracking-widest">{t("Generating Invoice...", "ఇన్వాయిస్ తయారవుతోంది...")}</p>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-20 text-gray-400 text-center">
       <h2 className="text-2xl text-gray-900 mb-2 uppercase">{t("Invoice Not Found", "ఇన్వాయిస్ కనుగొనబడలేదు")}</h2>
       <p className="mb-6">{t("The order ID provided does not exist in our system.", "అందించిన ఆర్డర్ ఐడి మా సిస్టమ్‌లో లేదు.")}</p>
       <Link href="/dashboard/orders" className="bg-primary text-white px-8 py-3 rounded-xl shadow-lg shadow-primary/20">{t("Back to Orders", "ఆర్డర్‌లకు తిరిగి వెళ్లండి")}</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-full mx-auto space-y-6">
        {/* Actions - Hidden on Print */}
        <div className="flex items-center justify-between print:hidden">
          <Link 
            href={`/dashboard/orders/${order.id}`}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("Back to Order", "ఆర్డర్‌కు తిరిగి వెళ్లండి")}
          </Link>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <Printer className="w-4 h-4" />
            {t("Print Invoice", "ప్రింట్ బిల్")}
          </button>
        </div>

        {/* Invoice Body */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none print:rounded-none">
          {/* Header */}
          <div className="bg-primary text-white p-8 sm:p-12 flex flex-col sm:flex-row justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <Printer className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl uppercase tracking-tighter">{PRESS_CONFIG.name}</h1>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">{t("Quality Printing Services", "క్వాలిటీ ప్రింటింగ్ సర్వీసెస్")}</p>
                </div>
              </div>
              <div className="text-xs text-white/70 space-y-1">
                <p>{PRESS_CONFIG.address}</p>
                <p>{t("Phone", "ఫోన్")}: {PRESS_CONFIG.phone} | UPI: {PRESS_CONFIG.upiId}</p>
              </div>
            </div>
            <div className="text-right flex flex-col justify-end">
              <h2 className="text-4xl uppercase text-white/20 mb-2">{t("Invoice", "ఇన్వాయిస్")}</h2>
              <p className="text-sm uppercase tracking-tight"> {order.friendly_id || `# ${order.id.split('-')[0]}`}</p>
              <p className="text-xs text-white/60 tracking-wide">{t("DATE", "తేదీ")}: {formatDate(order.created_at)}</p>
            </div>
          </div>

          <div className="p-8 sm:p-12 space-y-10">
            {/* Customer & Order Summary */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <h3 className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">{t("Bill To", "కస్టమర్")}</h3>
                <div className="space-y-1">
                  <p className="text-lg text-gray-900">{order.customers.name}</p>
                  <p className="text-sm text-primary">{order.customers.phone}</p>
                  <p className="text-xs text-gray-500">CHIRALA, AP</p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">{t("Job Description", "పని వివరాలు")}</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-900 leading-tight">{order.job_type}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-tighter">{t("Qty", "క్వాంటిటీ")}: {order.quantity} | {t("Size", "సైజు")}: {order.size || t("Standard", "స్టాండర్డ్")}</p>
                  <p className="text-xs text-gray-500 italic">{t("Paper", "పేపర్")}: {order.paper_type || t("N/A", "లేదు")}</p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
               <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">{t("Description", "వివరణ")}</th>
                      <th className="px-6 py-4 text-center">{t("Qty", "క్వాంటిటీ")}</th>
                      <th className="px-6 py-4 text-right">{t("Amount", "ధర")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                    <tr>
                      <td className="px-6 py-8 text-gray-900">{t("Printing of", "ప్రింటింగ్:")} {order.job_type}</td>
                      <td className="px-6 py-8 text-center">{order.quantity}</td>
                      <td className="px-6 py-8 text-right text-primary">{formatCurrency(order.total_amount)}</td>
                    </tr>
                  </tbody>
               </table>
            </div>

            {/* Footer Summary */}
            <div className="flex flex-col sm:flex-row justify-between gap-12 pt-6">
              <div className="max-w-xs space-y-4">
                 <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <h4 className="text-[10px] text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
                       <CheckCircle2 className="w-3 h-3 text-green-500" />
                       {t("Terms & Conditions", "నిబంధనలు & షరతులు")}
                    </h4>
                    <p className="text-[9px] text-gray-400 leading-relaxed italic">
                      {t("1. Goods once sold will not be taken back.", "1. అమ్మిన వస్తువులు తిరిగి తీసుకోబడవు.")}<br />
                      {t("2. We are not responsible for any delay in transport.", "2. రవాణాలో జరిగే ఆలస్యానికి మేము బాధ్యులం కాదు.")}<br />
                      {t("3. Subject to Chirala Jurisdiction only.", "3. వివాదాలు చీరాల కోర్టు పరిధిలోకి మాత్రమే వస్తాయి.")}
                    </p>
                 </div>
              </div>

              <div className="w-full sm:w-64 space-y-3">
                <div className="flex justify-between items-center text-sm px-2">
                  <span className="text-gray-500 uppercase tracking-tighter">{t("Sub Total", "మొత్తం")}</span>
                  <span className="text-gray-900">{formatCurrency(order.total_amount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-green-600 px-2 italic">
                  <span className="text-gray-500 uppercase tracking-tighter italic">(-) {t("Advance Paid", "చెల్లించిన అడ్వాన్స్")}</span>
                  <span className="italic">-{formatCurrency(order.advance_paid)}</span>
                </div>
                <div className="pt-4 border-t-4 border-primary flex justify-between items-center bg-primary text-white p-5 rounded-2xl shadow-xl shadow-primary/20">
                  <span className="text-[10px] uppercase tracking-widest">{t("Balance Due", "బకాయి")}</span>
                  <span className="text-2xl">{formatCurrency(order.total_amount - order.advance_paid)}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-20 flex justify-between items-end">
               <div className="text-center space-y-6">
                  <div className="w-32 border-b border-gray-200" />
                  <p className="text-[10px] text-gray-400 uppercase">{t("Customer Sign", "కస్టమర్ సంతకం")}</p>
               </div>
               <div className="text-center space-y-2">
                  <p className="text-[10px] text-primary uppercase tracking-widest">{t("For", "కోసం")} {PRESS_CONFIG.name}</p>
                  <p className="text-[8px] text-gray-400 italic mb-6">{t("Authorized Signatory", "అధికారిక సంతకం")}</p>
                  <div className="w-32 border-b border-gray-200" />
               </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-[10px] text-gray-400 uppercase tracking-[0.2em] print:mt-12">
           {t("Generated on", "రూపొందించబడింది")} {formatDateTime(new Date())} • chirala, ap, india
        </p>
      </div>
    </div>
  );
}
