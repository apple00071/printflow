"use client";

import { useState } from "react";
import { 
  User, 
  Phone, 
  ClipboardList, 
  IndianRupee, 
  Search,
  Plus,
  Loader2,
  Check
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
    { id: "Business Cards", label: t("Business Cards", "విజిటింగ్ కార్డ్స్") },
    { id: "Banners", label: t("Banners", "బ్యానర్లు") },
    { id: "Letterheads", label: t("Letterheads", "లెటర్ హెడ్స్") },
    { id: "Wedding Cards", label: t("Wedding Cards", "శుభలేఖలు") },
    { id: "Stickers", label: t("Stickers", "స్టిక్కర్లు") },
    { id: "Other", label: t("Other", "ఇతర పనులు") },
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
      showToast(t("Please fill in basic details", "దయచేసి కనీస వివరాలు నింపండి"), "error");
      return;
    }

    setLoading(true);
    try {
      await createOrder({
        ...formData,
        jobType: formData.jobType === "Other" ? formData.customJobType || "Other" : formData.jobType,
        deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Default tomorrow
      });
      showToast(t("Job added successfully", "పని విజయవంతంగా జోడించబడింది"), "success");
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
      // Optionally trigger a refresh of the dashboard data
      window.location.reload();
    } catch (err) {
      showToast(t("Failed to add job", "పని జోడించడం విఫలమైంది"), "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-visible">
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
      
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">{t("Quick Add Job", "త్వరిత పని చేరిక", "त्वरित कार्य जोड़ें")}</h3>
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-widest">{t("Capture the run first", "ముందుగా పనిని నమోదు చేయండి", "पहले कार्य कैप्चर करें")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Search & Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phone Field */}
          <div className="relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">{t("Phone Number", "ఫోన్ నంబర్", "फ़ोन नंबर")}</label>
            <div className="relative group">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-primary transition-colors" />
              <input 
                type="tel"
                required
                placeholder={t("e.g. 9876543210", "ఉదా: 9876543210", "उदा: 9876543210")}
                value={formData.phone}
                onChange={(e) => {
                  setFormData({...formData, phone: e.target.value});
                  handleCustomerSearch(e.target.value, 'phone');
                }}
                onFocus={() => {
                  if (formData.phone.length >= 3) {
                    setShowSuggestions(true);
                    setActiveSearchField('phone');
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold"
              />
            </div>

            {showSuggestions && activeSearchField === 'phone' && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2 bg-gray-50/50 border-b border-gray-100 text-[9px] text-gray-400 uppercase font-bold tracking-widest px-4">{t("Recent Customers", "ఇటీవలి కస్టమర్లు")}</div>
                {suggestions.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => selectCustomer(customer)}
                    className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-bold text-gray-900 group-hover:text-primary">{customer.name}</div>
                      <div className="text-[10px] text-gray-400">{customer.phone}</div>
                    </div>
                    <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Name Field */}
          <div className="relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">{t("Customer Name", "కస్టమర్ పేరు", "ग्राहक का नाम")}</label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                required
                placeholder={t("Enter name...", "పేరు నమోదు చేయండి...", "नाम दर्ज करें...")}
                value={formData.customerName}
                onChange={(e) => {
                  setFormData({...formData, customerName: e.target.value});
                  handleCustomerSearch(e.target.value, 'name');
                }}
                onFocus={() => {
                  if (formData.customerName.length >= 3) {
                    setShowSuggestions(true);
                    setActiveSearchField('name');
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold"
              />
            </div>

            {showSuggestions && activeSearchField === 'name' && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2 bg-gray-50/50 border-b border-gray-100 text-[9px] text-gray-400 uppercase font-bold tracking-widest px-4">{t("Recent Customers", "ఇటీవలి కస్టమర్లు")}</div>
                {suggestions.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => selectCustomer(customer)}
                    className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-bold text-gray-900 group-hover:text-primary">{customer.name}</div>
                      <div className="text-[10px] text-gray-400">{customer.phone}</div>
                    </div>
                    <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Selection (Chips) */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{t("Select Product", "ఉత్పత్తిని ఎంచుకోండి", "उत्पाद चुनें")}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {jobTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData({ ...formData, jobType: type.id })}
                className={cn(
                  "px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-center",
                  formData.jobType === type.id
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-white hover:border-gray-200"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Custom Product Input if 'Other' is selected */}
          {formData.jobType === "Other" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <input 
                type="text"
                required
                placeholder={t("Enter product name...", "ఉత్పత్తి పేరు నమోదు చేయండి...", "उत्पाद का नाम दर्ज करें...")}
                value={formData.customJobType}
                onChange={(e) => setFormData({...formData, customJobType: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-primary/20 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold placeholder:font-normal"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Amount Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">{t("Amount (₹)", "మొత్తం (₹)", "राशि (₹)")}</label>
            <div className="relative group">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-primary transition-colors" />
              <input 
                type="number"
                placeholder="0"
                value={formData.totalAmount || ""}
                onChange={(e) => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">{t("Advance (₹)", "అడ్వాన్స్ (₹)", "अग्रिम (₹)")}</label>
            <input 
              type="number"
              placeholder="0"
              value={formData.advancePaid || ""}
              onChange={(e) => setFormData({...formData, advancePaid: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-green-600"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            t("Create Job", "పనిని సృష్టించు", "कार्य बनाएँ")
          )}
        </button>
      </form>

      {/* Overlay to close suggestions */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}
