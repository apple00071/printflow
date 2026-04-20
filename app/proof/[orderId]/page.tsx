"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { 
  CheckCircle2, 
  MessageSquare, 
  AlertCircle,
  Loader2,
  FileImage,
  ExternalLink,
  FileText,
  X,
  ChevronRight,
  Maximize2,
  Zap,
  Clock,
  Layers
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { submitProofResponse } from "@/lib/supabase/actions";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
 
interface OrderProofData {
    id?: string;
    job_type?: string;
    proof_status?: string;
    proofing_token?: string;
    proof_image_url?: string;
    proof_feedback?: string;
    customers?: {
        name: string;
        phone: string;
    };
    friendly_id?: string;
    printing_side?: string;
    lamination?: string;
    paper_type?: string;
    size?: string;
    tenants?: {
        name: string;
        city: string | null;
        logo_url?: string;
    };
}

export default function ProofingPage({ params }: { params: { orderId: string } }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderProofData | null>(null);
  const [status, setStatus] = useState<string>("IDLE"); // IDLE, SAVING, SUCCESS, ERROR
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchOrder() {
      if (!token) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
            *,
            customers(name, phone),
            tenants(name, city, logo_url)
        `)
        .eq("id", params.orderId)
        .eq("proofing_token", token)
        .single();

      if (error || !data) {
        console.error("Order not found or link invalid");
      } else {
        setOrder(data);
      }
      setLoading(false);
    }
    fetchOrder();
  }, [params.orderId, token, supabase]);

  const handleApproval = async (approve: boolean) => {
    setStatus("SAVING");
    try {
      const { success, updatedOrder } = await submitProofResponse(
        params.orderId,
        token!,
        approve ? 'APPROVED' : 'REVISION_REQUESTED',
        feedback
      );

      if (!success) throw new Error("Failed to submit response");
      
      setOrder({...order, ...updatedOrder} as OrderProofData);
      setStatus("SUCCESS");
      setShowFeedback(false);
    } catch (err) {
      console.error(err);
      setStatus("ERROR");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
         <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
               <Zap className="w-4 h-4 text-primary animate-pulse" />
            </div>
         </div>
         <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Securing Portal...</p>
      </div>
    );
  }

  if (!order) {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
           <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-red-500/5 border border-red-100">
              <AlertCircle className="w-10 h-10" />
           </div>
           <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Access Denied</h1>
           <p className="text-gray-500 max-w-sm text-sm leading-relaxed mb-8">This proof link is invalid or has expired. Please contact the print shop for a fresh approval link.</p>
           <button onClick={() => window.location.reload()} className="px-6 py-2 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition-all">TRY AGAIN</button>
        </div>
    );
  }

  const isApproved = order.proof_status === 'APPROVED';

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans selection:bg-primary/10 pb-32">
      {/* Lightbox / Modal */}
      {isLightboxOpen && order.proof_image_url && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setIsLightboxOpen(false)}
        >
           <div className="w-full h-full p-4 flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
              <Image 
                src={order.proof_image_url} 
                alt="Fullscreen Preview"
                fill
                className="object-contain p-4 md:p-12"
                unoptimized
              />
           </div>
           <button 
             onClick={() => setIsLightboxOpen(false)}
             className="absolute top-6 right-6 z-[110] w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all active:scale-95"
           >
             <X className="w-6 h-6" />
           </button>
        </div>
      )}

      {/* Boutique Header */}
      <header className="bg-white/80 backdrop-blur-2xl border-b border-gray-100 p-5 sticky top-0 z-[60]">
         <div className="max-w-screen-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
               {order.tenants?.logo_url ? (
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                     <Image src={order.tenants.logo_url} alt="Logo" fill className="object-cover" />
                  </div>
               ) : (
                  <Logo size="sm" />
               )}
               <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">
                     {order.tenants?.name || "Approval Portal"}
                  </h3>
                  <div className="flex items-center gap-2">
                     <span className="text-xs font-semibold text-gray-900">Design Approval</span>
                     <div className="w-1 h-1 rounded-full bg-gray-300" />
                     <span className="text-[10px] font-semibold text-primary tabular-nums">
                        {order.friendly_id || `#${order?.id?.split('-')[0]}`}
                     </span>
                  </div>
               </div>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
               <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1 text-right">CLIENT</p>
                  <p className="text-[11px] font-semibold text-gray-900 tracking-tight">{order.customers?.name}</p>
               </div>
            </div>
         </div>
      </header>

      <main className="max-w-screen-lg mx-auto py-12 px-6">
         {/* Layout Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left: Design Canvas */}
            <div className="lg:col-span-8 space-y-8">
               <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary/5 to-primary/0 rounded-[40px] blur-2xl opacity-50 transition-opacity group-hover:opacity-100" />
                  <div className="relative bg-white rounded-[32px] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden group/canvas">
                     
                     <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-100 shadow-sm">
                           <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                           <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-tight">Final Artwork Proof</span>
                        </div>
                        {order.proof_image_url && (
                           <button 
                             onClick={() => setIsLightboxOpen(true)}
                             className="p-2 hover:bg-primary/5 text-primary rounded-xl transition-all active:scale-90"
                           >
                              <Maximize2 className="w-4 h-4" />
                           </button>
                        )}
                     </div>

                     <div className="min-h-[500px] flex items-center justify-center bg-gray-50/50 p-6 relative">
                        {order.proof_image_url ? (
                           order.proof_image_url.toLowerCase().endsWith('.pdf') ? (
                              <div className="text-center p-12 flex flex-col items-center max-w-sm">
                                 <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center mb-6 shadow-xl shadow-red-500/10 border border-red-100">
                                    <FileText className="w-12 h-12" />
                                 </div>
                                 <h4 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">Vector Document</h4>
                                 <p className="text-sm text-gray-500 leading-relaxed mb-8 font-medium">This design is a high-resolution PDF. Please review it in its native viewer before approving.</p>
                                 <a 
                                    href={order.proof_image_url} 
                                    target="_blank" 
                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-bold tracking-widest shadow-2xl shadow-gray-900/30 hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-[0.98] uppercase"
                                 >
                                    Inspect Full PDF <ExternalLink className="w-4 h-4" />
                                 </a>
                              </div>
                           ) : (
                              <div 
                                onClick={() => setIsLightboxOpen(true)}
                                className="relative cursor-zoom-in transition-all duration-700 hover:scale-[1.01]"
                              >
                                 <Image 
                                     src={order.proof_image_url} 
                                     alt="Design Proof" 
                                     width={1200}
                                     height={900}
                                     className="max-w-full h-auto object-contain rounded-lg shadow-2xl shadow-black/5 border border-white"
                                     unoptimized
                                 />
                                 <div className="absolute inset-0 bg-black/0 group-hover/canvas:bg-black/5 transition-all flex items-center justify-center opacity-0 group-hover/canvas:opacity-100 pointer-events-none">
                                     <div className="bg-white/90 backdrop-blur-md px-6 py-2.5 rounded-full text-[11px] font-bold tracking-widest text-gray-900 shadow-2xl border border-white/20 uppercase">
                                         Click to Pan & Zoom
                                     </div>
                                 </div>
                              </div>
                           )
                        ) : (
                           <div className="text-center p-12">
                               <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                                  <FileImage className="w-10 h-10 text-gray-300" />
                               </div>
                               <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Awaiting Upload</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {/* Right: Specifications Card */}
            <div className="lg:col-span-4 space-y-6">
               <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-xl shadow-gray-200/50 space-y-8">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary" />
                     </div>
                     <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Specifications</h4>
                        <p className="text-base font-bold text-gray-900 tracking-tight">{order.job_type}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                     {[
                        { label: "Quantity", value: order.friendly_id?.includes("ORD") ? "Custom" : "1000 Units", icon: Hash },
                        { label: "Material", value: order.paper_type || "N/A", icon: Layers },
                        { label: "Dimensions", value: order.size || "N/A", icon: Maximize2 },
                        { label: "Finishing", value: order.lamination || "No Lamination", icon: Clock },
                     ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-50 group hover:border-primary/20 transition-all">
                           <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">{item.label}</span>
                           <span className="text-xs font-bold text-gray-900 tracking-tight">{item.value}</span>
                        </div>
                     ))}
                  </div>

                  <div className="pt-4 border-t border-gray-50">
                     <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID TOKEN</span>
                        <span className="text-[10px] font-mono font-semibold text-primary bg-primary/5 px-2 py-1 rounded">PF-{order.proofing_token?.split('-')[0].toUpperCase()}</span>
                     </div>
                  </div>
               </div>
               
               {/* Success State integrated into specifications on mobile/main area on success */}
               {status === 'SUCCESS' && (
                  <div className="bg-green-50 rounded-[32px] border border-green-100 p-8 text-center space-y-4 animate-in zoom-in-95 duration-500">
                     <div className="w-16 h-16 bg-white text-green-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/20">
                        {order.proof_status === 'APPROVED' ? <CheckCircle2 className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
                     </div>
                     <div>
                        <h2 className="text-xl font-bold text-green-900">{isApproved ? "Confirmed!" : "Revised!"}</h2>
                        <p className="text-sm text-green-700/70 font-medium leading-relaxed">
                           {isApproved 
                             ? "Our production team will begin printing immediately." 
                             : "Designer notified. We'll send a fresh proof shortly."}
                        </p>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </main>

      {/* Floating Action Bar [FIX] */}
      {!isApproved && status !== 'SUCCESS' && (
         <div className="fixed bottom-0 left-0 right-0 z-50 p-6 md:p-8 animate-in slide-in-from-bottom-24 duration-1000">
            <div className="max-w-screen-md mx-auto relative">
               
               {/* Feedback Drawer */}
               {showFeedback && (
                  <div className="absolute bottom-[calc(100%+16px)] left-0 right-0 p-8 bg-white/90 backdrop-blur-3xl rounded-[32px] border border-gray-100 shadow-2xl animate-in slide-in-from-bottom-8 duration-500 overflow-hidden">
                     <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
                           <MessageSquare className="w-3.5 h-3.5" /> REVISION DETAILS
                        </span>
                        <button onClick={() => setShowFeedback(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                           <X className="w-4 h-4" />
                        </button>
                     </div>
                     <textarea 
                        autoFocus
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="example: 'Change font to navy blue...', 'Increase logo size...'"
                        className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl p-6 text-sm font-medium outline-none border-focus:border-primary/30 min-h-[120px] resize-none"
                     />
                     <div className="pt-4 flex justify-end">
                        <button 
                           onClick={() => handleApproval(false)}
                           disabled={status === 'SAVING' || !feedback.trim()}
                           className="px-8 h-12 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-gray-900/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                           {status === 'SAVING' ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Feedback <ChevronRight className="w-4 h-4" /></>}
                        </button>
                     </div>
                  </div>
               )}

               {/* The Main Bar */}
               <div className="bg-white/90 backdrop-blur-2xl rounded-full p-2 border border-white shadow-2xl shadow-primary/10 flex items-center gap-2">
                  <div className="flex-1 pl-6 flex flex-col justify-center">
                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">STATUS</p>
                     <p className="text-[11px] font-semibold text-primary uppercase tracking-tight flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Pending Approval
                     </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <button 
                         onClick={() => setShowFeedback(true)}
                         className={cn(
                           "h-14 px-6 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap",
                           showFeedback ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100"
                         )}
                     >
                        <MessageSquare className="w-4 h-4" /> Revisions
                     </button>
                     <button 
                        onClick={() => handleApproval(true)}
                        disabled={status === 'SAVING'}
                        className="h-14 px-10 bg-gradient-to-r from-primary to-primary/90 text-white rounded-full text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-3 whitespace-nowrap"
                     >
                        {status === 'SAVING' ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Approve & Print <ChevronRight className="w-4 h-4" /></>}
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Boutique Footer */}
      <footer className="max-w-screen-lg mx-auto py-24 text-center">
         <div className="flex items-center justify-center gap-4 mb-8 opacity-20 grayscale">
            <div className="h-px w-12 bg-gray-400" />
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            <div className="h-px w-12 bg-gray-400" />
         </div>
         <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em] mb-2 leading-relaxed">
            Encrypted Verification Portal Powered by PrintFlow SaaS
         </p>
         <p className="text-[9px] font-semibold text-gray-200 tracking-widest">
            ALL RIGHTS RESERVED © 2026 • BOUTIQUE PRINT SHOP UTILITY
         </p>
      </footer>
    </div>
  );
}

function Hash(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>;
}

function ShieldCheck(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>;
}
