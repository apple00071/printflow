"use client";

import { useState } from "react";
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
  Inbox
} from "lucide-react";
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
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<PotentialOrder[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/gmail/sync?mode=history&days=${days}`);
      const data = await res.json();
      if (data.success) {
        const allPotential = data.results.flatMap((r: any) => r.potentialOrders || []);
        setOrders(allPotential);
      } else {
        setError(data.error || "Failed to scan history");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
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
        })
      });
      
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      } else {
        alert("Failed to create order.");
      }
    } catch (err) {
      alert("Error importing order.");
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="relative group/scanner">
      {/* Background Decorative Element */}
      <div className="absolute -inset-1 bg-gradient-to-r from-slate-200 to-slate-100 rounded-[32px] blur opacity-25 group-hover/scanner:opacity-50 transition duration-1000 group-hover/scanner:duration-200"></div>
      
      <div className="relative bg-white/80 backdrop-blur-2xl rounded-[28px] border border-slate-200/60 shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Architectural Header */}
        <div className="px-8 py-7 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100/80">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-900 rounded-[20px] flex items-center justify-center text-white shadow-2xl shadow-slate-200 animate-float">
              <Inbox className="w-7 h-7" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Email Ingestor</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                History Mode Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/40">
                {[7, 14, 30].map(d => (
                  <button 
                    key={d}
                    onClick={() => setDays(d)}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all duration-300",
                      days === d ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {d} Days
                  </button>
                ))}
             </div>
             <button 
               onClick={scanHistory}
               disabled={loading}
               className="bg-slate-900 text-white h-14 px-8 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-slate-800 transition-all hover:translate-y-[-2px] active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200"
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
               Scan Inbox
             </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="min-h-[400px] bg-white/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-6">
              <div className="relative">
                 <div className="w-20 h-20 border-2 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                 <Mail className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-slate-900" />
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Filtering History</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 text-center px-10">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100">
                 <Inbox className="w-8 h-8 text-slate-200" />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-2">Inbox is Clean</h4>
              <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed font-medium">
                We'll scan your subject lines for order triggers like "print", "qty", or "copies".
              </p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 gap-4">
               {orders.map((order, idx) => (
                  <div 
                    key={order.id} 
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className="p-6 bg-white rounded-[24px] border border-slate-100 hover:border-slate-900/10 hover:shadow-[0_20px_60px_rgba(0,0,0,0.03)] transition-all duration-500 group/item animate-in fade-in slide-in-from-bottom-2"
                  >
                     <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex-1 space-y-5">
                           <div className="flex items-center gap-3">
                              <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                 {order.date.split(' ').slice(0, 4).join(' ')}
                              </div>
                              <div className="w-1 h-1 rounded-full bg-slate-200" />
                              <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                                 {order.customerEmail}
                                 <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/item:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover/item:translate-x-0" />
                              </div>
                           </div>
                           
                           <div className="space-y-1.5">
                              <h4 className="text-lg font-bold text-slate-800 group-hover/item:text-slate-900 transition-colors tracking-tight">
                                {order.subject}
                              </h4>
                              <p className="text-[12px] text-slate-400 leading-relaxed max-w-2xl line-clamp-1 italic font-medium">
                                "{order.snippet}"
                              </p>
                           </div>

                           <div className="flex flex-wrap gap-3">
                              {[
                                { icon: User, label: order.customerName },
                                { icon: Package, label: order.jobType },
                                { icon: Hash, label: `${order.quantity} Units` }
                              ].map((chip, i) => (
                                <div key={i} className="flex items-center gap-2 bg-slate-50/50 px-4 py-2 rounded-xl border border-slate-100/80 group-hover/item:bg-white group-hover/item:border-slate-200 transition-colors">
                                   <chip.icon className="w-3.5 h-3.5 text-slate-400" />
                                   <span className="text-[11px] font-bold text-slate-600">{chip.label}</span>
                                </div>
                              ))}
                           </div>
                        </div>

                        <div className="shrink-0">
                           <button 
                             onClick={() => importOrder(order)}
                             disabled={!!importing}
                             className="w-full lg:w-auto h-16 px-10 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg shadow-slate-200"
                           >
                             {importing === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                             Ingest Order
                           </button>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
          )}
        </div>

        {/* Dynamic Footer */}
        {orders.length > 0 && (
          <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-100/80 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center text-green-600">
                   <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                   {orders.length} Triggers Identified
                </p>
             </div>
             <button 
               onClick={() => setOrders([])}
               className="text-[11px] font-black text-slate-400 hover:text-red-500 uppercase tracking-[0.2em] transition-colors"
             >
               Purge List
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
