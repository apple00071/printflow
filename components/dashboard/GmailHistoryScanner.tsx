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
  AlertCircle,
  Loader2,
  ChevronRight,
  Plus
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
          instructions: `Imported from Gmail History Scanner.\nSubject: ${order.subject}\nDate: ${order.date}`,
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
    <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden font-sans">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Gmail Scanner</h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.1em]">Import past orders</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200/50">
              {[7, 14, 30].map(d => (
                <button 
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                    days === d ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {d}d
                </button>
              ))}
           </div>
           <button 
             onClick={scanHistory}
             disabled={loading}
             className="bg-slate-900 text-white h-9 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
           >
             {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
             Scan
           </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Searching Inbox...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Mail className="w-6 h-6 text-slate-200" />
            </div>
            <p className="text-[11px] text-slate-400 font-medium max-w-[200px] leading-relaxed">
              Scan your inbox to find past print orders and import them instantly.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
             {orders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-slate-50/50 transition-colors group">
                   <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                         {/* Metadata Row */}
                         <div className="flex items-center gap-2 text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                            <Calendar className="w-3 h-3" />
                            {order.date.split(' ').slice(0, 4).join(' ')}
                            <span className="text-slate-200">•</span>
                            <span className="text-slate-500 font-bold lowercase">{order.customerEmail}</span>
                         </div>
                         
                         {/* Subject/Title */}
                         <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-slate-700 truncate leading-none">{order.subject}</h4>
                            <p className="text-[11px] text-slate-400 line-clamp-1 italic font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                              "{order.snippet}"
                            </p>
                         </div>

                         {/* Extraction Badges */}
                         <div className="flex flex-wrap gap-2 pt-1">
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100/50">
                               <User className="w-2.5 h-2.5 text-slate-400" />
                               <span className="text-[9px] font-bold text-slate-600 truncate max-w-[80px]">{order.customerName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100/50">
                               <Package className="w-2.5 h-2.5 text-slate-400" />
                               <span className="text-[9px] font-bold text-slate-600 truncate max-w-[120px]">{order.jobType}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-100/50 px-2 py-1 rounded-md border border-slate-200/30">
                               <Hash className="w-2.5 h-2.5 text-slate-400" />
                               <span className="text-[9px] font-black text-slate-800">{order.quantity} Qty</span>
                            </div>
                         </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                         <button 
                           onClick={() => importOrder(order)}
                           disabled={!!importing}
                           className="h-10 px-4 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                         >
                           {importing === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                           Import
                         </button>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>

      {/* Footer Area */}
      {orders.length > 0 && (
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Found {orders.length} orders
           </div>
           <button 
             onClick={() => setOrders([])}
             className="text-[9px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors"
           >
             Clear Results
           </button>
        </div>
      )}
    </div>
  );
}
