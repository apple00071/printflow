"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Printer, 
  ShoppingCart, 
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getQuotation, updateQuotationStatus } from "@/lib/supabase/actions";
import { useLanguage } from "@/lib/context/LanguageContext";
import { cn } from "@/lib/utils";

export default function QuotationDetailPage({ params }: { params: { id: string } }) {
  const { t } = useLanguage();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchQuotation() {
      try {
        const data = await getQuotation(params.id);
        setQuotation(data);
      } catch (error) {
        console.error("Error fetching quotation:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchQuotation();
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
    // Redirect to New Order with pre-filled data via query params
    const params = new URLSearchParams({
      quotation_id: quotation.id,
      customerName: quotation.customers?.name || "",
      phone: quotation.customers?.phone || "",
      jobType: quotation.job_type || "",
      quantity: quotation.quantity?.toString() || "1",
      paperType: quotation.paper_type || "",
      size: quotation.size || "",
      printingSide: quotation.printing_side || "",
      lamination: quotation.lamination || "",
      finishing: quotation.finishing || "",
      instructions: quotation.instructions || "",
      totalAmount: quotation.taxable_amount?.toString() || "0",
    });
    router.push(`/dashboard/orders/new?${params.toString()}`);
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
    <div className="max-w-full print:max-w-[210mm] mx-auto space-y-6 print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 10mm; }
          
          /* Hide all dashboard layout elements */
          aside, header, nav, footer, .print:hidden, .print-hide { 
            display: none !important; 
          }
          
          /* Reset layout margins and paddings */
          .lg\\:ml-56, .lg\\:ml-20, .ml-56, .ml-20 { 
            margin-left: 0 !important; 
          }
          
          main { 
            padding: 0 !important; 
            margin: 0 !important; 
          }
          
          .min-h-screen {
            min-height: 0 !important;
            height: auto !important;
            background: white !important;
          }

          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact;
          }
          
          /* Force the container to A4 width */
          .max-w-full { 
            max-width: 210mm !important; 
            width: 210mm !important;
            margin: 0 auto !important;
          }
        }
      `}} />
      {/* Header */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-gray-900 uppercase tracking-wide text-sm">{t("Estimate Details", "అంచనా వివరాలు")}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <DetailItem label={t("Job Type", "పని రకం")} value={quotation.job_type} />
              <DetailItem label={t("Quantity", "పరిమాణం")} value={quotation.quantity} />
              <DetailItem label={t("Paper Type", "పేపర్ రకం")} value={quotation.paper_type || t("Standard", "సాధారణ")} />
              <DetailItem label={t("Size", "సైజు")} value={quotation.size || t("N/A", "లేదు")} />
              <DetailItem label={t("Side", "ప్రింటింగ్ సైడ్")} value={quotation.printing_side || t("Single Side", "సింగిల్ సైడ్")} />
              <DetailItem label={t("Lamination", "లామినేషన్")} value={quotation.lamination || t("None", "లేదు")} />
              <DetailItem label={t("Date", "తేదీ")} value={formatDate(quotation.created_at)} />
              <DetailItem label={t("Valid Until", "గడువు తేదీ")} value={formatDate(quotation.valid_until)} />
            </div>
            {quotation.finishing && (
              <div className="pt-4 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 uppercase mb-1 tracking-wider">{t("Finishing & Others", "ఫినిషింగ్ వివరాలు")}</p>
                <p className="text-sm text-gray-700 font-medium">{quotation.finishing}</p>
              </div>
            )}
            {quotation.instructions && (
              <div className="pt-4 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 uppercase mb-1 tracking-wider">{t("Instructions", "సూచనలు")}</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">{quotation.instructions}</p>
              </div>
            )}
          </div>

          {/* Pricing Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
             <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-1">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-gray-900 uppercase tracking-wide text-sm">{t("Pricing", "ధర వివరాలు")}</h2>
             </div>
             <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">{t("Taxable Amount", "పన్ను చెల్లించవలసిన మొత్తం")}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(quotation.taxable_amount)}</span>
                </div>
                {quotation.gst_rate > 0 && (
                   <div className="flex justify-between items-center text-xs text-gray-400">
                     <span>GST ({quotation.gst_rate}%)</span>
                     <span>{formatCurrency(quotation.total_with_gst - quotation.taxable_amount)}</span>
                   </div>
                )}
                <div className="flex justify-between items-center text-lg font-normal py-3 border-t border-gray-100 mt-2">
                  <span className="text-gray-900">{t("Estimated Total", "మొత్తం అంచనా")}</span>
                  <span className="text-primary font-bold">{formatCurrency(quotation.total_with_gst)}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3 mb-2">{t("Customer Profile", "కస్టమర్")}</h3>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                 {quotation.customers?.name?.charAt(0)}
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-900">{quotation.customers?.name}</p>
                 <p className="text-[11px] text-gray-500">{quotation.customers?.phone}</p>
               </div>
            </div>
            <Link 
              href={`/dashboard/customers/${quotation.customer_id}`}
              className="block w-full text-center py-2 text-xs text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors border border-primary/10"
            >
              {t("View Full Profile", "ప్రొఫైల్ చూడండి")}
            </Link>
          </div>

          {/* Status/Activity Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3 mb-2">{t("Quotation Status", "ఫ్లో")}</h3>
            <div className="space-y-4">
              <StatusOption 
                label="DRAFT" 
                active={quotation.status === 'DRAFT'} 
                onClick={() => handleStatusUpdate('DRAFT')}
                updating={updating}
              />
              <StatusOption 
                label="SENT" 
                active={quotation.status === 'SENT'} 
                onClick={() => handleStatusUpdate('SENT')}
                updating={updating}
              />
              <StatusOption 
                label="ACCEPTED" 
                active={quotation.status === 'ACCEPTED'} 
                onClick={() => handleStatusUpdate('ACCEPTED')}
                updating={updating}
              />
              <StatusOption 
                label="EXPIRED" 
                active={quotation.status === 'EXPIRED'} 
                onClick={() => handleStatusUpdate('EXPIRED')}
                updating={updating}
              />
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
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-900 font-medium">{value}</p>
    </div>
  );
}

function StatusOption({ label, active, onClick, updating }: { label: string, active: boolean, onClick: () => void, updating: boolean }) {
  return (
    <button
      disabled={active || updating}
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-all",
        active 
          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
          : "bg-white text-gray-500 border-gray-100 hover:border-primary/20 hover:text-primary transition-colors disabled:opacity-50"
      )}
    >
      <span className="font-medium tracking-wide">{label}</span>
      {active && <CheckCircle2 className="w-4 h-4" />}
    </button>
  );
}
