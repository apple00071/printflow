"use client";

import { useState, useEffect } from "react";
import { Printer, ArrowLeft, Loader2, Landmark, Mail, Phone, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getOrder } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { amountInWords } from "@/lib/utils";
import { useLanguage } from "@/lib/context/LanguageContext";

interface Order {
  id: string;
  invoice_number: string;
  invoice_date: string;
  job_type: string;
  quantity: number;
  taxable_amount: number;
  total_amount: number;
  total_with_gst?: number;
  advance_paid: number;
  gst_type: string;
  gst_rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  hsn_code?: string;
  size?: string;
  paper_type?: string;
  customers: {
    name: string;
    phone: string;
    gstin?: string;
  };
}

export default function InvoicePage({ params }: { params: { id: string } }) {
  const { t } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
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
        setOrder(orderData as Order);
        setTenant(tenantData);
      } catch {
        console.error("Error fetching invoice data");
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
    <div className="min-h-screen flex flex-col items-center justify-center p-20 text-gray-400">
       <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
       <p className="text-sm uppercase tracking-widest">{t("Generating Invoice...", "ఇన్వాయిస్ తయారవుతోంది...")}</p>
    </div>
  );

  if (!order || !tenant) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-20 text-gray-400 text-center">
       <h2 className="text-2xl text-gray-900 mb-2 uppercase">{t("Invoice Not Found", "ఇన్వాయిస్ కనుగొనబడలేదు")}</h2>
       <p className="mb-6">{t("The order ID provided does not exist or you don't have access.", "అందించిన ఆర్డర్ ఐడి లేదు లేదా మీకు యాక్సెస్ లేదు.")}</p>
       <Link href="/dashboard/orders" className="bg-primary text-white px-8 py-3 rounded-xl shadow-lg shadow-primary/20">{t("Back to Orders", "ఆర్డర్‌లకు తిరిగి వెళ్లండి")}</Link>
    </div>
  );

  const finalTotal = order.total_with_gst || order.total_amount;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-full print:max-w-[210mm] mx-auto space-y-6">
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
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all font-normal"
          >
            <Printer className="w-4 h-4" />
            {t("Print Invoice", "ప్రింట్ బిల్")}
          </button>
        </div>

        {/* Invoice Body */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:border print:border-gray-200 print:rounded-none">
          {/* Header Section */}
          <div className="p-8 sm:p-12 border-b-8 border-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32" />
            
            <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
              <div className="space-y-4">
                {tenant.logo_url ? (
                  <div className="relative h-16 w-32 mb-4">
                    <Image 
                      src={tenant.logo_url} 
                      alt={tenant.name} 
                      fill
                      className="object-contain object-left"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-4">
                    <Printer className="w-10 h-10 text-primary" />
                    <h1 className="text-3xl font-normal text-gray-900 tracking-tighter uppercase">{tenant.name}</h1>
                  </div>
                )}
                
                <div className="space-y-1.5 text-xs text-gray-500">
                  {tenant.city && <p className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {tenant.city}, {tenant.state}</p>}
                  {tenant.phone && <p className="flex items-center gap-2"><Phone className="w-3 h-3" /> {tenant.phone}</p>}
                  {tenant.email && <p className="flex items-center gap-2"><Mail className="w-3 h-3" /> {tenant.email}</p>}
                  {tenant.gst_number && <p className="font-normal text-gray-700">GSTIN: {tenant.gst_number}</p>}
                </div>
              </div>

              <div className="md:text-right space-y-4">
                <h2 className="text-5xl font-normal text-primary/10 uppercase tracking-tighter absolute top-0 right-0 hidden md:block">{t("Invoice", "ఇన్వాయిస్")}</h2>
                <div className="pt-12 md:pt-16">
                  <p className="text-sm font-normal text-gray-900">{t("Invoice #", "ఇన్వాయిస్ నంబర్:")} <span className="text-primary">{order.invoice_number || "Draft"}</span></p>
                  <p className="text-xs text-gray-500">{t("Date", "తేదీ")}: {formatDate(order.invoice_date || order.id)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-12 space-y-12">
            {/* Customer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="space-y-2">
                <h3 className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2 mb-2">{t("Bill To", "కస్టమర్")}</h3>
                <p className="text-lg font-normal text-gray-900">{order.customers.name}</p>
                <p className="text-sm text-gray-600">{order.customers.phone}</p>
                {order.customers.gstin && <p className="text-xs font-normal text-primary mt-1">GSTIN: {order.customers.gstin}</p>}
              </div>
              <div className="space-y-2">
                <h3 className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2 mb-2">{t("Order Meta", "ఆర్డర్ వివరాలు")}</h3>
                <p className="text-sm text-gray-700"><span className="text-gray-400 uppercase text-[9px] tracking-wider">{t("Job Type", "పని రకం")}:</span> {order.job_type}</p>
                <p className="text-sm text-gray-700"><span className="text-gray-400 uppercase text-[9px] tracking-wider">{t("Dimensions", "సైజు")}:</span> {order.size || "Standard"}</p>
                {order.hsn_code && <p className="text-sm text-gray-700"><span className="text-gray-400 uppercase text-[9px] tracking-wider">HSN/SAC:</span> {order.hsn_code}</p>}
              </div>
            </div>

            {/* Main Table */}
            <div className="overflow-hidden">
               <table className="w-full text-left">
                  <thead className="text-[10px] text-gray-400 uppercase tracking-widest border-b-2 border-gray-100">
                    <tr>
                      <th className="px-4 py-4">{t("Item Description", "వివరణ")}</th>
                      <th className="px-4 py-4 text-center">{t("Qty", "క్వాంటిటీ")}</th>
                      <th className="px-4 py-4 text-right">{t("Taxable Value", "పన్ను విలువ")}</th>
                      {order.gst_type !== 'NONE' && (
                        <th className="px-4 py-4 text-right">{t("GST", "GST")} (%)</th>
                      )}
                      <th className="px-4 py-4 text-right font-normal">{t("Amount", "ధర")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    <tr>
                      <td className="px-4 py-8">
                        <p className="font-normal text-gray-900">{order.job_type}</p>
                        <p className="text-xs text-gray-500 mt-1">{order.paper_type || "Standard Printing"}</p>
                      </td>
                      <td className="px-4 py-8 text-center">{order.quantity}</td>
                      <td className="px-4 py-8 text-right font-normal">{formatCurrency(order.taxable_amount || order.total_amount)}</td>
                      {order.gst_type !== 'NONE' && (
                        <td className="px-4 py-8 text-right">{order.gst_rate}%</td>
                      )}
                      <td className="px-4 py-8 text-right font-medium text-gray-900">{formatCurrency(finalTotal)}</td>
                    </tr>
                  </tbody>
               </table>
            </div>

            {/* Calculations & Summary */}
            <div className="flex flex-col md:flex-row justify-between gap-12 border-t border-gray-100 pt-8">
               <div className="flex-1 space-y-6">
                 <div>
                    <h4 className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">{t("Amount in words", "అక్షరాలలో మొత్తం")}</h4>
                    <p className="text-sm font-normal text-gray-800 italic bg-gray-50 p-3 rounded-lg border border-gray-100">{amountInWords(finalTotal)}</p>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <h4 className="text-[10px] text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                         <Landmark className="w-3 h-3" />
                         {t("Payment Details", "చెల్లింపు వివరాలు")}
                      </h4>
                      <p className="text-[10px] text-gray-700 whitespace-pre-line leading-relaxed">
                        {tenant.bank_details || t("Bank: Not Provided", "బ్యాంక్ వివరాలు లేవు")}
                        {tenant.upi_id && `\nUPI: ${tenant.upi_id}`}
                      </p>
                   </div>
                   <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <h4 className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">{t("Terms", "షరతులు")}</h4>
                      <p className="text-[9px] text-gray-400 leading-tight italic">
                        {t("1. Goods once sold will not be taken back.", "1. అమ్మిన వస్తువులు తిరిగి తీసుకోబడవు.")}<br/>
                        {t("2. All disputes subject to Chirala jurisdiction.", "2. వివాదాలు చీరాల కోర్టు పరిధిలోకి వస్తాయి.")}
                      </p>
                   </div>
                 </div>
               </div>

               <div className="w-full md:w-80 space-y-3">
                  <div className="space-y-2 px-2 border-b border-gray-100 pb-4 mb-4">
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

                  <div className="flex justify-between items-center bg-primary text-white p-6 rounded-2xl shadow-2xl shadow-primary/30 transform scale-105 origin-right">
                    <span className="text-[10px] font-normal uppercase tracking-widest">{t("Grand Total", "మొత్తం చెల్లించాల్సింది")}</span>
                    <span className="text-3xl font-medium">{formatCurrency(finalTotal)}</span>
                  </div>

                  <div className="pt-8 space-y-2 px-4 italic">
                    <div className="flex justify-between text-sm text-green-600">
                       <span className="text-gray-400 uppercase text-[9px] tracking-widest">{t("Advance Paid", "అడ్వాన్స్")}</span>
                       <span className="font-medium text-green-600">{formatCurrency(order.advance_paid)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-normal text-primary pt-2 border-t border-dashed border-gray-200">
                       <span className="text-gray-400 uppercase text-[9px] tracking-widest font-normal">{t("Balance Due", "బకాయి")}</span>
                       <span className="font-semibold">{formatCurrency(finalTotal - order.advance_paid)}</span>
                    </div>
                  </div>
               </div>
            </div>

            {/* Signature Area */}
            <div className="pt-24 flex justify-between items-end">
               <div className="text-center space-y-4">
                  <div className="w-40 border-b border-gray-200 mx-auto" />
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t("Customer's Sign", "కస్టమర్ సంతకం")}</p>
               </div>
               <div className="text-center space-y-2">
                  <p className="text-[10px] text-primary font-normal uppercase tracking-[0.2em]">{t("For", "కోసం")} {tenant.name}</p>
                  <p className="text-[8px] text-gray-400 italic mb-8">{t("Authorized Signatory", "అధికారిక సంతకం")}</p>
                  <div className="w-48 border-b-2 border-primary mx-auto" />
               </div>
            </div>
          </div>
        </div>

        {/* Browser Message - Hidden on Print */}
        <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest animate-pulse print:hidden">
           {t("Generated via PrintFlow SaaS • Modern Printing Management", "ప్రింట్‌ఫ్లో SaaS ద్వారా రూపొందించబడింది")}
        </p>
      </div>
    </div>
  );
}
