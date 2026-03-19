"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Phone, 
  History,
  TrendingUp,
  AlertCircle,
  Loader2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { useLanguage } from "@/lib/context/LanguageContext";

interface CustomerOrder {
  total_amount: number;
  advance_paid: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  orders: CustomerOrder[];
  total_orders: number;
  business_value: number;
  balance: number;
}

export default function CustomersPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalBusiness: 0,
    totalOutstanding: 0
  });

  useEffect(() => {
    async function fetchCustomersData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const currentTenant = await getCurrentTenant(supabase);
        
        // Fetch customers and their basic order data for calculation (filtered by tenant)
        const { data, error } = await supabase
          .from("customers")
          .select(`
            *,
            orders (
              total_amount,
              advance_paid
            )
          `)
          .eq('tenant_id', currentTenant?.id);
        
        if (error) throw error;

        // Process data to calculate totals and per-customer stats
        const processedCustomers = (data || []).map(customer => {
          const customerBusiness = customer.orders.reduce((acc: number, ord: { total_amount: number }) => acc + Number(ord.total_amount), 0);
          const customerPaid = customer.orders.reduce((acc: number, ord: { advance_paid: number }) => acc + Number(ord.advance_paid), 0);
          const customerBalance = customerBusiness - customerPaid;
          
          return {
            ...customer,
            total_orders: customer.orders.length,
            business_value: customerBusiness,
            balance: customerBalance
          };
        }).sort((a, b) => a.name.localeCompare(b.name));

        const globalBusiness = processedCustomers.reduce((acc, c) => acc + c.business_value, 0);
        const globalOutstanding = processedCustomers.reduce((acc, c) => acc + c.balance, 0);

        setCustomers(processedCustomers);
        setStats({
          totalCustomers: processedCustomers.length,
          totalBusiness: globalBusiness,
          totalOutstanding: globalOutstanding
        });
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomersData();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-8">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-500 p-3 rounded-lg text-white">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 ">{t("Total Customers", "కస్టమర్లు")}</p>
            <p className="text-2xl  text-gray-900">{stats.totalCustomers}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-500 p-3 rounded-lg text-white">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 ">{t("Business Value", "వ్యాపారం")}</p>
            <p className="text-2xl  text-gray-900">{formatCurrency(stats.totalBusiness)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-500 p-3 rounded-lg text-white">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 ">{t("Total Outstanding", "బకాయిలు")}</p>
            <p className="text-2xl  text-gray-900 ">{formatCurrency(stats.totalOutstanding)}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("Search by name or phone...", "పేరు లేదా ఫోన్ నంబర్ ద్వారా వెతకండి...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          />
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400">
             <Loader2 className="w-10 h-10 animate-spin mb-4" />
             <p className="text-sm">{t("Fetching customers...", "కస్టమర్లు వస్తున్నారు...")}</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400 text-center">
             <div className="bg-gray-50 p-6 rounded-full mb-4">
                <Users className="w-10 h-10 text-gray-200" />
             </div>
             <p className=" text-gray-900">{t("No Customers Found", "కస్టమర్లు లేవు")}</p>
             <p className="text-xs">{t("Add a new order to create your first customer", "మొదటి కస్టమర్ కోసం కొత్త ఆర్డర్ సృష్టించండి")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider">{t("Customer Name", "కస్టమర్ పేరు")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider">{t("Contact", "సంప్రదించండి")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider">{t("Total Orders", "మొత్తం ఆర్డర్లు")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider text-right">{t("Business Value", "వ్యాపారం")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider text-right">{t("Balance", "బకాయి")}</th>
                  <th className="px-6 py-4 text-xs  text-gray-500 uppercase tracking-wider text-right">{t("Actions", "చర్యలు")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm  text-gray-900">{customer.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="w-3 h-3 text-primary" /> {customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs  text-gray-600">
                        <History className="w-3 h-3" /> {customer.total_orders}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm  text-gray-900">{formatCurrency(customer.business_value)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {customer.balance > 0 ? (
                        <span className="text-[10px]  text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase tracking-tighter">
                          {t("Due", "బకాయి")}: {formatCurrency(customer.balance)}
                        </span>
                      ) : (
                        <span className="text-[10px]  text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase tracking-tighter">
                          {t("Paid", "చెల్లించారు")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link 
                        href={`/dashboard/customers/${customer.id}`}
                        className="text-primary text-xs  hover:underline"
                      >
                        {t("View Details", "వివరాలు")}
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
