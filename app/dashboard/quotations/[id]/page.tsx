"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Printer, 
  ShoppingCart, 
  FileText,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Package
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getQuotation, updateQuotationStatus } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { useLanguage } from "@/lib/context/LanguageContext";
import { cn } from "@/lib/utils";

export default function QuotationDetailPage({ params }: { params: { id: string } }) {
  const { t } = useLanguage();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quotation, setQuotation] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const [quotationData, tenantData] = await Promise.all([
          getQuotation(params.id),
          getCurrentTenant(supabase)
        ]);
        setQuotation(quotationData);
        setTenant(tenantData);
      } catch (error) {
        console.error("Error fetching quotation:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateQuotationStatus(params.id, newStatus);
      setQuotation({ ...quotation, status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleConvertToOrder = () => {
    const queryParams = new URLSearchParams({
      quotation_id: quotation.id,
      customerName: quotation.customers?.name || "",
      phone: quotation.customers?.phone || "",
      jobType: quotation.job_type || "",
      quantity: quotation.quantity?.toString() || "1",
      paperType: quotation.paper_type || "",
      size: quotation.size || "",
      printingSide: quotation.printing_side || "",
      lamination: quotation.lamination || "",
      printingDate: quotation.printing_date || "",
      instructions: quotation.instructions || "",
      totalAmount: quotation.taxable_amount?.toString() || "0",
    });
    router.push(`/dashboard/orders/new?${queryParams.toString()}`);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400">
       <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
       <p className="text-sm font-normal uppercase tracking-widest">{t("Loading Quotation...", "కొటేషన్ లోడ్ అవుతోంది...")}</p>
    </div>
  );

  if (!quotation) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400 text-center">
       <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
       <h2 className="text-2xl font-normal text-gray-900 mb-2">{t("Quotation Not Found", "కొటేషన్ కనుగొనబడలేదు")}</h2>
       <Link href="/dashboard/quotations" className="text-primary hover:underline">{t("Back to list", "లిస్ట్ కి తిరిగి వెళ్ళండి")}</Link>
    </div>
  );

  return (
    <div className="max-w-full print:max-w-full mx-auto space-y-6 print:space-y-0 print:p-0">
      {/* Actions - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/quotations" className="p-2 hover:bg-white rounded-lg transition-colors border border-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-normal text-gray-900">{quotation.quotation_number}</h1>
            <p className="text-gray-500 text-sm">{quotation.job_type} {t("for", "కోసం:")} {quotation.customers?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-primary" />
            {t("Print Quotation", "ప్రింట్ కొటేషన్")}
          </button>
          {quotation.status !== 'CONVERTED' && (
            <button 
              onClick={handleConvertToOrder}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <ShoppingCart className="w-4 h-4" />
              {t("Convert to Order", "ఆర్డర్ గా మార్చండి")}
            </button>
          )}
        </div>
      </div>

      {/* Main Document Body */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:border print:border-gray-200 print:rounded-none">
        
        {/* Professional Header Section (Visible on Print) */}
        <div className="hidden print:block p-4 border-b-8 border-primary relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between gap-2 relative z-10">
            <div className="space-y-1">
              {tenant?.logo_url ? (
                <div className="relative h-12 w-32 mb-1">
                  <Image 
                    src={tenant.logo_url} 
                    alt={tenant.name} 
                    fill
                    className="object-contain object-left"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-1">
                  <Package className="w-8 h-8 text-primary" />
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tighter uppercase">{tenant?.name}</h1>
                </div>
              )}
              
              <div className="space-y-0.5 text-[10px] text-gray-500 leading-tight">
                {tenant?.city && <p className="flex items-center gap-2"><MapPin className="w-2.5 h-2.5" /> {tenant.city}, {tenant.state}</p>}
                {tenant?.phone && <p className="flex items-center gap-2"><Phone className="w-2.5 h-2.5" /> {tenant.phone}</p>}
                {tenant?.email && <p className="flex items-center gap-2"><Mail className="w-2.5 h-2.5" /> {tenant.email}</p>}
              </div>
            </div>

            <div className="text-right space-y-1">
              <h2 className="text-2xl font-bold text-primary uppercase tracking-tighter leading-none">{t("Quotation", "కొటేషన్")}</h2>
              <div className="pt-1">
                <p className="text-xs font-normal text-gray-900">{t("Quotation #", "కొటేషన్ నంబర్:")} <span className="text-primary">{quotation.quotation_number}</span></p>
                <p className="text-[10px] text-gray-500">{t("Date", "తేదీ")}: {formatDate(quotation.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 print:p-2 space-y-8 print:space-y-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-x-4">
            {/* Estimate Details Card */}
            <div className="lg:col-span-2 space-y-6 print:space-y-1 print:border-r print:border-gray-50 print:pr-4">
              <div className="space-y-4 print:space-y-1">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-2 mb-1 print:pb-0.5 print:mb-0.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <h2 className="text-gray-900 uppercase tracking-wide text-[10px] font-bold">{t("Estimate Details", "అంచనా వివరాలు")}</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-2 print:gap-1">
                  <DetailItem label={t("Job Type", "పని రకం")} value={quotation.job_type} />
                  <DetailItem label={t("Quantity", "పరిమాణం")} value={quotation.quantity} />
                  <DetailItem label={t("Paper Type", "పేపర్ రకం")} value={quotation.paper_type || t("Standard", "సాధారణ")} />
                  <DetailItem label={t("Size", "సైజు")} value={quotation.size || t("N/A", "లేదు")} />
                  <DetailItem label={t("Side", "ప్రింటింగ్ సైడ్")} value={quotation.printing_side || t("Single Side", "సింగిల్ సైడ్")} />
                  <DetailItem label={t("Lamination", "లామినేషన్")} value={quotation.lamination || t("None", "లేదు")} />
                </div>
                
                {(quotation.printing_date || quotation.instructions) && (
                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-50 print:pt-0.5">
                    {quotation.printing_date && (
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t("Printing Date", "ప్రింటింగ్ తేదీ")}</p>
                        <p className="text-xs text-gray-700 font-medium leading-relaxed">{formatDate(quotation.printing_date)}</p>
                      </div>
                    )}
                    {quotation.instructions && (
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t("Instructions", "సూచనలు")}</p>
                        <p className="text-[10px] text-gray-600 italic bg-gray-50 print:bg-white p-1 rounded border border-gray-100">{quotation.instructions}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pricing Section */}
              <div className="space-y-2 mt-4 print:mt-1">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-2 mb-1 print:pb-0.5 print:mb-0.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <h2 className="text-gray-900 uppercase tracking-wide text-[10px] font-bold">{t("Pricing", "ధర వివరాలు")}</h2>
                </div>
                <div className="bg-gray-50 print:bg-white p-3 print:p-1 rounded-xl border border-gray-100 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest leading-none">{t("Estimated Total", "మొత్తం అంచనా")}</p>
                    <p className="text-lg font-bold text-primary print:text-base">{formatCurrency(quotation.total_with_gst)}</p>
                  </div>
                  <div className="text-right text-[10px] text-gray-500 leading-tight">
                    <p>{t("Taxable", "పన్ను విలువ")}: {formatCurrency(quotation.taxable_amount)}</p>
                    {quotation.gst_rate > 0 && <p>GST ({quotation.gst_rate}%): {formatCurrency(quotation.total_with_gst - quotation.taxable_amount)}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Information (Sidebar on screen, below/beside on print) */}
            <div className="space-y-4 print:space-y-1">
              <div className="bg-gray-50 print:bg-white p-4 print:p-1 rounded-xl border border-gray-100 space-y-4 print:space-y-1">
                <h3 className="text-[9px] text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-1 print:pb-0.5 print:mb-0.5">{t("Customer", "కస్టమర్")}</h3>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-xs">
                    {quotation.customers?.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm print:text-xs font-medium text-gray-900">{quotation.customers?.name}</p>
                    <p className="text-xs print:text-[10px] text-gray-500">{quotation.customers?.phone}</p>
                  </div>
                </div>
                
                <div className="space-y-2 print:hidden">
                  <Link 
                    href={`/dashboard/customers/${quotation.customer_id}`}
                    className="block w-full text-center py-1.5 text-xs text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors border border-primary/10"
                  >
                    {t("View Profile", "ప్రొఫైల్ చూడండి")}
                  </Link>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-2">{t("Update Status", "స్టేటస్ మార్చండి")}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {['DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED'].map((status) => (
                        <button
                          key={status}
                          disabled={quotation.status === status || updating}
                          onClick={() => handleStatusUpdate(status)}
                          className={cn(
                            "px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all text-center",
                            quotation.status === status 
                              ? "bg-primary text-white" 
                              : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden print:block pt-4 border-t border-gray-100">
                <p className="text-[8px] text-gray-400 leading-tight italic uppercase tracking-wider text-center">
                  {t("* Computer generated quotation. No signature required.", "* ఇది కంప్యూటర్ రూపొందించబడిన కొటేషన్. సంతకం అవసరం లేదు.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DetailItem({ label, value }: { label: string, value: any }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] text-gray-400 uppercase tracking-wider leading-none">{label}</p>
      <p className="text-xs text-gray-900 font-medium truncate leading-tight">{value}</p>
    </div>
  );
}
