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
        // results is an array of tenant results
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
      // We'll call a dedicated action or just use the API if we had one for single import.
      // For now, let's simulate the creation or assume we'll use a server action.
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
        alert("Order created successfully!");
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
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-gray-50 bg-gray-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Gmail History Scanner</h3>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Import past orders from your inbox</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                {[7, 14, 30].map(d => (
                  <button 
                    key={d}
                    onClick={() => setDays(d)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-bold transition-all",
                      days === d ? "bg-primary text-white" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {d} Days
                  </button>
                ))}
             </div>
             <button 
               onClick={scanHistory}
               disabled={loading}
               className="bg-primary text-white h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
               Scan Now
             </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="relative">
               <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
               <Mail className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-bold text-gray-900 uppercase tracking-widest animate-pulse">Searching your inbox...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-8">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
               <Mail className="w-10 h-10 text-gray-200" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Ready to scan?</h4>
            <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
              We'll look for emails containing keywords like "print", "qty", or "cards" and help you import them as orders.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
             {orders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50/50 transition-all group">
                   <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex-1 space-y-4">
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-gray-400 uppercase">{order.date}</span>
                            <div className="h-1 w-1 rounded-full bg-gray-200" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{order.customerEmail}</span>
                         </div>
                         
                         <div>
                            <h4 className="text-base font-bold text-gray-900 group-hover:text-primary transition-colors">{order.subject}</h4>
                            <p className="text-xs text-gray-500 line-clamp-1 italic mt-1">"{order.snippet}"</p>
                         </div>

                         <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                               <User className="w-3.5 h-3.5 text-gray-400" />
                               <span className="text-[10px] font-bold text-gray-700">{order.customerName}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                               <Package className="w-3.5 h-3.5 text-gray-400" />
                               <span className="text-[10px] font-bold text-gray-700">{order.jobType}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                               <Hash className="w-3.5 h-3.5 text-gray-400" />
                               <span className="text-[10px] font-bold text-gray-700">{order.quantity} Qty</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                         <button 
                           onClick={() => importOrder(order)}
                           disabled={!!importing}
                           className="bg-slate-900 text-white h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                         >
                           {importing === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                           Create Order
                         </button>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {orders.length > 0 && (
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Found {orders.length} potential orders in the last {days} days
           </p>
           <button 
             onClick={() => setOrders([])}
             className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
           >
             Clear Results
           </button>
        </div>
      )}
    </div>
  );
}
