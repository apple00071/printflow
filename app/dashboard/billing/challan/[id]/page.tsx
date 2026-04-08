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
  Package
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils/format";
import { getOrder } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { useLanguage } from "@/lib/context/LanguageContext";

export default function DeliveryChallanPage({ params }: { params: { id: string } }) {
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
        console.error("Error fetching challan data:", error);
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
       <p className="text-sm uppercase tracking-widest">{t("Generating Challan...", "చలాన్ తయారవుతోంది...")}</p>
    </div>
  );

  if (!order || !tenant || !order.challan_number) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400 text-center">
       <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
       <h2 className="text-2xl text-gray-900 mb-2">{t("Challan Not Found", "చలాన్ కనుగొనబడలేదు")}</h2>
       <Link href={`/dashboard/orders/${params.id}`} className="text-primary hover:underline">{t("Back to Order", "ఆర్డర్‌కు తిరిగి వెళ్లండి")}</Link>
    </div>
  );

  return (
    <div className="max-w-full print:max-w-full mx-auto space-y-6 print:space-y-0 print:p-0">
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
          className="flex items-center gap-2 px-6 py-2 bg-orange text-white rounded-lg shadow-lg shadow-orange/20 hover:bg-orange/90 transition-all font-normal"
        >
          <Printer className="w-4 h-4" />
          {t("Print Challan", "ప్రింట్ చలాన్")}
        </button>
      </div>

      {/* Challan Body */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:border print:border-gray-200 print:rounded-none">
        
        {/* Header Section */}
        <div className="p-8 sm:p-12 print:p-4 border-b-8 border-orange relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange/5 rounded-full -mr-32 -mt-32 print:hidden" />
          
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
                  <Package className="w-10 h-10 text-orange" />
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tighter uppercase">{tenant.name}</h1>
                </div>
              )}
              
              <div className="space-y-1 text-xs text-gray-500 leading-tight">
                {tenant.city && <p className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {tenant.city}, {tenant.state}</p>}
                {tenant.phone && <p className="flex items-center gap-2"><Phone className="w-3 h-3" /> {tenant.phone}</p>}
                {tenant.email && <p className="flex items-center gap-2"><Mail className="w-3 h-3" /> {tenant.email}</p>}
              </div>
            </div>

            <div className="md:text-right space-y-4 print:space-y-1">
              <h2 className="text-5xl print:text-2xl font-normal text-orange/10 print:text-orange uppercase tracking-tighter absolute top-0 right-0 hidden md:block print:relative print:top-auto print:right-auto">{t("Challan", "చలాన్")}</h2>
              <div className="pt-12 md:pt-16 print:pt-2">
                <p className="text-sm font-normal text-gray-900">{t("Challan #", "చలాన్ నంబర్:")} <span className="text-orange">{order.challan_number}</span></p>
                <p className="text-xs text-gray-500">{t("Date", "తేదీ")}: {formatDate(order.challan_date || order.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-12 print:p-4 space-y-12 print:space-y-1">
          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-1 bg-gray-50 print:bg-white p-6 print:p-2 rounded-2xl border border-gray-100">
            <div className="space-y-2 print:space-y-0">
              <h3 className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2 mb-2 print:pb-1 print:mb-1">{t("Deliver To", "కస్టమర్")}</h3>
              <p className="text-lg print:text-base font-normal text-gray-900">{order.customers.name}</p>
              <p className="text-sm print:text-xs text-gray-600">{order.customers.phone}</p>
            </div>
            <div className="space-y-2 print:space-y-0">
              <h3 className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2 mb-2 print:pb-1 print:mb-1">{t("Order Info", "ఆర్డర్ వివరాలు")}</h3>
              <p className="text-sm print:text-xs text-gray-700 font-bold"><span className="text-gray-400 uppercase text-[9px] tracking-wider font-normal">{t("Order ID", "ఆర్డర్ ID")}:</span> {order.friendly_id || `#${order.id.split('-')[0].toUpperCase()}`}</p>
              <p className="text-sm print:text-xs text-gray-700"><span className="text-gray-400 uppercase text-[9px] tracking-wider">{t("Delivery", "తేదీ")}:</span> {formatDate(order.challan_date || order.id)}</p>
            </div>
          </div>

          {/* Item Table */}
          <div className="overflow-hidden">
             <table className="w-full text-left">
                <thead className="text-[10px] text-gray-400 uppercase tracking-widest border-b-2 border-gray-100">
                  <tr>
                    <th className="px-4 py-4 print:py-1">{t("Description", "వివరణ")}</th>
                    <th className="px-4 py-4 print:py-1">{t("Specification", "వివరాలు")}</th>
                    <th className="px-4 py-4 print:py-1 text-center">{t("Qty", "క్వాంటిటీ")}</th>
                    <th className="px-4 py-4 print:py-1 text-right">{t("Package", "ప్యాకేజీ")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-none text-sm text-gray-700">
                  <tr>
                    <td className="px-4 py-8 print:py-1">
                      <p className="font-normal text-gray-900 leading-tight">{order.job_type}</p>
                    </td>
                    <td className="px-4 py-8 print:py-1">
                       <p className="text-[10px] text-gray-500">{order.paper_type || "Standard"}</p>
                       <p className="text-[10px] text-gray-500 mt-0.5 print:mt-0">{order.size || "Standard Size"}</p>
                    </td>
                    <td className="px-4 py-8 print:py-1 text-center text-lg font-medium text-gray-900">{order.quantity}</td>
                    <td className="px-4 py-8 print:py-1 text-right text-[10px] text-gray-400 italic">Standard Packing</td>
                  </tr>
                </tbody>
             </table>
          </div>

          {order.instructions && (
            <div className="bg-gray-50 print:bg-white p-6 print:p-2 rounded-2xl border border-gray-100 italic">
               <h4 className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{t("Instructions", "సూచనలు")}</h4>
               <p className="text-[10px] text-gray-600 leading-tight">{order.instructions}</p>
            </div>
          )}

          {/* Signature Area */}
          <div className="pt-32 print:pt-4 flex justify-between items-end">
             <div className="text-center space-y-4 print:space-y-1">
                <div className="w-40 border-b border-gray-200 mx-auto" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t("Receiver's Sign", "గ్రహీత సంతకం")}</p>
             </div>
             <div className="text-center space-y-2 print:space-y-0">
                <p className="text-[10px] text-orange font-normal uppercase tracking-[0.2em]">{t("For", "కోసం")} {tenant.name}</p>
                <p className="text-[8px] text-gray-400 italic mb-8 print:mb-1">{t("Authorized Signatory", "అధికారిక సంతకం")}</p>
                <div className="w-48 border-b-2 border-orange mx-auto" />
             </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest animate-pulse print:hidden">
         {t("Delivery Challan • PrintFlow System", "డెలివరీ చలాన్ • ప్రింట్‌ఫ్లో సిస్టమ్")}
      </p>
    </div>
  );
}
