"use client";

import { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  Mail, 
  Calendar, 
  User, 
  Package, 
  Hash, 
  CheckCircle2, 
  Loader2,
  Plus,
  ArrowUpRight,
  Inbox,
  Settings,
  Link as LinkIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PotentialOrder {
  id: string;
  subject: string;
  from: string;
  date: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  jobType: string;
  quantity: string;
  snippet: string;
}

export default function GmailHistoryScanner() {
  const router = useRouter();
  const supabase = createClient();
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [checkingIntegration, setCheckingIntegration] = useState(true);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [orders, setOrders] = useState<PotentialOrder[]>([]);
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    const checkIntegration = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("tenant_integrations")
          .select("id")
          .eq("type", "GMAIL")
          .eq("is_active", true)
          .maybeSingle();

        setIsGmailConnected(!!data);
      } catch (err) {
        console.error("Integration check failed:", err);
      } finally {
        setCheckingIntegration(false);
      }
    };
    checkIntegration();
  }, [supabase]);

  const scanHistory = async () => {
    if (!isGmailConnected) {
      router.push('/dashboard/settings?tab=integrations');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/gmail/sync?mode=history&days=${days}`);
      const data = await res.json();
      if (data.success) {
        const allPotential = data.results.flatMap((r: any) => r.potentialOrders || []);
        setOrders(allPotential);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const importOrder = async (order: PotentialOrder) => {
    setImporting(order.id);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: order.customerName,
          phone: order.phone,
          email: order.customerEmail,
          jobType: order.jobType,
          quantity: order.quantity,
          instructions: `Imported via History Scanner.\nSubject: ${order.subject}`,
          totalAmount: 0,
          advancePaid: 0,
          gmail_message_id: order.id,
        })
      });
      
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(null);
    }
  };

  if (checkingIntegration) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/60 p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
            <Inbox className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Email Order Scanner</h3>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex bg-white p-1 rounded-lg border border-slate-200/50">
              {[7, 14, 30].map(d => (
                <button 
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    "px-3 py-1 rounded-md text-[11px] font-bold transition-all",
                    days === d ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {d}d
                </button>
              ))}
           </div>
           <button 
             onClick={scanHistory}
             disabled={loading}
             className="bg-[#1e3a5f] text-white h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-[#162a44] transition-colors disabled:opacity-50"
           >
             {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
             Scan
           </button>
        </div>
      </div>

      <div className="min-h-[240px]">
        {!isGmailConnected ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#1e3a5f] mb-4">
               <LinkIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 mb-1">Gmail Integration Required</h4>
            <p className="text-xs text-slate-500 mb-6 max-w-[280px]">Connect your business Gmail account to automatically scan and import orders from your inbox.</p>
            <button 
              onClick={() => router.push('/dashboard/settings?tab=integrations')}
              className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#162a44] transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              Connect Gmail
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-slate-200 animate-spin" />
            <p className="mt-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider">Searching Inbox...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <Mail className="w-8 h-8 text-slate-100 mb-3" />
            <p className="text-sm text-slate-400 font-medium">No order triggers found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
             {orders.map((order) => (
                <div key={order.id} className="p-5 hover:bg-slate-50/50 transition-colors group">
                   <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                         <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            {order.date.split(' ').slice(0, 4).join(' ')}
                            <span className="text-slate-200">•</span>
                            <span className="text-slate-500">{order.customerEmail}</span>
                         </div>
                         
                         <h4 className="text-sm font-semibold text-slate-900 truncate">{order.subject}</h4>

                         <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-medium text-slate-600">
                               {order.customerName}
                            </span>
                            <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-medium text-slate-600">
                               {order.jobType}
                            </span>
                            <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-bold text-slate-900">
                               {order.quantity} Qty
                            </span>
                         </div>
                      </div>

                      <button 
                        onClick={() => importOrder(order)}
                        disabled={!!importing}
                        className="h-10 px-4 bg-[#1e3a5f] text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-[#162a44] transition-colors disabled:opacity-50"
                      >
                        {importing === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Import
                      </button>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
