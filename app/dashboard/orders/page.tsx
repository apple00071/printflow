"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Calendar,
  Phone,
  Loader2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { getOrders } from "@/lib/supabase/actions";

import { useLanguage } from "@/lib/context/LanguageContext";

interface Order {
  id: string;
  friendly_id?: string;
  customers?: {
    name: string;
    phone: string;
  } | null;
  job_type: string;
  quantity: number;
  status: string;
  total_amount: number;
  advance_paid: number;
}

export default function OrdersPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const orderStatuses = [
    { label: t("All", "అన్నీ"), value: "ALL" },
    { label: t("Received", "అందుకున్నవి"), value: "RECEIVED" },
    { label: t("Designing", "డిజైనింగ్"), value: "DESIGNING" },
    { label: t("Printing", "ప్రింటింగ్"), value: "PRINTING" },
    { label: t("Ready", "సిద్ధం"), value: "READY" },
    { label: t("Delivered", "డెలివరీ"), value: "DELIVERED" },
  ];

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const data = await getOrders({ 
          status: statusFilter, 
          search: searchQuery 
        });
        setOrders(data || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [statusFilter, searchQuery]); // Re-fetch on status change or search change

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
          className="bg-orange text-white px-4 py-2 rounded-lg  flex items-center gap-2 hover:bg-orange/90 transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
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
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400 text-center">
             <div className="bg-gray-50 p-6 rounded-full mb-4">
                <Calendar className="w-10 h-10 text-gray-200" />
             </div>
             <p className=" text-gray-900">{t("No Orders Found", "ఆర్డర్లు లేవు")}</p>
             <p className="text-xs">{t("Adjust your filters or create a new order", "మీ ఫిల్టర్లను మార్చండి లేదా కొత్త ఆర్డర్ సృష్టించండి")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider">{t("Order ID", "ఆర్డర్ ID")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider">{t("Customer", "కస్టమర్")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider">{t("Job Details", "ఆర్డర్ వివరాలు")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider">{t("Status", "స్థితి")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider text-right">{t("Amount", "మొత్తం")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider text-right">{t("Actions", "చర్యలు")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-[10px]  font-mono text-primary uppercase">
                       {order.friendly_id || `#${order.id.split('-')[0]}`}
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
                        "px-2 py-1 rounded-full text-[10px]  uppercase tracking-wider font-mono",
                        getStatusColor(order.status)
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col">
                        <span className="text-sm  text-gray-900">{formatCurrency(order.total_amount)}</span>
                        {(order.total_amount - order.advance_paid) > 0 && (
                          <span className="text-[10px] text-red-500  uppercase tracking-tight">Bal: {formatCurrency(order.total_amount - order.advance_paid)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link 
                        href={`/dashboard/orders/${order.id}`}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors inline-block"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: unknown[]) {
  return inputs.filter(Boolean).join(" ");
}
