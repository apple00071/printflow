"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { 
  CheckCircle2, 
  MessageSquare, 
  ShieldCheck,
  AlertCircle,
  Loader2,
  FileImage,
  ExternalLink
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
 
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
    <div className="min-h-screen bg-white md:bg-gray-50 pb-20">
      {/* Mobile-Friendly Header */}
      <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-20 shadow-sm md:shadow-none">
         <div className="max-w-screen-md mx-auto flex items-center justify-between">
            <Logo size="sm" />
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">ORDER ID</span>
               <span className="text-xs font-mono font-bold text-primary">{order.friendly_id || `#${order?.id?.split('-')[0]}`}</span>
            </div>
         </div>
      </header>

      <main className="max-w-screen-md mx-auto py-8 px-4 space-y-6">
         {/* Welcome & Info */}
         <div className="bg-white md:rounded-2xl md:border md:border-gray-100 p-6 md:shadow-sm space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Design Approval Needed</h1>
            <p className="text-gray-500 text-sm">Hi <span className="font-bold text-gray-800">{order.customers?.name}</span>, please review the design for your <span className="font-bold text-primary">{order.job_type}</span> order below.</p>
            
            <div className="pt-4 flex flex-wrap gap-4">
                <div className="bg-gray-50 px-3 py-2 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status: <span className="text-gray-900">{order.proof_status}</span></span>
                </div>
                <div className="bg-gray-50 px-3 py-2 rounded-lg flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Secure Approval Link</span>
                </div>
            </div>
         </div>

         {/* Design Image Container */}
         <div className="bg-white md:rounded-2xl md:border md:border-gray-100 p-4 md:shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <FileImage className="w-4 h-4" /> Design Preview
                </h2>
                {order.proof_image_url && (
                    <a href={order.proof_image_url} target="_blank" className="text-[10px] font-bold text-primary flex items-center gap-1">
                        VIEW FULL SIZE <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>

            <div className="bg-gray-100 rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center border border-gray-100 relative group">
                {order.proof_image_url ? (
                    <Image 
                        src={order.proof_image_url} 
                        alt="Design Proof" 
                        width={800}
                        height={600}
                        className="max-w-full h-auto object-contain cursor-zoom-in"
                        unoptimized
                    />
                ) : (
                    <div className="text-center p-10">
                        <FileImage className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <p className="text-sm text-gray-400 italic">No preview image uploaded yet.</p>
                    </div>
                )}
            </div>
         </div>

         {/* Approval Actions - Float on mobile? */}
         {!isApproved && status !== 'SUCCESS' ? (
            <div className="bg-white md:rounded-2xl border-t md:border-t-0 p-6 md:shadow-sm space-y-4">
                {showFeedback && (
                    <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Share your feedback or requested changes</label>
                        <textarea 
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Example: Change the background to blue, Increase the logo size..."
                            className="w-full p-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange transition-all min-h-[120px]"
                        />
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-3">
                    {!showFeedback ? (
                        <>
                            <button 
                                onClick={() => handleApproval(true)}
                                disabled={status === 'SAVING'}
                                className="flex-1 bg-green-500 text-white font-bold h-14 md:h-12 rounded-xl shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 hover:bg-green-600 transition-all transform active:scale-[0.98]"
                            >
                                {status === 'SAVING' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> YES, APPROVE & PRINT</>}
                            </button>
                            <button 
                                onClick={() => setShowFeedback(true)}
                                className="flex-1 border-2 border-gray-100 text-gray-600 font-bold h-14 md:h-12 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
                            >
                                <MessageSquare className="w-5 h-5" /> REQUEST CHANGES
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={() => handleApproval(false)}
                                disabled={status === 'SAVING' || !feedback.trim()}
                                className="flex-1 bg-orange text-white font-bold h-14 md:h-12 rounded-xl shadow-lg shadow-orange/20 flex items-center justify-center gap-2 hover:bg-orange/90 transition-all disabled:opacity-50"
                            >
                                {status === 'SAVING' ? <Loader2 className="w-5 h-5 animate-spin" /> : "SUBMIT FEEDBACK"}
                            </button>
                            <button 
                                onClick={() => setShowFeedback(false)}
                                className="md:w-32 border-2 border-gray-100 text-gray-600 font-bold h-14 md:h-12 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all"
                            >
                                BACK
                            </button>
                        </>
                    )}
                </div>
            </div>
         ) : (
             <div className="bg-green-50 md:rounded-2xl p-8 border border-green-100 text-center space-y-3 animate-in fade-in duration-500">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold text-green-900">Success!</h2>
                <p className="text-green-700 text-sm">Your approval has been received. We&apos;ve notified the team to start printing your order.</p>
                <div className="pt-4">
                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Confirmation Token</span>
                    <p className="text-xs font-mono text-green-600">{order?.id?.split('-')[0]}-{order.proofing_token?.split('-')[0]}</p>
                </div>
             </div>
         )}
      </main>

      {/* Trust Footer */}
      <footer className="max-w-screen-md mx-auto px-4 py-10 text-center space-y-4">
         <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-loose">
            SECURE DESIGN APPROVAL PORTAL PORTAL POWERED BY PRINTFLOW SAAS<br/>
            ALL RIGHTS RESERVED © 2026
         </p>
      </footer>
    </div>
  );
}
