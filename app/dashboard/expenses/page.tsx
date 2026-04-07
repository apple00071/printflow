"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  Wallet, 
  Tag, 
  IndianRupee,
  Loader2,
  Trash2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { formatCurrency } from "@/lib/utils/format";
import { useLanguage } from "@/lib/context/LanguageContext";
import CustomSelect from "@/components/ui/CustomSelect";

interface Expense {
  id: string;
  category: string;
  amount: number;
  spent_at: string;
  description: string;
  payment_method: string;
}

const CATEGORIES = ["Raw Material", "Rent", "Electricity", "Salary", "Marketing", "Maintenance", "Other"];

export default function ExpensesPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [form, setForm] = useState({
    category: "Raw Material",
    amount: "",
    spent_at: new Date().toISOString().split('T')[0],
    description: "",
    payment_method: "CASH"
  });

  const supabase = createClient();

  async function fetchExpenses() {
    setLoading(true);
    try {
      const tenant = await getCurrentTenant(supabase);
      if (!tenant) return;

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("spent_at", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tenant = await getCurrentTenant(supabase);
      if (!tenant) return;

      const { error } = await supabase.from("expenses").insert({
        tenant_id: tenant.id,
        category: form.category,
        amount: parseFloat(form.amount),
        spent_at: new Date(form.spent_at).toISOString(),
        description: form.description,
        payment_method: form.payment_method
      });

      if (error) throw error;
      
      setIsModalOpen(false);
      setForm({
        category: "Raw Material",
        amount: "",
        spent_at: new Date().toISOString().split('T')[0],
        description: "",
        payment_method: "CASH"
      });
      fetchExpenses();
    } catch (err) {
      console.error("Error adding expense:", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm(t("Are you sure you want to delete this expense?", "మీరు ఈ ఖర్చును తొలగించాలనుకుంటున్నారా?", "क्या आप इस खर्च को हटाना चाहते हैं?"))) return;
    
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      fetchExpenses();
    } catch (err) {
      console.error("Error deleting expense:", err);
    }
  };

  const totalSpent = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("Expenses", "ఖర్చులు", "खर्चे")}</h1>
          <p className="text-sm text-gray-500">{t("Track and manage your shop operational costs", "మీ షాప్ ఖర్చులను ట్రాక్ చేయండి", "अपनी दुकान के खर्चों को ट्रैक करें")}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all font-bold shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {t("Add Expense", "ఖర్చును జోడించండి", "खर्चा जोड़ें")}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-red-50 p-3 rounded-xl text-red-600">
             <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-gray-400 tracking-wider font-mono">{t("Total Spent", "మొత్తం ఖర్చు", "कुल खर्च")}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
             <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-gray-400 tracking-wider font-mono">{t("Avg / Expense", "సగటు ఖర్చు", "औसत खर्च")}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(expenses.length ? totalSpent / expenses.length : 0)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-orange/10 p-3 rounded-xl text-orange">
             <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-gray-400 tracking-wider font-mono">{t("Total Items", "మొత్తం వస్తువులు", "कुल खर्चे")}</p>
            <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex flex-col md:flex-row gap-4 md:items-center justify-between">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder={t("Search expenses...", "ఖర్చులను వెతకండి...", "खर्च खोजें...")}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-all"
              />
           </div>
           <div className="flex items-center gap-2">
              <button className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2 text-sm font-bold">
                 <Filter className="w-4 h-4" />
                 {t("Filter", "ఫిల్టర్", "फिल्टर")}
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-mono">
                <th className="px-6 py-4">{t("Date", "తేదీ", "तारीख")}</th>
                <th className="px-6 py-4">{t("Category", "రకం", "कैटेगरी")}</th>
                <th className="px-6 py-4">{t("Description", "వివరాలు", "विवरण")}</th>
                <th className="px-6 py-4">{t("Method", "పద్ధతి", "तरीका")}</th>
                <th className="px-6 py-4 text-right">{t("Amount", "మొత్తం", "राशि")}</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4 h-16 bg-gray-50/50"></td>
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                     <p className="text-sm">{t("No expenses recorded yet", "ఖర్చులు ఏవీ లేవు", "अभी तक कोई खर्चा दर्ज नहीं किया गया है")}</p>
                  </td>
                </tr>
              ) : expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 transition-all group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900 font-medium">
                        {new Date(expense.spent_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 rounded bg-gray-100 text-[10px] font-bold text-gray-600 uppercase">
                        {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 line-clamp-1">{expense.description || "-"}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {expense.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <p className="text-sm font-bold text-red-600">-{formatCurrency(expense.amount)}</p>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                     <button onClick={() => deleteExpense(expense.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-primary text-white">
              <h2 className="text-xl font-bold">{t("Add New Expense", "కొత్త ఖర్చును జోడించండి", "नया खर्चा जोड़ें")}</h2>
              <p className="text-white/60 text-xs">{t("Enter transaction details below", "వివరాలను నమోదు చేయండి", "नीचे विवरण दर्ज करें")}</p>
            </div>
            
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("Amount", "మొత్తం", "राशि")}</label>
                    <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="number" 
                            required
                            value={form.amount}
                            onChange={e => setForm({...form, amount: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-primary transition-all font-bold"
                            placeholder="0.00"
                        />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("Date", "తేదీ", "तारीख")}</label>
                    <input 
                        type="date" 
                        required
                        value={form.spent_at}
                        onChange={e => setForm({...form, spent_at: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-primary transition-all"
                    />
                 </div>
               </div>

               <CustomSelect 
                  label={t("Category", "రకం", "कैटेगरी")}
                  options={CATEGORIES}
                  value={form.category}
                  onChange={(val) => setForm({...form, category: val})}
               />

               <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("Payment Method", "పద్ధతి", "भुगतान का तरीका")}</label>
                    <div className="flex gap-2">
                        {["CASH", "UPI", "BANK"].map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setForm({...form, payment_method: m})}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${form.payment_method === m ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
               </div>

               <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("Description", "వివరాలు", "विवरण")}</label>
                    <textarea 
                        value={form.description}
                        onChange={e => setForm({...form, description: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-primary transition-all min-h-[100px]"
                        placeholder={t("Rent for March, 10 RIMs paper, etc.", "వివరాలు ఇక్కడ నమోదు చేయండి", "उदाहरण: मार्च का किराया, कागज, आदि")}
                    />
               </div>

               <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  >
                    {t("Cancel", "రద్దు", "रद्द करें")}
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-2 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md disabled:bg-primary/60 flex items-center justify-center min-w-[120px]"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : t("Save Expense", "సేవ్ చేయండి", "सेव करें")}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
