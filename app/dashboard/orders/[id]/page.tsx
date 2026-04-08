"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Printer, 
  MessageSquare, 
  CheckCircle2, 
  Edit3,
  FileText,
  Loader2,
  IndianRupee,
  File as FileIcon,
  X,
  Upload,
  Download
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { PRESS_CONFIG } from "@/lib/config";
import { getOrder, updateOrderStatus, assignChallanNumber, Order } from "@/lib/supabase/actions";
import AddPaymentModal from "@/components/dashboard/AddPaymentModal";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

import { useLanguage } from "@/lib/context/LanguageContext";
import { cn } from "@/lib/utils";



export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const { t, language } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [actualDeliveryDate, setActualDeliveryDate] = useState(new Date().toISOString().split('T')[0]);

  const statuses = [
    t("RECEIVED", "వచ్చింది"),
    t("DESIGNING", "డిజైనింగ్"),
    t("PRINTING", "ప్రింటింగ్"),
    t("READY", "సిద్ధంగా ఉంది"),
    t("DELIVERED", "డెలివరీ అయింది")
  ];

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const data = await getOrder(params.id);
      setOrder(data);
    } catch {
      console.error("Error fetching order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    
    // If status is DELIVERED, and we don't have a date yet, show the modal
    if (newStatus === "DELIVERED" && !order.actual_delivery_date) {
      setShowDeliveryModal(true);
      return;
    }

    setUpdating(true);
    try {
      await updateOrderStatus(order.id, newStatus, newStatus === "DELIVERED" ? actualDeliveryDate : undefined);
      setOrder({ 
        ...order, 
        status: newStatus, 
        actual_delivery_date: newStatus === "DELIVERED" ? (actualDeliveryDate || order.actual_delivery_date) : null 
      } as Order);
    } catch {
      console.error("Error updating status");
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateChallan = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const updatedOrder = await assignChallanNumber(order.id);
      setOrder(updatedOrder as Order);
    } catch (error) {
      console.error("Error generating challan:", error);
      alert("Failed to generate challan");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400">
       <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
       <p className="text-sm font-normal text-gray-400">{t("Loading Order Details...", "ఆర్డర్ వివరాలు లోడ్ అవుతున్నాయి...")}</p>
    </div>
  );

  if (!order) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400 text-center">
       <h2 className="text-2xl font-normal text-gray-900 mb-2">{t("Order Not Found", "ఆర్డర్ కనుగొనబడలేదు")}</h2>
       <p className="mb-6">{t("The order ID provided does not exist in our system.", "అందించిన ఆర్డర్ ఐడి మా సిస్టమ్‌లో లేదు.")}</p>
       <Link href="/dashboard/orders" className="bg-primary text-white px-6 py-2 rounded-lg font-normal">
         {t("Back to Orders", "ఆర్డర్‌లకు తిరిగి వెళ్లండి")}
       </Link>
    </div>
  );

  const getWhatsAppLink = () => {
    const rawTotal = order.total_with_gst || order.total_amount;
    const total = Math.round(rawTotal * 100) / 100;
    const balance = Math.round((total - order.advance_paid) * 100) / 100;
    
    let message = "";
    if (language === "te") {
      message = `నమస్కారం ${order.customers?.name} గారు, మీ ${order.job_type} ఆర్డర్ సిద్ధంగా ఉంది. మొత్తం: ₹${total}. అడ్వాన్స్: ₹${order.advance_paid}. బకాయి: ₹${balance}. - ${PRESS_CONFIG.name}, చీరాల.`;
    } else {
      message = `Hi ${order.customers?.name}, your order of ${order.job_type} is ready for pickup. Total: ₹${total}. Advance: ₹${order.advance_paid}. Balance: ₹${balance}. - ${PRESS_CONFIG.name}, Chirala`;
    }
    return `https://wa.me/${order.customers?.phone}?text=${encodeURIComponent(message)}`;
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
            <p className="text-gray-500 text-sm">{order.job_type} {t("for", "కస్టమర్:")} {order.customers?.name}</p>
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
          {order.challan_number ? (
            <Link 
              href={`/dashboard/billing/challan/${order.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4 text-orange" />
              {t("Print Challan", "చలాన్ ప్రింట్ చేయండి")}
            </Link>
          ) : (
            <button 
              onClick={handleGenerateChallan}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <FileIcon className="w-4 h-4 text-orange" />
              {t("Generate Challan", "చలాన్ జెనరేట్ చేయండి")}
            </button>
          )}
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
                      isCompleted ? "text-primary" : "text-gray-400 font-normal"
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
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t("Ordered On", "ఆర్డర్ చేసిన తేదీ")}</p>
                <p className="text-sm text-gray-900">{formatDate(order.created_at)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t("Promised Delivery", "డెలివరీ తేదీ")}</p>
                <p className="text-sm text-gray-900">{order.delivery_date ? formatDate(order.delivery_date) : t("TBA", "త్వరలో")}</p>
              </div>
              {order.printing_date && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t("Printing Date", "ప్రింటింగ్ తేదీ")}</p>
                  <p className="text-sm text-gray-900">{formatDate(order.printing_date)}</p>
                </div>
              )}
              {order.status === "DELIVERED" && order.actual_delivery_date && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t("Actual Delivery", "నిజమైన డెలివరీ తేదీ")}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-green-600 font-medium">{formatDate(order.actual_delivery_date)}</p>
                    {order.delivery_date && new Date(order.actual_delivery_date).getTime() > new Date(order.delivery_date).getTime() && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider bg-red-100 text-red-700">
                        {t("Delayed", "ఆలస్యం")}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-gray-50">
               <p className="text-[10px] text-gray-400 uppercase mb-2 tracking-wider">{t("Instructions", "సూచనలు")}</p>
               <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner">
                 {order.instructions || t("No special instructions", "ఎలాంటి ప్రత్యేక సూచనలు లేవు")}
               </p>
            </div>

            {order.file_url && (
              <div className="pt-4 border-t border-gray-50 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 uppercase mb-2 tracking-wider">{t("Design File", "డిజైన్ ఫైల్")}</p>
                  <div className="flex flex-wrap gap-3">
                    <a 
                      href={order.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/10 rounded-xl hover:bg-primary/10 transition-colors group"
                    >
                      <FileIcon className="w-5 h-5 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-sm font-normal text-gray-900 group-hover:text-primary transition-colors">
                          {t("View Design", "డిజైన్ చూడండి")}
                        </span>
                      </div>
                    </a>

                    <a 
                      href={order.file_url} 
                      download
                      target="_blank"
                      className="inline-flex items-center gap-3 px-4 py-2.5 bg-gray-900 border border-gray-900 rounded-xl hover:bg-black transition-colors text-white shadow-lg shadow-gray-200"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm font-normal">
                        {t("Download File", "ఫైల్ డౌన్‌లోడ్")}
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            )}
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
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{t("Taxable Amount", "పన్ను చెల్లించవలసిన మొత్తం")}</span>
                <span className="text-gray-900 font-medium">{formatCurrency(order.taxable_amount || order.total_amount)}</span>
              </div>
              
              {order.gst_type !== 'NONE' && (
                <div className="space-y-1.5 pt-1 border-t border-gray-50 mt-1">
                  {order.gst_type === 'CGST_SGST' ? (
                    <>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-400">CGST ({(order.gst_rate || 0)/2}%)</span>
                        <span className="text-gray-600 font-normal">{formatCurrency(order.cgst || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-400">SGST ({(order.gst_rate || 0)/2}%)</span>
                        <span className="text-gray-600 font-normal">{formatCurrency(order.sgst || 0)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400">IGST ({order.gst_rate || 0}%)</span>
                      <span className="text-gray-600 font-normal">{formatCurrency(order.igst || 0)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100 mt-2">
                <span className="text-gray-900 font-normal">{t("Total Amount", "మొత్తం ధర")}</span>
                <span className="text-gray-900 font-semibold">{formatCurrency(order.total_with_gst || order.total_amount)}</span>
              </div>

              <div className="flex justify-between items-center text-sm text-green-600">
                <span className="text-gray-500">{t("Advance Paid", "చెల్లించిన అడ్వాన్స్")}</span>
                <span className="font-medium text-green-600">{formatCurrency(order.advance_paid)}</span>
              </div>
              
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">{t("Balance Due", "బకాయి")}</span>
                <span className="text-xl text-primary font-bold">{formatCurrency((order.total_with_gst || order.total_amount) - order.advance_paid)}</span>
              </div>
            </div>
            {((order.total_with_gst || order.total_amount) - order.advance_paid) > 0 && (
              <button 
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full py-2.5 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95 mt-2 font-normal uppercase tracking-wider"
              >
                {t("Add Payment", "పేమెంట్ జోడించండి")}
              </button>
            )}
          </div>

          {/* Proofing Workflow */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
              <CheckCircle2 className={cn("w-5 h-5", order.proof_status === 'APPROVED' ? 'text-green-500' : 'text-orange')} />
              <h2 className="text-gray-900 uppercase tracking-widest text-[10px] font-bold">{t("Design Approval", "డిజైన్ అనుమతి", "डिजाइन की अनुमति")}</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Status", "స్థితి", "स्थिति")}</span>
                 <span className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase",
                    order.proof_status === 'APPROVED' ? 'bg-green-50 text-green-600' :
                    order.proof_status === 'REVISION_REQUESTED' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'
                 )}>
                    {order.proof_status}
                 </span>
              </div>

              {order.proof_feedback && (
                  <div className="bg-orange/5 p-3 rounded-lg border border-orange/10">
                     <p className="text-[10px] font-bold text-orange uppercase tracking-widest mb-1">{t("Customer Feedback", "కస్టమర్ సూచనలు", "ग्राहक का फीडबैक")}</p>
                     <p className="text-xs text-gray-600 italic">&quot;{order.proof_feedback}&quot;</p>
                  </div>
              )}

              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">{t("Proof Preview Link", "ప్రూఫ్ లింక్", "प्रूफ प्रीव्यू लिंक")}</label>
                 <div className="flex gap-2">
                    <input 
                       type="text" 
                       placeholder="https://..."
                       defaultValue={order.proof_image_url || ""}
                       onBlur={async (e) => {
                          if (e.target.value !== order.proof_image_url) {
                             const { updateOrderProof } = await import("@/lib/supabase/actions");
                             await updateOrderProof(order.id, { proof_image_url: e.target.value });
                             fetchOrder();
                          }
                       }}
                       className="flex-1 bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg text-xs outline-none focus:border-primary transition-all font-mono"
                    />
                    <input 
                      type="file"
                      id="proof-upload"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !order) return;
                        
                        setUpdating(true);
                        setUploadProgress(5);
                        
                        const progressInterval = setInterval(() => {
                          setUploadProgress(prev => {
                            if (prev >= 95) return 95;
                            return prev + (Math.random() * 15);
                          });
                        }, 300);

                        try {
                          const { createClient: createClientBrowser } = await import("@/lib/supabase/client");
                          const { getCurrentTenant: getTenant } = await import("@/lib/tenant");
                          const { updateOrderProof: updateProof } = await import("@/lib/supabase/actions");
                          
                          const supabase = createClientBrowser();
                          const tenant = await getTenant(supabase);
                          if (!tenant) throw new Error("Tenant not found");
                          
                          const fileExt = file.name.split('.').pop();
                          const filePath = `${tenant.id}/proofs/${order.id}-${Date.now()}.${fileExt}`;
                          
                          const { error: uploadError } = await supabase.storage
                            .from('printflow-files')
                            .upload(filePath, file);
                            
                          if (uploadError) throw uploadError;
                          
                          const { data: { publicUrl } } = supabase.storage
                            .from('printflow-files')
                            .getPublicUrl(filePath);
                            
                          await updateProof(order.id, { proof_image_url: publicUrl });
                          clearInterval(progressInterval);
                          setUploadProgress(100);
                          fetchOrder();
                        } catch (err) {
                          console.error("Upload failed", err);
                          alert("Upload failed. Please try again.");
                          clearInterval(progressInterval);
                          setUploadProgress(0);
                        } finally {
                          setTimeout(() => {
                            setUpdating(false);
                            setUploadProgress(0);
                          }, 1000);
                        }
                      }}
                    />
                    <button 
                       onClick={() => document.getElementById('proof-upload')?.click()}
                       disabled={updating}
                       className="px-3 py-4 bg-primary/5 border border-primary/20 rounded-lg group hover:bg-primary transition-all flex items-center justify-center min-w-[40px]"
                       title={t("Upload Proof", "ప్రూఫ్ అప్‌లోడ్", "प्रूफ अपलोड करें")}
                    >
                       <Upload className="w-4 h-4 text-primary group-hover:text-white" />
                    </button>
                 </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2">
                 <button 
                    onClick={() => {
                       const link = `${window.location.origin}/proof/${order.id}?token=${order.proofing_token}`;
                       navigator.clipboard.writeText(link);
                       alert(t("Link copied to clipboard!", "లింక్ కాపీ చేయబడింది!", "लिंक कॉपी हो गया!"));
                    }}
                    className="py-2.5 bg-gray-50 text-gray-700 text-[10px] font-bold rounded-lg border border-gray-100 hover:bg-gray-100 transition-all uppercase tracking-wider"
                 >
                    {t("Copy Link", "లింక్ కాపీ చేయండి", "लिंक कॉपी करें")}
                 </button>
                 <a 
                    href={`https://wa.me/${order.customers?.phone}?text=${encodeURIComponent(`Hi ${order.customers?.name}, please approve your design proof here: ${window.location.origin}/proof/${order.id}?token=${order.proofing_token}`)}`}
                    target="_blank"
                    className="py-2.5 bg-green-500 text-white text-[10px] font-bold rounded-lg hover:bg-green-600 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                 >
                    <MessageSquare className="w-3 h-3" /> WHATSAPP
                 </a>
              </div>

              {updating && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{uploadProgress === 100 ? "Complete!" : "Uploading design..."}</span>
                      <span className="text-[9px] font-mono font-bold text-primary">{uploadProgress}%</span>
                   </div>
                   <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden border border-primary/5">
                      <div 
                        className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Notification */}
          {order.status === "READY" && (
            <div className="bg-green-50 p-6 rounded-xl border border-green-200 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-green-700">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-sm uppercase tracking-widest font-bold text-[10px]">{t("Notify Customer", "కస్టమర్‌కు తెలియజేయండి", "ग्राहक को सूचित करें")}</h3>
              </div>
              <p className="text-xs text-green-600 leading-relaxed">
                {t("The order is READY. Send a WhatsApp notification to the customer about pickup and balance.", "ఆర్డర్ సిద్ధంగా ఉంది. పికప్ మరియు బకాయి గురించి వాట్సాప్ ద్వారా కస్టమర్‌కు తెలియజేయండి.", "ऑर्डर तैयार है। ग्राहक को व्हाट्सएप पर सूचित करें।")}
              </p>
              <a 
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all shadow-lg shadow-green-200 active:scale-95 font-bold"
              >
                <MessageSquare className="w-4 h-4" />
                {t("Send WhatsApp", "వాట్సాప్ పంపండి", "व्हाट्सएप भेजें")}
              </a>
            </div>
          )}
        </div>
      </div>

      {isPaymentModalOpen && order && (
        <AddPaymentModal
          orderId={order.id}
          balanceDue={Math.round(((order.total_with_gst || order.total_amount) - order.advance_paid) * 100) / 100}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            fetchOrder();
          }}
        />
      )}

      {/* Actual Delivery Date Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-sm font-normal text-gray-900 uppercase tracking-tight">Capture Delivery</h3>
              </div>
              <button onClick={() => setShowDeliveryModal(false)} className="p-1 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed uppercase tracking-wider">
                Specify the actual date the order was delivered to the customer.
              </p>
              
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest px-1">Delivery Date</label>
                <CustomDatePicker
                  value={actualDeliveryDate}
                  onChange={(val) => setActualDeliveryDate(val)}
                />
              </div>

              <button
                onClick={async () => {
                  setUpdating(true);
                  setShowDeliveryModal(false);
                  try {
                    await updateOrderStatus(order.id, "DELIVERED", actualDeliveryDate);
                    setOrder({ ...order, status: "DELIVERED", actual_delivery_date: actualDeliveryDate } as Order);
                  } catch {
                    console.error("Error updating delivery date");
                  } finally {
                    setUpdating(false);
                  }
                }}
                className="w-full py-3 bg-primary text-white text-xs rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-normal uppercase tracking-widest mt-2"
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
