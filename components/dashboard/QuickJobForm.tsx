"use client";

import { useState } from "react";
import { 
  User, 
  Phone, 
  IndianRupee, 
  Loader2,
  Check,
  Zap,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { searchCustomers, createOrder } from "@/lib/supabase/actions";
import { useLanguage } from "@/lib/context/LanguageContext";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export default function QuickJobForm() {
  const { t } = useLanguage();
  const { toast, showToast, dismissToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; phone: string | null }[]>([]);

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    jobType: "",
    customJobType: "",
    totalAmount: 0,
    advancePaid: 0,
    quantity: "1",
    instructions: ""
  });

  const jobTypes = [
    { id: "Business Cards", label: "Business Cards" },
    { id: "Banners", label: "Banners" },
    { id: "Wedding Cards", label: "Wedding Cards" },
    { id: "Stickers", label: "Stickers" },
    { id: "Other", label: "Other" },
  ];

  const [activeSearchField, setActiveSearchField] = useState<'phone' | 'name' | null>(null);

  const handleCustomerSearch = async (query: string, field: 'phone' | 'name') => {
    setActiveSearchField(field);
    if (query.length >= 3) {
      try {
        const results = await searchCustomers(query);
        setSuggestions(results as { id: string; name: string; phone: string | null }[]);
        setShowSuggestions(results.length > 0);
      } catch (err) {
        console.error("Search failed:", err);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (customer: { name: string; phone: string | null }) => {
    setFormData({
      ...formData,
      customerName: customer.name,
      phone: customer.phone || ""
    });
    setShowSuggestions(false);
    setActiveSearchField(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.jobType) {
      showToast(t("Basic details required", "వివరాలు అవసరం"), "error");
      return;
    }

    setLoading(true);
    try {
      await createOrder({
        ...formData,
        jobType: formData.jobType === "Other" ? formData.customJobType || "Other" : formData.jobType,
        deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });
      showToast(t("Production started", "ప్రొడక్షన్ మొదలైంది"), "success");
      setFormData({
        customerName: "",
        phone: "",
        jobType: "",
        customJobType: "",
        totalAmount: 0,
        advancePaid: 0,
        quantity: "1",
        instructions: ""
      });
      window.location.reload();
    } catch (err) {
      showToast("Submission failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group/form">
      {/* Decorative Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-slate-200 to-slate-100 rounded-[32px] blur opacity-25 group-hover/form:opacity-50 transition duration-1000"></div>
      
      <div className="relative bg-white/90 backdrop-blur-2xl rounded-[28px] border border-slate-200/60 p-8 shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-visible">
        {toast && <Toast toast={toast} onDismiss={dismissToast} />}
        
        <div className="flex items-center gap-4 mb-10">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
             <Zap className="w-5 h-5 fill-white" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-base font-black text-slate-900 tracking-tight uppercase italic leading-none">{t("Rapid Ingest", "త్వరిత చేరిక")}</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{t("Capturing Production Data", "పని నమోదు")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-4">
              {/* Phone Field */}
              <div className="relative">
                <div className="relative group/input">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/input:text-slate-900 transition-colors" />
                  <input 
                    type="tel"
                    required
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({...formData, phone: e.target.value});
                      handleCustomerSearch(e.target.value, 'phone');
                    }}
                    className="w-full pl-12 pr-4 h-14 bg-slate-50/50 border border-slate-100 rounded-2xl text-[13px] font-bold focus:bg-white focus:ring-1 focus:ring-slate-900/10 focus:border-slate-900/20 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>

                {showSuggestions && activeSearchField === 'phone' && suggestions.length > 0 && (
                  <div className="absolute z-[100] left-0 right-0 top-full mt-2 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    {suggestions.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="w-full text-left px-5 py-4 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-xs font-black uppercase tracking-tight">{customer.name}</div>
                          <div className="text-[10px] opacity-60 font-medium tracking-widest">{customer.phone}</div>
                        </div>
                        <Check className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name Field */}
              <div className="relative">
                <div className="relative group/input">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/input:text-slate-900 transition-colors" />
                  <input 
                    type="text"
                    required
                    placeholder="Customer Name"
                    value={formData.customerName}
                    onChange={(e) => {
                      setFormData({...formData, customerName: e.target.value});
                      handleCustomerSearch(e.target.value, 'name');
                    }}
                    className="w-full pl-12 pr-4 h-14 bg-slate-50/50 border border-slate-100 rounded-2xl text-[13px] font-bold focus:bg-white focus:ring-1 focus:ring-slate-900/10 focus:border-slate-900/20 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Product Chips */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("Product Stream", "ఉత్పత్తి")}</p>
                 <Sparkles className="w-3 h-3 text-slate-200" />
              </div>
              <div className="flex flex-wrap gap-2">
                {jobTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, jobType: type.id })}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
                      formData.jobType === type.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200"
                        : "bg-white text-slate-400 border-slate-100 hover:border-slate-900/10 hover:text-slate-600"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {formData.jobType === "Other" && (
                <input 
                  type="text"
                  required
                  placeholder="Specific product name..."
                  value={formData.customJobType}
                  onChange={(e) => setFormData({...formData, customJobType: e.target.value})}
                  className="w-full h-12 px-5 bg-slate-50 border border-slate-900/10 rounded-xl text-xs font-bold focus:bg-white focus:ring-1 focus:ring-slate-900/20 outline-none transition-all placeholder:font-medium animate-in fade-in duration-300"
                  autoFocus
                />
              )}
            </div>

            {/* Financials */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("Total", "మొత్తం")}</p>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input 
                    type="number"
                    value={formData.totalAmount || ""}
                    onChange={(e) => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})}
                    className="w-full pl-10 pr-4 h-12 bg-slate-50/50 border border-slate-100 rounded-xl text-xs font-black italic focus:bg-white outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("Advance", "అడ్వాన్స్")}</p>
                <input 
                  type="number"
                  value={formData.advancePaid || ""}
                  onChange={(e) => setFormData({...formData, advancePaid: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 h-12 bg-slate-50/50 border border-slate-100 rounded-xl text-xs font-black italic text-green-600 focus:bg-white outline-none"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="group relative w-full h-16 bg-slate-900 text-white rounded-[20px] font-black text-[11px] uppercase tracking-[0.3em] overflow-hidden transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center justify-center gap-3">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {t("Execute Order", "ఆర్డర్ సృష్టించు")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>
        </form>
      </div>

      {showSuggestions && (
        <div 
          className="fixed inset-0 z-[90] bg-transparent" 
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}
