"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  ArrowUpRight,
  Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { useLanguage } from "@/lib/context/LanguageContext";
import CustomSelect from "@/components/ui/CustomSelect";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_limit: number;
  last_restocked_at: string | null;
}

export default function InventoryPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    quantity: "",
    unit: "Sheets",
    low_stock_limit: "10"
  });

  const supabase = createClient();

  async function fetchInventory() {
    setLoading(true);
    try {
      const tenant = await getCurrentTenant(supabase);
      if (!tenant) return;

      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tenant = await getCurrentTenant(supabase);
      if (!tenant) return;

      const { error } = await supabase.from("inventory").insert({
        tenant_id: tenant.id,
        name: form.name,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        low_stock_limit: parseFloat(form.low_stock_limit)
      });

      if (error) throw error;
      
      setIsModalOpen(false);
      setForm({ name: "", quantity: "", unit: "Sheets", low_stock_limit: "10" });
      fetchInventory();
    } catch (err) {
      console.error("Error adding inventory:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateStock = async (id: string, amount: number) => {
      const item = items.find(i => i.id === id);
      if(!item) return;

      try {
          const { error } = await supabase
            .from("inventory")
            .update({ 
                quantity: item.quantity + amount,
                last_restocked_at: amount > 0 ? new Date().toISOString() : item.last_restocked_at 
            })
            .eq("id", id);
          
          if (error) throw error;
          fetchInventory();
      } catch (err) {
          console.error("Error updating stock:", err);
      }
  };

  const lowStockItems = items.filter(i => i.quantity <= i.low_stock_limit);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("Inventory", "ఇన్వెంటరీ", "इन्वेंटरी")}</h1>
          <p className="text-sm text-gray-500">{t("Track your paper, ink and other stock levels", "మీ స్టాక్ వివరాలను మేనేజ్ చేయండి", "अपना स्टॉक मैनेज करें")}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          {t("Add New Item", "కొత్త వస్తువును జోడించండి", "नई सामग्री जोड़ें")}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className={`p-3 w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${lowStockItems.length > 0 ? 'bg-orange/10 text-orange' : 'bg-green-100 text-green-600'}`}>
                <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">{t("Low Stock Alerts", "తక్కువ స్టాక్ హెచ్చరికలు", "स्टॉक कम होने की चेतावनी")}</p>
            <p className="text-2xl font-bold">{lowStockItems.length}</p>
         </div>
         <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="p-3 w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-blue-50 text-blue-600">
                <Package className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">{t("Total Items", "మొత్తం వస్తువులు", "మొత్తం సాహిత్యం")}</p>
            <p className="text-2xl font-bold">{items.length}</p>
         </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder={t("Search inventory...", "వెతకండి...", "स्टॉक खोजें...")}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-all shadow-inner"
                />
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-mono">
                <th className="px-6 py-4">{t("Item Name", "పేరు", "नाम")}</th>
                <th className="px-6 py-4">{t("Stock Level", "స్టాక్ స్థాయి", "स्टॉक लेवल")}</th>
                <th className="px-6 py-4">{t("Unit", "యూనిట్", "यूनिट")}</th>
                <th className="px-6 py-4">{t("Min Limit", "కనిష్ట పరిమితి", "न्यूनतम सीमा")}</th>
                <th className="px-6 py-4 text-right">{t("Quick Actions", "చర్యలు", "कार्रवाई")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                            <td colSpan={5} className="px-6 py-8 bg-gray-50/50"></td>
                        </tr>
                    ))
                ) : items.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                            {t("No inventory items found", "ఇన్వెంటరీ ఏమీ లేదు", "कोई सामग्री नहीं मिली")}
                        </td>
                    </tr>
                ) : items.map((item) => {
                    const isLow = item.quantity <= item.low_stock_limit;
                    const stockPercentage = Math.min((item.quantity / (item.low_stock_limit * 3)) * 100, 100);
                    
                    return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-all group">
                            <td className="px-6 py-4">
                                <div>
                                    <p className={`text-sm font-bold ${isLow ? 'text-orange' : 'text-gray-900'}`}>{item.name}</p>
                                    {isLow && (
                                        <span className="text-[9px] font-bold text-orange uppercase flex items-center gap-1 mt-0.5">
                                            <AlertTriangle className="w-2.5 h-2.5" /> {t("Refill Needed", "స్టాక్ నింపాలి", "स्टॉक भरें")}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="space-y-1.5 min-w-[120px]">
                                    <div className="flex items-center justify-between text-[10px] font-bold">
                                        <span className={isLow ? 'text-orange' : 'text-primary'}>{item.quantity}</span>
                                        <span className="text-gray-300">/ {item.unit}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-500 rounded-full ${isLow ? 'bg-orange' : 'bg-primary'}`}
                                            style={{ width: `${stockPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{item.unit}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-400">{item.low_stock_limit}</td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => updateStock(item.id, 10)}
                                        className="p-1 px-3 text-[10px] font-bold bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all flex items-center gap-1"
                                        title="+10 Restock"
                                    >
                                        <ArrowUpRight className="w-3 h-3" /> +10
                                    </button>
                                    <button 
                                        onClick={() => updateStock(item.id, -1)}
                                        className="p-1 px-3 text-[10px] font-bold bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                                        title="-1 Usage"
                                    >
                                        -1
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in duration-200">
             <div className="p-6 bg-primary text-white">
                <h2 className="text-xl font-bold">{t("New Stock Item", "కొత్త స్టాక్ ఐటమ్", "नया स्टॉक आइटम")}</h2>
             </div>
             
             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Item Name", "పేరు", "नाम")}</label>
                    <input 
                        type="text" 
                        required
                        placeholder="e.g. 12x18 Glossy Paper"
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-primary transition-all font-bold"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Initial Quantity", "మొత్తం సంఖ్య", "प्रारंभिक मात्रा")}</label>
                        <input 
                            type="number" 
                            required
                            value={form.quantity}
                            onChange={e => setForm({...form, quantity: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-primary transition-all font-bold"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Low Stock Limit", "కనీస పరిమితి", "कम स्टॉक सीमा")}</label>
                        <input 
                            type="number" 
                            required
                            value={form.low_stock_limit}
                            onChange={e => setForm({...form, low_stock_limit: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-primary transition-all font-bold"
                        />
                    </div>
                </div>

                <CustomSelect 
                    label={t("Unit Type", "యూనిట్ రకం", "इकाई प्रकार")}
                    options={["Sheets", "RIMs", "Bottles", "Boxes", "Units"]}
                    value={form.unit}
                    onChange={(val) => setForm({...form, unit: val})}
                />

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-400 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
                    <button type="submit" disabled={saving} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Item"}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
