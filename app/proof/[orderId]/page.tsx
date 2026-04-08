"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { 
  CheckCircle2, 
  MessageSquare, 
  AlertCircle,
  Loader2,
  FileImage,
  ExternalLink,
  FileText
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
}

export default function ProofingPage({ params }: { params: { orderId: string } }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderProofData | null>(null);
  const [status, setStatus] = useState<string>("IDLE"); // IDLE, SAVING, SUCCESS, ERROR
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

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
            customers(name, phone)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.orderId, token]);

  const handleApproval = async (approve: boolean) => {
    setStatus("SAVING");
    try {
      const updateData: Partial<OrderProofData> = {
        proof_status: approve ? 'APPROVED' : 'REVISION_REQUESTED',
        proof_feedback: feedback
      };

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", params.orderId)
        .eq("proofing_token", token);

      if (error) throw error;
      
      setOrder({...order, ...updateData});
      setStatus("SUCCESS");
    } catch (err) {
      console.error(err);
      setStatus("ERROR");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
           <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
           <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h1>
           <p className="text-gray-500 max-w-sm">This proof link is no longer valid or has expired. Please contact the print shop for a new link.</p>
        </div>
    );
  }

  const isApproved = order.proof_status === 'APPROVED';

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-primary/10">
      {/* Premium Glass Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/50 p-4 sticky top-0 z-50 transition-all">
         <div className="max-w-screen-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Logo size="sm" />
               <div className="h-4 w-[1px] bg-gray-200 mx-1 hidden md:block" />
               <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] hidden md:block">APPROVAL PORTAL</span>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">ORDER ID</span>
               <span className="text-xs font-bold text-gray-900 mt-1 tabular-nums px-2 py-0.5 bg-gray-100 rounded-md border border-gray-200/50">
                  {order.friendly_id || `#${order?.id?.split('-')[0]}`}
               </span>
            </div>
         </div>
      </header>

      <main className="max-w-screen-md mx-auto py-10 px-4 space-y-8">
         {/* Welcome & Info */}
         <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/5 to-orange/5 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white rounded-3xl border border-gray-100/80 p-8 shadow-sm space-y-3">
               <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                     <FileImage className="w-4 h-4 text-primary" />
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">Design Approval</h1>
               </div>
               <p className="text-gray-500 text-sm leading-relaxed">
                  Hi <span className="font-bold text-gray-900">{order.customers?.name}</span>, please review the final design for your <span className="text-primary font-semibold">{order.job_type}</span>. Changes can be requested or approval granted below.
               </p>
               
               <div className="pt-2 flex flex-wrap gap-4">
                  <div className="bg-gray-50/80 px-3 py-1.5 rounded-full border border-gray-100 flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full animate-pulse",
                        order.proof_status === 'APPROVED' ? "bg-green-500" : "bg-orange"
                      )} />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Current Status: <span className={cn(
                           "font-black",
                           order.proof_status === 'APPROVED' ? "text-green-600" : "text-orange"
                        )}>{order.proof_status}</span>
                      </span>
                  </div>
               </div>
            </div>
         </div>

         {/* Design Image Container */}
         <div className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    Design Preview
                </h2>
                {order.proof_image_url && (
                    <a href={order.proof_image_url} target="_blank" className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors group">
                        VIEW FULL SIZE <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                )}
            </div>

            <div className="bg-[#F8FAFC] rounded-2xl overflow-hidden min-h-[400px] flex items-center justify-center border border-gray-100 relative group/preview shadow-inner">
                {order.proof_image_url ? (
                    order.proof_image_url.toLowerCase().endsWith('.pdf') ? (
                      <div className="text-center p-12 flex flex-col items-center">
                          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-red-500/5 border border-red-50/50">
                            <FileText className="w-12 h-12 text-red-500" />
                          </div>
                          <h3 className="text-xl font-black text-gray-900 mb-3">PDF Document Ready</h3>
                          <p className="text-sm text-gray-500 mb-8 max-w-[280px] leading-relaxed">This design is a high-resolution PDF. Please review it in its native viewer before approving.</p>
                          <a 
                             href={order.proof_image_url} 
                             target="_blank" 
                             className="bg-gray-900 text-white px-8 py-3.5 rounded-2xl text-sm font-bold shadow-2xl shadow-gray-900/20 hover:bg-gray-800 transition-all flex items-center gap-2 active:scale-95"
                          >
                             OPEN PDF IN NEW TAB <ExternalLink className="w-4 h-4" />
                          </a>
                      </div>
                    ) : (
                      <div className="relative cursor-zoom-in transition-transform duration-500 group-hover/preview:scale-[1.02]">
                         <Image 
                             src={order.proof_image_url} 
                             alt="Design Proof" 
                             width={1200}
                             height={900}
                             className="max-w-full h-auto object-contain"
                             unoptimized
                         />
                         <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover/preview:opacity-100">
                             <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-[10px] font-black tracking-widest text-gray-900 shadow-xl border border-white">
                                 CLICK TO ENLARGE
                             </div>
                         </div>
                      </div>
                    )
                ) : (
                    <div className="text-center p-12">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 grayscale">
                           <FileImage className="w-10 h-10 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium italic">No preview image uploaded yet</p>
                    </div>
                )}
            </div>
         </div>

         {/* Approval Actions */}
         {!isApproved && status !== 'SUCCESS' ? (
            <div className="bg-white rounded-3xl border border-gray-100/80 p-8 shadow-sm space-y-6">
                {showFeedback && (
                    <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Share Revision Details</label>
                           <span className="text-[10px] font-bold text-orange px-2 py-0.5 bg-orange/10 rounded">Changes Required</span>
                        </div>
                        <textarea 
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Example: Please increase the logo size by 20% and change the font color to Navy Blue..."
                            className="w-full p-6 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-orange/30 focus:ring-4 focus:ring-orange/5 transition-all min-h-[140px] resize-none leading-relaxed"
                        />
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-4">
                    {!showFeedback ? (
                        <>
                            <button 
                                onClick={() => handleApproval(true)}
                                disabled={status === 'SAVING'}
                                className="flex-[1.5] bg-gradient-to-r from-green-500 to-green-600 text-white font-black h-16 rounded-2xl shadow-xl shadow-green-500/25 flex items-center justify-center gap-3 hover:shadow-green-500/40 translate-y-0 hover:-translate-y-0.5 transition-all active:scale-[0.98] active:translate-y-0"
                            >
                                {status === 'SAVING' ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6" /> YES, APPROVE & PRINT</>}
                            </button>
                            <button 
                                onClick={() => setShowFeedback(true)}
                                className="flex-1 bg-white border border-gray-200 text-gray-600 font-black h-16 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
                            >
                                <MessageSquare className="w-5 h-5" /> REVISIONS
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={() => handleApproval(false)}
                                disabled={status === 'SAVING' || !feedback.trim()}
                                className="flex-[2] bg-orange text-white font-black h-16 rounded-2xl shadow-xl shadow-orange/25 flex items-center justify-center gap-3 hover:bg-orange/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
                            >
                                {status === 'SAVING' ? <Loader2 className="w-6 h-6 animate-spin" /> : "SUBMIT REVISION REQUEST"}
                            </button>
                            <button 
                                onClick={() => setShowFeedback(false)}
                                className="flex-1 border-2 border-gray-100 text-gray-600 font-black h-16 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-all active:scale-[0.98]"
                            >
                                CANCEL
                            </button>
                        </>
                    )}
                </div>
            </div>
         ) : (
             <div className={cn(
                "rounded-[40px] p-12 border relative overflow-hidden text-center space-y-6 animate-in zoom-in-95 duration-700",
                order.proof_status === 'APPROVED' ? "bg-green-50 border-green-100/50" : "bg-orange/5 border-orange/10"
             )}>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   {order.proof_status === 'APPROVED' ? <CheckCircle2 className="w-32 h-32" /> : <MessageSquare className="w-32 h-32" />}
                </div>

                <div className="relative space-y-4">
                  <div className={cn(
                     "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl",
                     order.proof_status === 'APPROVED' ? "bg-white text-green-500 shadow-green-500/20" : "bg-white text-orange shadow-orange/20"
                  )}>
                     {order.proof_status === 'APPROVED' ? (
                        <CheckCircle2 className="w-12 h-12" />
                     ) : (
                        <MessageSquare className="w-12 h-12" />
                     )}
                  </div>
                  
                  <h2 className={cn(
                     "text-4xl font-black tracking-tight",
                     order.proof_status === 'APPROVED' ? "text-green-900" : "text-orange"
                  )}>
                     {order.proof_status === 'APPROVED' ? "Order Approved!" : "Changes Sent!"}
                  </h2>
                  
                  <p className={cn(
                     "text-base max-w-sm mx-auto leading-relaxed",
                     order.proof_status === 'APPROVED' ? "text-green-700/80" : "text-gray-600"
                  )}>
                     {order.proof_status === 'APPROVED' 
                        ? "Great choice! Our production team has been notified and will begin printing your order immediately." 
                        : "Your revision requests have been received. Our designers will update the artwork and send you a new proof shortly."}
                  </p>
                </div>

                <div className="pt-8 border-t border-black/5 inline-flex flex-col items-center">
                    <span className={cn(
                       "text-[10px] font-black uppercase tracking-[0.3em] mb-2",
                       order.proof_status === 'APPROVED' ? "text-green-400" : "text-gray-400"
                    )}>
                       CONFIRMATION TOKEN
                    </span>
                    <div className={cn(
                       "px-4 py-2 rounded-xl font-mono text-sm tracking-widest",
                       order.proof_status === 'APPROVED' ? "bg-green-100/50 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>
                       {order?.id?.split('-')[0].toUpperCase()}—{order.proofing_token?.split('-')[0].toUpperCase()}
                    </div>
                </div>
             </div>
         )}
      </main>

      {/* Security Footer Badge */}
      <footer className="max-w-screen-md mx-auto px-4 py-16 text-center space-y-6">
         <div className="flex items-center justify-center gap-6 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500">
            <div className="h-[1px] w-12 bg-gray-300" />
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                  <CheckCircle2 className="w-4 h-4 text-gray-400" />
               </div>
               <span className="text-[9px] font-black tracking-widest text-gray-400 uppercase">Secure Verification</span>
            </div>
            <div className="h-[1px] w-12 bg-gray-300" />
         </div>
         
         <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-loose">
               SECURE DESIGN APPROVAL PORTAL POWERED BY PRINTFLOW SAAS
            </p>
            <p className="text-[9px] font-bold text-gray-300 tracking-widest">
               ENCRYPTED END-TO-END • ALL RIGHTS RESERVED © 2026
            </p>
         </div>
      </footer>
    </div>
  );
}
