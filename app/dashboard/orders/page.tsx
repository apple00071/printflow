"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, MoreVertical, Calendar, Phone, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { getOrders } from "@/lib/supabase/actions";

import { useLanguage } from "@/lib/context/LanguageContext";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  friendly_id?: string;
  customers?: {
    name: string;
    phone: string;
  } | null;
  job_type: string;
  quantity: string;
  status: string;
  total_amount: number;
  advance_paid: number;
  total_with_gst?: number;
}

export default function OrdersPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderStatuses = [
    { label: t("All", "అన్నీ"), value: "ALL" },
    { label: t("Received", "అందుకున్నవి"), value: "RECEIVED" },
    { label: t("Designing", "డిజైనింగ్"), value: "DESIGNING" },
    { label: t("Printing", "ప్రింటింగ్"), value: "PRINTING" },
    { label: t("Ready", "సిద్ధం"), value: "READY" },
    { label: t("Delivered", "డెలివరీ"), value: "DELIVERED" },
  ];

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrders({
        status: statusFilter,
        search: searchQuery
      });
      setOrders(data || []);
    } catch {
      setError(t("Failed to load orders. Please check your connection and try again.", "ఆర్డర్లు లోడ్ చేయడం విఫలమైంది. మీ కనెక్షన్ తనిఖీ చేసి మళ్ళీ ప్రయత్నించండి."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQuery]);

  // Client-side search filtering
  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.customers?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.customers?.phone || "").includes(searchQuery)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RECEIVED": return "bg-gray-100 text-gray-700";
      case "DESIGNING": return "bg-blue-100 text-blue-700";
      case "PRINTING": return "bg-purple-100 text-purple-700";
      case "READY": return "bg-green-100 text-green-700  border border-green-200";
      case "DELIVERED": return "bg-gray-800 text-white";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
        <Link 
          href="/dashboard/orders/new" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm font-medium w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>{t("New Order", "కొత్త ఆర్డర్")}</span>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("Search by customer or phone...", "పేరు లేదా ఫోన్ నంబర్ ద్వారా వెతకండి...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 md:w-48 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {orderStatuses.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400">
             <Loader2 className="w-10 h-10 animate-spin mb-4" />
             <p className="text-sm">{t("Fetching orders...", "ఆర్డర్లు వస్తున్నాయి...")}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="bg-red-50 p-6 rounded-full mb-4">
              <AlertCircle className="w-10 h-10 text-red-300" />
            </div>
            <p className="text-gray-900 mb-1">{t("Something went wrong", "ఏదో తప్పు జరిగింది")}</p>
            <p className="text-xs text-gray-500 mb-4">{error}</p>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t("Retry", "మళ్ళీ ప్రయత్నించండి")}
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400 text-center">
             <div className="bg-gray-50 p-6 rounded-full mb-4">
                <Calendar className="w-10 h-10 text-gray-200" />
             </div>
             <p className="text-gray-900 mb-1">{t("No Orders Found", "ఆర్డర్లు లేవు")}</p>
             <p className="text-xs mb-4">{t("Adjust your filters or create a new order to get started.", "మీ ఫిల్టర్లను మార్చండి లేదా కొత్త ఆర్డర్ సృష్టించండి.")}</p>
             {statusFilter === "ALL" && !searchQuery && (
               <Link
                 href="/dashboard/orders/new"
                 className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
               >
                 <Plus className="w-4 h-4" />
                 {t("Create your first order", "మొదటి ఆర్డర్ సృష్టించండి")}
               </Link>
             )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="w-full text-left hidden sm:table">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider">{t("Order ID", "ఆర్డర్ ID")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider">{t("Customer", "కస్టమర్")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider">{t("Order Details", "ఆర్డర్ వివరాలు")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider">{t("Status", "స్థితి")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider text-right">{t("Amount", "మొత్తం")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider text-right">{t("Actions", "చర్యలు")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-primary uppercase">
                       {order.friendly_id || `#${order.id.slice(0, 8)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm  text-gray-900">{order.customers?.name || "Unknown"}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {order.customers?.phone || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 ">{order.job_type}</span>
                        <span className="text-xs text-gray-500 font-normal">{t("Qty", "క్వాంటిటీ")}: {order.quantity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider",
                        getStatusColor(order.status)
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 font-medium">
                          {formatCurrency(order.total_with_gst || order.total_amount)}
                        </span>
                        {((order.total_with_gst || order.total_amount) - order.advance_paid) > 0 && (
                          <span className="text-[10px] text-red-500 uppercase tracking-tight font-semibold">
                            Bal: {formatCurrency((order.total_with_gst || order.total_amount) - order.advance_paid)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link 
                        href={`/dashboard/orders/${order.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors inline-block"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card List */}
            <div className="sm:hidden grid grid-cols-1 divide-y divide-gray-100">
               {filteredOrders.map((order) => (
                  <div 
                    key={order.id}
                    onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    className="p-4 active:bg-gray-50 transition-colors space-y-3"
                  >
                     <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-tight">#{order.friendly_id || order.id.slice(0, 8)}</span>
                           <span className="text-base font-bold text-gray-900">{order.customers?.name || "Unknown"}</span>
                        </div>
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          getStatusColor(order.status)
                        )}>
                          {order.status}
                        </span>
                     </div>
                     
                     <div className="flex justify-between items-end">
                        <div className="space-y-1">
                           <p className="text-xs text-gray-500 font-medium">{order.job_type} • {order.quantity} pcs</p>
                           <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {order.customers?.phone || "N/A"}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total_with_gst || order.total_amount)}</p>
                           {((order.total_with_gst || order.total_amount) - order.advance_paid) > 0 && (
                             <p className="text-[10px] text-red-500 font-bold uppercase">
                               Due: {formatCurrency((order.total_with_gst || order.total_amount) - order.advance_paid)}
                             </p>
                           )}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

