"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Phone, 
  ShoppingBag, 
  IndianRupee, 
  Clock, 
  History,
  Loader2,
  UserCircle
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { useLanguage } from "@/lib/context/LanguageContext";

interface Customer {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

interface Order {
  id: string;
  friendly_id?: string;
  job_type: string;
  quantity: number;
  total_amount: number;
  advance_paid: number;
  status: string;
  created_at: string;
}

export default function CustomerProfilePage({ params }: { params: { id: string } }) {
  const { t } = useLanguage();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomerData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const currentTenant = await getCurrentTenant(supabase);
        
        // 1. Fetch Customer (filtered by tenant)
        const { data: cust, error: custErr } = await supabase
          .from("customers")
          .select("*")
          .eq("id", params.id)
          .eq('tenant_id', currentTenant?.id)
          .single();
        
        if (custErr) throw custErr;
        setCustomer(cust);

        // 2. Fetch Customer Orders (filtered by tenant)
        const { data: ords, error: ordsErr } = await supabase
          .from("orders")
          .select("*")
          .eq("customer_id", params.id)
          .eq('tenant_id', currentTenant?.id)
          .order("created_at", { ascending: false });
        
        if (ordsErr) throw ordsErr;
        setOrders(ords || []);
      } catch (err) {
        console.error("Error fetching customer profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomerData();
  }, [params.id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400">
       <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
       <p className="text-sm uppercase tracking-widest">{t("Loading Profile...", "ప్రొఫైల్ లోడ్ అవుతోంది...")}</p>
    </div>
  );

  if (!customer) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400 text-center">
       <h2 className="text-2xl text-gray-900 mb-2 uppercase tracking-tighter">{t("Customer Not Found", "కస్టమర్ కనుగొనబడలేదు")}</h2>
       <p className="mb-6">{t("The customer profile you are looking for does not exist.", "మీరు వెతుకుతున్న కస్టమర్ ప్రొఫైల్ లేదు.")}</p>
       <Link href="/dashboard/customers" className="bg-primary text-white px-8 py-3 rounded-xl shadow-lg shadow-primary/20">{t("Back to Customers", "కస్టమర్లకు తిరిగి వెళ్లండి")}</Link>
    </div>
  );

  // Statistics Calculation
  const totalBusiness = orders.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
  const totalBalance = orders.reduce((acc, curr) => {
    const bal = Number(curr.total_amount) - Number(curr.advance_paid || 0);
    return acc + bal;
  }, 0);

  return (
    <div className="max-w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/customers" className="p-2 hover:bg-white rounded-lg transition-colors border border-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl text-gray-900">{t("Customer Profile", "కస్టమర్ ప్రొఫైల్")}</h1>
          <p className="text-gray-500 text-sm">{t("Viewing comprehensive history for", "వీరి పూర్తి చరిత్ర:")} {customer.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="space-y-6">
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                 <UserCircle className="w-16 h-16 text-primary/40" />
              </div>
              <h2 className="text-xl text-gray-900 mb-1 tracking-tight">{customer.name}</h2>
              <p className="text-sm text-primary flex items-center justify-center gap-1 mb-6">
                 <Phone className="w-3 h-3" /> {customer.phone}
              </p>
              
              <div className="w-full grid grid-cols-2 gap-4 pt-6 border-t border-gray-50 uppercase tracking-widest text-[9px] text-gray-400">
                 <div>
                    <p className="mb-1">{t("Member Since", "సభ్యత్వం ప్రారంభం")}</p>
                    <p className="text-gray-900 text-xs">{formatDate(customer.created_at)}</p>
                 </div>
                 <div>
                    <p className="mb-1">{t("Orders Count", "ఆర్డర్ల సంఖ్య")}</p>
                    <p className="text-gray-900 text-xs">{orders.length}</p>
                 </div>
              </div>
           </div>

           <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-xs text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">{t("Business Summary", "వ్యాపార సారాంశం")}</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                          <IndianRupee className="w-4 h-4" />
                       </div>
                       <span className="text-sm text-gray-600">{t("Total Business", "మొత్తం వ్యాపారం")}</span>
                    </div>
                    <span className="text-sm text-gray-900">{formatCurrency(totalBusiness)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                          <Clock className="w-4 h-4" />
                       </div>
                       <span className="text-sm text-gray-600">{t("Total Balance", "మొత్తం బకాయి")}</span>
                    </div>
                    <span className={`text-sm ${totalBalance > 0 ? "text-red-500" : "text-green-500"}`}>
                       {formatCurrency(totalBalance)}
                    </span>
                 </div>
              </div>
           </div>
        </div>

        {/* Order History Table */}
        <div className="lg:col-span-2">
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                 <h3 className="text-gray-900 uppercase tracking-wider text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    {t("Order History", "ఆర్డర్ చరిత్ర")}
                 </h3>
                 <span className="text-xs text-gray-400">{orders.length} {t("Records", "రికార్డులు")}</span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-100">
                       <tr>
                          <th className="px-6 py-4">{t("Order ID", "ఆర్డర్ ఐడి")}</th>
                          <th className="px-6 py-4">{t("Job Type", "పని రకం")}</th>
                          <th className="px-6 py-4">{t("Status", "స్థితి")}</th>
                          <th className="px-6 py-4 text-right">{t("Amount", "ధర")}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                       {orders.length === 0 ? (
                          <tr>
                             <td colSpan={4} className="px-6 py-20 text-center text-gray-400">
                                <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-gray-100" />
                                <p className="text-xs">{t("No orders recorded for this customer yet.", "ఈ కస్టమర్ కోసం ఇంకా ఆర్డర్లు లేవు.")}</p>
                             </td>
                          </tr>
                       ) : (
                          orders.map((ord) => (
                             <tr key={ord.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-5 whitespace-nowrap">
                                   <Link href={`/dashboard/orders/${ord.id}`} className="text-[10px] font-mono text-primary uppercase underline-offset-4 hover:underline">
                                      {ord.friendly_id || `#${ord.id.split('-')[0]}`}
                                   </Link>
                                </td>
                                <td className="px-6 py-5">
                                   <p className="text-gray-900">{ord.job_type}</p>
                                   <p className="text-[10px] text-gray-400 font-normal">{t("Qty", "క్వాంటిటీ")}: {ord.quantity}</p>
                                </td>
                                <td className="px-6 py-5">
                                   <span className={`px-2 py-1 rounded-full text-[9px] uppercase tracking-widest ${
                                      ord.status === "DELIVERED" ? "bg-gray-100 text-gray-600" : "bg-primary text-white"
                                    }`}>
                                      {ord.status}
                                   </span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                   <p className="text-gray-900">{formatCurrency(ord.total_amount)}</p>
                                   {(Number(ord.total_amount) - Number(ord.advance_paid)) > 0 && (
                                      <p className="text-[10px] text-red-500 uppercase tracking-tighter">
                                         {t("Bal", "బకాయి")}: {formatCurrency(Number(ord.total_amount) - Number(ord.advance_paid))}
                                      </p>
                                   )}
                                </td>
                             </tr>
                          ))
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
