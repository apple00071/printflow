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
  ArrowRight,
  LayoutGrid,
  CreditCard,
  Plus,
  Maximize,
  Hash,
  Layers
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
    size: "",
    isDoubleSided: false,
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
        instructions: `${formData.isDoubleSided ? "Back-to-Back (Double Sided)" : "Single Sided"}. Size: ${formData.size || 'Standard'}. ${formData.instructions}`,
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
        size: "",
        isDoubleSided: false,
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
      <div className="relative bg-white rounded-[24px] border border-slate-200/60 p-5 flex flex-col">
        {toast && <Toast toast={toast} onDismiss={dismissToast} />}
        
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center text-white">
               <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#1e3a5f] tracking-tight uppercase leading-none">{t("Rapid Ingest", "త్వరిత చేరిక")}</h3>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-0.5">{t("Production Entry", "పని నమోదు")}</p>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Info (Row 1) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative group/input">
              <input 
                type="tel"
                required
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({...formData, phone: e.target.value});
                  handleCustomerSearch(e.target.value, 'phone');
                }}
                className="w-full px-3.5 h-10 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-[#1e3a5f] focus:bg-white focus:border-[#1e3a5f]/20 outline-none transition-all placeholder:text-slate-300"
              />
              {showSuggestions && activeSearchField === 'phone' && suggestions.length > 0 && (
                <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl">
                  {suggestions.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="w-full text-left px-4 py-3 hover:bg-[#1e3a5f] hover:text-white transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-tight">{customer.name}</div>
                        <div className="text-[9px] opacity-60 font-medium">{customer.phone}</div>
                      </div>
                      <Check className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative group/input">
              <input 
                type="text"
                required
                placeholder="Name"
                value={formData.customerName}
                onChange={(e) => {
                  setFormData({...formData, customerName: e.target.value});
                  handleCustomerSearch(e.target.value, 'name');
                }}
                className="w-full px-3.5 h-10 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-[#1e3a5f] focus:bg-white focus:border-[#1e3a5f]/20 outline-none transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Production Specs (Row 2 - New) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="relative group/input">
              <div className="absolute left-2 top-1/2 -translate-y-1/2">
                <Hash className="w-3 h-3 text-slate-300" />
              </div>
              <input 
                type="number"
                placeholder="Qty"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="w-full pl-6 pr-2 h-9 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-[#1e3a5f] focus:bg-white focus:border-[#1e3a5f]/20 outline-none transition-all"
              />
            </div>
            <div className="relative group/input">
              <div className="absolute left-2 top-1/2 -translate-y-1/2">
                <Maximize className="w-3 h-3 text-slate-300" />
              </div>
              <input 
                type="text"
                placeholder="Size"
                value={formData.size}
                onChange={(e) => setFormData({...formData, size: e.target.value})}
                className="w-full pl-6 pr-2 h-9 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-[#1e3a5f] focus:bg-white focus:border-[#1e3a5f]/20 outline-none transition-all"
              />
            </div>
            <div className="flex bg-slate-50 border border-slate-100 rounded-lg p-0.5">
               <button 
                  type="button"
                  onClick={() => setFormData({...formData, isDoubleSided: false})}
                  className={cn(
                    "flex-1 text-[8px] font-bold uppercase rounded-md transition-all",
                    !formData.isDoubleSided ? "bg-white text-[#1e3a5f] shadow-sm" : "text-slate-400"
                  )}
               >
                 Single
               </button>
               <button 
                  type="button"
                  onClick={() => setFormData({...formData, isDoubleSided: true})}
                  className={cn(
                    "flex-1 text-[8px] font-bold uppercase rounded-md transition-all",
                    formData.isDoubleSided ? "bg-[#1e3a5f] text-white shadow-sm" : "text-slate-400"
                  )}
               >
                 B&B
               </button>
            </div>
          </div>

          {/* Compact Product Stream */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest px-1">
              <LayoutGrid className="w-2.5 h-2.5" />
              {t("Product Stream", "ఉత్పత్తి")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {jobTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, jobType: type.id })}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all border",
                    formData.jobType === type.id
                      ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                      : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Harmonious Financial Bar */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">{t("Total", "మొత్తం")}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-[#1e3a5f]">₹</span>
                  <input 
                    type="number"
                    value={formData.totalAmount || ""}
                    onChange={(e) => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})}
                    className="w-full bg-transparent text-xs font-bold text-[#1e3a5f] outline-none placeholder:text-slate-200"
                    placeholder="0"
                  />
                </div>
              </div>
              <CreditCard className="w-2.5 h-2.5 text-slate-300" />
            </div>
            <div className="bg-green-50/30 border border-green-100 rounded-xl px-3 py-2 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[7px] font-bold text-green-600/50 uppercase tracking-tight">{t("Advance", "అడ్వాన్స్")}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-green-600">₹</span>
                  <input 
                    type="number"
                    value={formData.advancePaid || ""}
                    onChange={(e) => setFormData({...formData, advancePaid: parseFloat(e.target.value) || 0})}
                    className="w-full bg-transparent text-xs font-bold text-green-600 outline-none placeholder:text-green-100"
                    placeholder="0"
                  />
                </div>
              </div>
              <Plus className="w-2.5 h-2.5 text-green-200" />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="group relative w-full h-11 overflow-hidden rounded-xl active:scale-95 transition-all disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-[#f97316] hover:bg-[#ea580c] transition-colors"></div>
            <div className="relative flex items-center justify-center gap-2 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <span className="font-bold text-[10px] uppercase tracking-[0.2em] ml-2">
                    {t("Execute Order", "ఆర్డర్ సృష్టించు")}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}
