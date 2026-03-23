"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Search, 
  Plus, 
  Filter, 
  ChevronRight,
  Loader2,
  Clock
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getQuotations } from "@/lib/supabase/actions";
import { useLanguage } from "@/lib/context/LanguageContext";
import { cn } from "@/lib/utils";

export default function QuotationsPage() {
  const { t } = useLanguage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    async function fetchQuotations() {
      try {
        const data = await getQuotations();
        setQuotations(data);
      } catch (error) {
        console.error("Error fetching quotations:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchQuotations();
  }, []);

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = 
      q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.job_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "ALL" || q.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-600';
      case 'SENT': return 'bg-blue-100 text-blue-600';
      case 'ACCEPTED': return 'bg-green-100 text-green-600';
      case 'EXPIRED': return 'bg-red-100 text-red-600';
      case 'CONVERTED': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-gray-400">
       <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
       <p className="text-sm font-normal uppercase tracking-widest">{t("Loading Quotations...", "కొటేషన్లు లోడ్ అవుతున్నాయి...")}</p>
    </div>
  );

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-gray-900">{t("Quotations", "కొటేషన్లు")}</h1>
          <p className="text-gray-500 text-sm">{t("Manage and track your price estimates", "మీ ధర అంచనాలను నిర్వహించండి")}</p>
        </div>
        <Link 
          href="/dashboard/quotations/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm"
        >
          <Plus className="w-4 h-4" />
          {t("New Quotation", "కొత్త కొటేషన్")}
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("Search by number, customer or job...", "నెంబర్, కస్టమర్ లేదా పనితో వెతకండి...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
          >
            <option value="ALL">{t("All Statuses", "అన్ని స్థితిగతులు")}</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CONVERTED">CONVERTED</option>
          </select>
        </div>
      </div>

      {/* Table/List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-normal">{t("Quotation #", "నెంబర్")}</th>
                <th className="px-6 py-4 font-normal">{t("Customer", "కస్టమర్")}</th>
                <th className="px-6 py-4 font-normal">{t("Job Type", "పని రకం")}</th>
                <th className="px-6 py-4 font-normal text-[10px]">{t("Size", "సైజు")}</th>
                <th className="px-6 py-4 font-normal">{t("Amount", "మొత్తం")}</th>
                <th className="px-6 py-4 font-normal">{t("Status", "స్థితి")}</th>
                <th className="px-6 py-4 font-normal">{t("Date", "తేదీ")}</th>
                <th className="px-6 py-4 font-normal text-right">{t("Actions", "చర్యలు")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredQuotations.length > 0 ? filteredQuotations.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{q.quotation_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900">{q.customers?.name}</span>
                      <span className="text-[10px] text-gray-400">{q.customers?.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{q.job_type}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">{q.size || t("N/A", "లేదు")}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(q.total_with_gst)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
                      getStatusColor(q.status)
                    )}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDate(q.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/dashboard/quotations/${q.id}`}
                      className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 inline-block"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <FileText className="w-12 h-12 opacity-20" />
                      <p className="text-sm font-normal">{t("No quotations found", "కొటేషన్లు ఏమీ లేవు")}</p>
                      <Link href="/dashboard/quotations/new" className="text-primary hover:underline text-xs">
                        {t("Create your first quotation", "మొదటి కొటేషన్‌ను సృష్టించండి")}
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
