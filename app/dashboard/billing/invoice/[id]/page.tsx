"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Printer, 
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Landmark
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getOrder } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { useLanguage } from "@/lib/context/LanguageContext";

export default function InvoicePage({ params }: { params: { id: string } }) {
  const { t } = useLanguage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [order, setOrder] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const [orderData, tenantData] = await Promise.all([
          getOrder(params.id),
          getCurrentTenant(supabase)
        ]);
        setOrder(orderData);
        setTenant(tenantData);
      } catch (error) {
        console.error("Error fetching invoice data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400">
       <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
       <p className="text-sm uppercase tracking-widest">{t("Generating Invoice...", "బిల్ తయారవుతోంది...")}</p>
    </div>
  );

  if (!order || !tenant) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400 text-center">
       <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
       <h2 className="text-2xl text-gray-900 mb-2">{t("Invoice Not Found", "బిల్ కనుగొనబడలేదు")}</h2>
       <Link href="/dashboard/billing" className="text-primary hover:underline">{t("Back to Billing", "బిల్లింగ్‌కు తిరిగి వెళ్లండి")}</Link>
    </div>
  );

  const finalTotal = order.total_with_gst || order.taxable_amount || order.total_amount;

  const amountInWords = (amount: number) => {
    // Simple implementation - could use a library for production
    return t(`${amount} Rupees Only`, `${amount} రూపాయలు మాత్రమే`);
  };

  return (
    <div className="max-w-full print:max-w-full mx-auto space-y-6 print:space-y-0 print:p-0">
      {/* Actions - Hidden on Print */}
      <div className="flex items-center justify-between print:hidden">
        <Link 
          href="/dashboard/billing"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Back to Billing", "బిల్లింగ్‌కు తిరిగి వెళ్లండి")}
        </Link>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all font-normal"
        >
          <Printer className="w-4 h-4" />
          {t("Print Invoice", "ప్రింట్ బిల్")}
        </button>
      </div>

      {/* Invoice Body */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:border print:border-gray-200 print:rounded-none">
        
        {/* Header Section */}
        <div className="p-8 sm:p-12 print:p-4 border-b-8 border-primary relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 print:hidden" />
          
          <div className="flex flex-col md:flex-row justify-between gap-8 print:gap-2 relative z-10">
            <div className="space-y-4 print:space-y-1">
              {tenant.logo_url ? (
                <div className="relative h-16 w-40 mb-2">
                  <Image 
                    src={tenant.logo_url} 
                    alt={tenant.name} 
                    fill
                    className="object-contain object-left"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-2">
                  <Printer className="w-10 h-10 text-primary" />
                  <h1 className="text-2xl font-normal text-gray-900 tracking-tighter uppercase">{tenant.name}</h1>
                </div>
              )}
              
              <div className="space-y-1 text-xs text-gray-500 leading-tight">
                {tenant.city && <p className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {tenant.city}, {tenant.state}</p>}
                {tenant.phone && <p className="flex items-center gap-2"><Phone className="w-3 h-3" /> {tenant.phone}</p>}
                {tenant.email && <p className="flex items-center gap-2"><Mail className="w-3 h-3" /> {tenant.email}</p>}
                {tenant.gst_number && <p className="font-normal text-gray-700">GSTIN: {tenant.gst_number}</p>}
              </div>
            </div>

            <div className="md:text-right space-y-4 print:space-y-1">
              <h2 className="text-5xl print:text-2xl font-normal text-primary/10 print:text-primary uppercase tracking-tighter absolute top-0 right-0 hidden md:block print:relative print:top-auto print:right-auto">{t("Invoice", "ఇన్వాయిస్")}</h2>
              <div className="pt-12 md:pt-16 print:pt-2">
                <p className="text-sm font-normal text-gray-900">{t("Invoice #", "ఇన్వాయిస్ నంబర్:")} <span className="text-primary">{order.invoice_number || "Draft"}</span></p>
                <p className="text-xs text-gray-500">{t("Date", "తేదీ")}: {formatDate(order.invoice_date || order.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-12 print:p-4 space-y-12 print:space-y-1">
          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-1 bg-gray-50 print:bg-white p-6 print:p-2 rounded-2xl border border-gray-100">
            <div className="space-y-2 print:space-y-0">
              <h3 className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2 mb-2 print:pb-1 print:mb-1">{t("Bill To", "కస్టమర్")}</h3>
              <p className="text-lg print:text-base font-normal text-gray-900">{order.customers.name}</p>
              <p className="text-sm print:text-xs text-gray-600">{order.customers.phone}</p>
              {order.customers.gstin && <p className="text-xs font-normal text-primary mt-1">GSTIN: {order.customers.gstin}</p>}
            </div>
            <div className="space-y-2 print:space-y-0">
              <h3 className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2 mb-2 print:pb-1 print:mb-1">{t("Order Meta", "ఆర్డర్ వివరాలు")}</h3>
              <p className="text-sm print:text-xs text-gray-700 font-bold"><span className="text-gray-400 uppercase text-[9px] tracking-wider font-normal">{t("Order ID", "ఆర్డర్ ఐడి")}:</span> {order.friendly_id || `#${order.id.split('-')[0].toUpperCase()}`}</p>
              <p className="text-sm print:text-xs text-gray-700"><span className="text-gray-400 uppercase text-[9px] tracking-wider">{t("Job", "పని రకం")}:</span> {order.job_type}</p>
              <p className="text-sm print:text-xs text-gray-700"><span className="text-gray-400 uppercase text-[9px] tracking-wider">{t("Size", "సైజు")}:</span> {order.size || "Standard"}</p>
              {order.hsn_code && <p className="text-sm print:text-xs text-gray-700"><span className="text-gray-400 uppercase text-[9px] tracking-wider">HSN:</span> {order.hsn_code}</p>}
            </div>
          </div>

          {/* Main Table */}
          <div className="overflow-hidden">
             <table className="w-full text-left">
                <thead className="text-[10px] text-gray-400 uppercase tracking-widest border-b-2 border-gray-100">
                  <tr>
                    <th className="px-4 py-4 print:py-1">{t("Description", "వివరణ")}</th>
                    <th className="px-4 py-4 print:py-1 text-center">{t("Qty", "క్వాంటిటీ")}</th>
                    <th className="px-4 py-4 print:py-1 text-right">{t("Taxable", "పన్ను విలువ")}</th>
                    {order.gst_type !== 'NONE' && (
                      <th className="px-4 py-4 print:py-1 text-right">{t("GST", "GST")} (%)</th>
                    )}
                    <th className="px-4 py-4 print:py-1 text-right font-normal">{t("Amount", "ధర")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-none text-sm text-gray-700">
                  <tr>
                    <td className="px-4 py-8 print:py-1">
                      <p className="font-normal text-gray-900 leading-tight">{order.job_type}</p>
                      <p className="text-xs text-gray-500 mt-1 print:mt-0">{order.paper_type || "Standard Printing"}</p>
                    </td>
                    <td className="px-4 py-8 print:py-1 text-center">{order.quantity}</td>
                    <td className="px-4 py-8 print:py-1 text-right font-normal">{formatCurrency(order.taxable_amount || order.total_amount)}</td>
                    {order.gst_type !== 'NONE' && (
                      <td className="px-4 py-8 print:py-1 text-right">{order.gst_rate}%</td>
                    )}
                    <td className="px-4 py-8 print:py-1 text-right font-medium text-gray-900">{formatCurrency(finalTotal)}</td>
                  </tr>
                </tbody>
             </table>
          </div>

          {/* Calculations & Summary */}
          <div className="flex flex-col md:flex-row justify-between gap-12 print:gap-1 border-t border-gray-100 pt-8 print:pt-1">
             <div className="flex-1 space-y-6 print:space-y-1">
               <div>
                  <h4 className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{t("Words", "అక్షరాలలో")}</h4>
                  <p className="text-xs font-normal text-gray-800 italic bg-gray-50 print:bg-white p-3 print:p-1 rounded-lg border border-gray-100 leading-tight">{amountInWords(finalTotal)}</p>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:gap-1">
                 <div className="p-4 print:p-1 bg-primary/5 print:bg-white rounded-2xl border border-primary/10">
                    <h4 className="text-[10px] text-primary uppercase tracking-widest mb-1 flex items-center gap-2">
                       <Landmark className="w-3 h-3" />
                       {t("Payment", "చెల్లింపు")}
                    </h4>
                    <p className="text-[10px] text-gray-700 whitespace-pre-line leading-tight">
                      {tenant.bank_details || t("Bank: Not Provided", "బ్యాంక్ వివరాలు లేవు")}
                      {tenant.upi_id && `\nUPI: ${tenant.upi_id}`}
                    </p>
                 </div>
                 <div className="p-4 print:p-1 bg-gray-50 print:bg-white rounded-2xl border border-gray-100">
                    <h4 className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{t("Terms", "షరతులు")}</h4>
                    <p className="text-[9px] text-gray-400 leading-tight italic">
                      {t("1. Goods once sold will not be taken back.", "1. అమ్మిన వస్తువులు తిరిగి తీసుకోబడవు.")}<br/>
                      {t("2. All disputes subject to Chirala jurisdiction.", "2. వివాదాలు చీరాల కోర్టు పరిధిలోకి వస్తాయి.")}
                    </p>
                 </div>
               </div>
             </div>

             <div className="w-full md:w-80 space-y-3 print:space-y-0.5">
                <div className="space-y-2 print:space-y-0 px-2 border-b border-gray-100 pb-4 print:pb-0.5 mb-4 print:mb-0.5">
                  <div className="flex justify-between text-xs font-medium">
                     <span className="text-gray-500">{t("Sub Total", "మొత్తం")}</span>
                     <span className="font-medium text-gray-900">{formatCurrency(order.taxable_amount || order.total_amount)}</span>
                  </div>
                  {order.gst_type === 'CGST_SGST' && (
                    <>
                      <div className="flex justify-between text-xs text-gray-500">
                         <span>CGST ({order.gst_rate / 2}%)</span>
                         <span>{formatCurrency(order.cgst)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                         <span>SGST ({order.gst_rate / 2}%)</span>
                         <span>{formatCurrency(order.sgst)}</span>
                      </div>
                    </>
                  )}
                  {order.gst_type === 'IGST' && (
                    <div className="flex justify-between text-xs text-gray-500">
                       <span>IGST ({order.gst_rate}%)</span>
                       <span>{formatCurrency(order.igst)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center bg-primary text-white p-6 print:p-2 rounded-2xl shadow-2xl transform scale-105 print:scale-100 origin-right print:shadow-none">
                  <span className="text-[10px] font-normal uppercase tracking-widest">{t("Grand Total", "మొత్తం")}</span>
                  <span className="text-3xl print:text-xl font-medium">{formatCurrency(finalTotal)}</span>
                </div>

                <div className="pt-8 print:pt-1 space-y-2 print:space-y-0 px-4 italic">
                  <div className="flex justify-between text-sm text-green-600 print:text-xs">
                     <span className="text-gray-400 uppercase text-[9px] tracking-widest">{t("Advance", "అడ్వాన్స్")}</span>
                     <span className="font-medium">{formatCurrency(order.advance_paid)}</span>
                  </div>
                  <div className="flex justify-between text-lg print:text-base font-normal text-primary pt-2 print:pt-0.5 border-t border-dashed border-gray-200">
                     <span className="text-gray-400 uppercase text-[9px] tracking-widest font-normal">{t("Balance", "బకాయి")}</span>
                     <span className="font-semibold">{formatCurrency(finalTotal - order.advance_paid)}</span>
                  </div>
                </div>
             </div>
          </div>

          {/* Signature Area */}
          <div className="pt-24 print:pt-4 flex justify-between items-end">
             <div className="text-center space-y-4 print:space-y-1">
                <div className="w-40 border-b border-gray-200 mx-auto" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t("Customer's Sign", "కస్టమర్ సంతకం")}</p>
             </div>
             <div className="text-center space-y-2 print:space-y-0">
                <p className="text-[10px] text-primary font-normal uppercase tracking-[0.2em]">{t("For", "కోసం")} {tenant.name}</p>
                <p className="text-[8px] text-gray-400 italic mb-8 print:mb-1">{t("Authorized Signatory", "అధికారిక సంతకం")}</p>
                <div className="w-48 border-b-2 border-primary mx-auto" />
             </div>
          </div>
        </div>
      </div>

      {/* Browser Message - Hidden on Print */}
      <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest animate-pulse print:hidden">
         {t("Generated via PrintFlow SaaS", "ప్రింట్‌ఫ్లో SaaS ద్వారా రూపొందించబడింది")}
      </p>
    </div>
  );
}
