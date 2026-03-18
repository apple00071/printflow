"use client";

import { useState, useEffect } from "react";
import { 
  Download, 
  ArrowLeft, 
  TrendingUp, 
  ShieldCheck, 
  Loader2,
  Table as TableIcon,
  PieChart
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useLanguage } from "@/lib/context/LanguageContext";

export default function GSTReportsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const months = [
    { value: 1, label: t("January", "జనవరి") },
    { value: 2, label: t("February", "ఫిబ్రవరి") },
    { value: 3, label: t("March", "మార్చి") },
    { value: 4, label: t("April", "ఏప్రిల్") },
    { value: 5, label: t("May", "మే") },
    { value: 6, label: t("June", "జూన్") },
    { value: 7, label: t("July", "జూలై") },
    { value: 8, label: t("August", "ఆగస్టు") },
    { value: 9, label: t("September", "సెప్టెంబర్") },
    { value: 10, label: t("October", "అక్టోబర్") },
    { value: 11, label: t("November", "నవంబర్") },
    { value: 12, label: t("December", "డిసెంబర్") },
  ];

  const fetchReport = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const currentTenant = await getCurrentTenant(supabase);
      if (currentTenant) {
        // Fetch orders for the selected month
        const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
        const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();

        const { data, error } = await supabase
          .from('orders')
          .select('*, customers(name, gstin)')
          .eq('tenant_id', currentTenant.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .neq('gst_type', 'NONE')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      }
    } catch (err) {
      console.error("Error fetching GST report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  // Summaries
  const totals = orders.reduce((acc, order) => ({
    taxable: acc.taxable + (order.taxable_amount || 0),
    cgst: acc.cgst + (order.cgst || 0),
    sgst: acc.sgst + (order.sgst || 0),
    igst: acc.igst + (order.igst || 0),
    grand: acc.grand + (order.total_amount || 0),
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, grand: 0 });

  const exportCSV = () => {
    const headers = ["Invoice Date", "Invoice Number", "Customer Name", "Customer GSTIN", "Taxable Value", "GST Type", "IGST", "CGST", "SGST", "Total Amount"];
    const rows = orders.map(o => [
      formatDate(o.invoice_date || o.created_at),
      o.invoice_number,
      o.customers?.name,
      o.customers?.gstin || "",
      o.taxable_amount,
      o.gst_type,
      o.igst || 0,
      o.cgst || 0,
      o.sgst || 0,
      o.total_amount
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `GST_Report_${selectedMonth}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-full mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-white rounded-lg transition-colors border border-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{t("GST Reports", "GST నివేదికలు")}</h1>
            <p className="text-gray-500 text-xs tracking-widest">{t("Tax Summary & Compliance", "పన్ను మరియు ఇతర వివరాలు")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
          <button 
            onClick={exportCSV}
            disabled={orders.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <Download className="w-4 h-4" />
            {t("Export CSV", "CSV ఎగుమతి")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
          <p className="text-xs uppercase tracking-widest">{t("Compiling Monthly Report...", "నివేదిక తయారవుతోంది...")}</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-500" /></div>
                 <h3 className="text-[10px] text-gray-400 uppercase tracking-widest">{t("Taxable Value", "పన్ను వేయదగిన మొత్తం")}</h3>
              </div>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(totals.taxable)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-purple-50 rounded-lg"><ShieldCheck className="w-5 h-5 text-purple-500" /></div>
                 <h3 className="text-[10px] text-gray-400 uppercase tracking-widest">Total CGST + SGST</h3>
              </div>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(totals.cgst + totals.sgst)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-amber-50 rounded-lg"><ShieldCheck className="w-5 h-5 text-amber-500" /></div>
                 <h3 className="text-[10px] text-gray-400 uppercase tracking-widest">Total IGST</h3>
              </div>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(totals.igst)}</p>
            </div>
            <div className="bg-primary p-6 rounded-2xl shadow-xl shadow-primary/20 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-white/10 rounded-lg"><PieChart className="w-5 h-5 text-white" /></div>
                 <h3 className="text-[10px] text-white/60 uppercase tracking-widest">{t("Grand Total", "మొత్తం చెల్లింపు")}</h3>
              </div>
              <p className="text-2xl font-black text-white">{formatCurrency(totals.grand)}</p>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center gap-2">
               <TableIcon className="w-5 h-5 text-primary" />
               <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">{t("B2B & B2C Invoices", "ఇన్వాయిస్ల వివరాలు")}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest">
                   <tr>
                     <th className="px-6 py-4">{t("Date", "తేదీ")}</th>
                     <th className="px-6 py-4">{t("Invoice #", "బిన్ నంబర్")}</th>
                     <th className="px-6 py-4">{t("Customer", "కస్టమర్")}</th>
                     <th className="px-6 py-4 text-right">{t("Taxable", "మొత్తం")}</th>
                     <th className="px-6 py-4 text-right">GST %</th>
                     <th className="px-6 py-4 text-right">CGST</th>
                     <th className="px-6 py-4 text-right">SGST</th>
                     <th className="px-6 py-4 text-right">IGST</th>
                     <th className="px-6 py-4 text-right">{t("Total", "మొత్తం")}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 text-xs">
                   {orders.map((o) => (
                     <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                       <td className="px-6 py-4 text-gray-500">{formatDate(o.invoice_date || o.created_at)}</td>
                       <td className="px-6 py-4 font-bold text-primary">{o.invoice_number || "Draft"}</td>
                       <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{o.customers?.name}</p>
                          <p className="text-[10px] text-gray-400">{o.customers?.gstin || "B2C"}</p>
                       </td>
                       <td className="px-6 py-4 text-right font-medium">{formatCurrency(o.taxable_amount || o.total_amount)}</td>
                       <td className="px-6 py-4 text-right">{o.gst_rate}%</td>
                       <td className="px-6 py-4 text-right text-gray-500">{formatCurrency(o.cgst || 0)}</td>
                       <td className="px-6 py-4 text-right text-gray-500">{formatCurrency(o.sgst || 0)}</td>
                       <td className="px-6 py-4 text-right text-gray-500">{formatCurrency(o.igst || 0)}</td>
                       <td className="px-6 py-4 text-right font-black text-gray-900">{formatCurrency(o.total_amount)}</td>
                     </tr>
                   ))}
                   {orders.length === 0 && (
                     <tr>
                       <td colSpan={9} className="px-6 py-12 text-center text-gray-400 uppercase tracking-widest font-bold">
                         {t("No GST orders found for this period", "ఈ కాలానికి GST ఆర్డర్లు లేవు")}
                       </td>
                     </tr>
                   )}
                 </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
