"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  User, 
  Phone, 
  Hash, 
  FileText, 
  Upload,
  IndianRupee,
  Receipt,
  X,
  File as FileIcon
} from "lucide-react";
import { useRef } from "react";
import Link from "next/link";
import { createOrder, searchCustomers } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { calculateGST } from "@/lib/gst";
import { useLanguage } from "@/lib/context/LanguageContext";
import { JOB_TYPE_DEFAULTS, DEFAULT_GST_RATES } from "@/lib/config";
import CustomSelect from "@/components/ui/CustomSelect";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { parseOrderText, ParsedJobDetails } from "@/lib/parser";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewOrderPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const jobTypes = [
    { id: "Business Cards", label: t("Business Cards", "విజిటింగ్ కార్డ్స్") },
    { id: "Banners", label: t("Banners", "బ్యానర్లు") },
    { id: "Letterheads", label: t("Letterheads", "లెటర్ హెడ్స్") },
    { id: "Wedding Cards", label: t("Wedding Cards", "శుభలేఖలు") },
    { id: "Pamphlets", label: t("Pamphlets", "పాంప్లెట్స్") },
    { id: "Stickers", label: t("Stickers", "స్టిక్కర్లు") },
    { id: "Flex Prints", label: t("Flex Prints", "ఫ్లెక్స్ ప్రింట్లు") },
    { id: "Other", label: t("Other", "ఇతర పనులు") },
  ];

  // Form State
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    jobType: "",
    customJobType: "",
    quantity: "1",
    paperType: "",
    size: "",
    instructions: "",
    deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    totalAmount: 0,
    advancePaid: 0,
    // GST Fields
    applyGST: false,
    gstRate: 0,
    isInterState: false,
    gstin: "",
    hsnCode: "",
    file_url: "",
    quotation_id: "",
    printingSide: "Single Side",
    lamination: "None",
    printingDate: "",
    inventory_id: "",
    material_units_per_order: 1,
  });

  const [detectedSpecs, setDetectedSpecs] = useState<ParsedJobDetails>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { toast, showToast, dismissToast } = useToast();

  const [inventoryItems, setInventoryItems] = useState<{ id: string; name: string; unit: string; quantity: number }[]>([]);
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<'phone' | 'name' | null>(null);
  const [, setSearchQuery] = useState("");

  const handleCustomerSearch = async (query: string, field: 'phone' | 'name') => {
    setSearchQuery(query);
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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("quotation_id")) {
      setFormData(prev => ({
        ...prev,
        quotation_id: searchParams.get("quotation_id") || "",
        customerName: searchParams.get("customerName") || "",
        phone: searchParams.get("phone") || "",
        jobType: searchParams.get("jobType") || "Business Cards",
        quantity: searchParams.get("quantity") || "1",
        paperType: searchParams.get("paperType") || "",
        size: searchParams.get("size") || "",
        instructions: searchParams.get("instructions") || "",
        totalAmount: parseFloat(searchParams.get("totalAmount") || "0"),
        printingSide: searchParams.get("printingSide") || "Single Side",
        lamination: searchParams.get("lamination") || "None",
        printingDate: searchParams.get("printingDate") || "",
      }));
    }
  }, []);
  
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [gstRates, setGstRates] = useState<{ id: string; label: string; rate: number; is_default: boolean }[]>([]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const currentTenant = await getCurrentTenant(supabase);
      if (currentTenant) {
        const { data: rates } = await supabase
          .from('gst_rates')
          .select('*')
          .eq('tenant_id', currentTenant.id);
        setGstRates(rates || []);
        
        const defaultRate = rates?.find(r => r.is_default);
        if (defaultRate) {
          setFormData(prev => ({ ...prev, gstRate: defaultRate.rate }));
        }

        const { data: inv } = await supabase
          .from('inventory')
          .select('id, name, unit, quantity')
          .eq('tenant_id', currentTenant.id)
          .order('name');
        setInventoryItems(inv || []);
      }
    }
    init();
  }, []);
  
  const gstOptions = [
    { value: "0", label: "0% (Nil)" },
    ...gstRates.map((rate) => ({ value: rate.rate.toString(), label: `${rate.label} (${rate.rate}%)` })),
    ...DEFAULT_GST_RATES.filter(std => !gstRates.some(r => r.rate === std.rate)).map((std) => ({ value: std.rate.toString(), label: `${std.label} (${std.rate}%)` }))
  ];
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setFileName(file.name);
    
    try {
      const supabase = createClient();
      const tenant = await getCurrentTenant(supabase);
      if (!tenant) throw new Error("Tenant not found");

      const fileExt = file.name.split('.').pop();
      const filePath = `${tenant.id}/orders/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('printflow-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('printflow-files')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, file_url: publicUrl }));
      showToast(t("File uploaded successfully", "ఫైల్ విజయవంతంగా అప్‌లోడ్ చేయబడింది"), "success");
    } catch {
      showToast(t("Failed to upload file. Please try again.", "ఫైల్ అప్‌లోడ్ విఫలమైంది. మళ్ళీ ప్రయత్నికండి."), "error");
      setFileName("");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.phone.trim()) {
      setFormError(t("Phone number is required.", "ఫోన్ నంబర్ అవసరం."));
      return;
    }
    if (!formData.customerName.trim()) {
      setFormError(t("Customer name is required.", "కస్టమర్ పేరు అవసరం."));
      return;
    }
    if (!formData.jobType && !formData.instructions) {
      setFormError(t("Please enter a product or job description.", "దయచేసి ఒక ఉత్పత్తి లేదా పని వివరణ నమోదు చేయండి."));
      return;
    }

    setLoading(true);

    let submitData = { 
      ...formData,
      jobType: formData.jobType === "Other" ? formData.customJobType || "Other" : formData.jobType
    };

    if (formData.instructions) {
      const parsed = parseOrderText(formData.instructions);
      submitData = {
        ...submitData,
        jobType: submitData.jobType !== "Other" ? submitData.jobType : (parsed.jobType || "Other"),
        quantity: parsed.quantity || submitData.quantity,
        paperType: parsed.paperType || submitData.paperType,
        size: parsed.size || submitData.size,
        printingSide: parsed.printingSide || submitData.printingSide,
        lamination: parsed.lamination || submitData.lamination,
      };
    }

    try {
      await createOrder(submitData);
      router.push("/dashboard/orders");
    } catch {
      setFormError(t("Failed to create order. Please try again.", "ఆర్డర్ సృష్టించడం విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.instructions) {
      const parsed = parseOrderText(formData.instructions);
      setDetectedSpecs(parsed);
    } else {
      setDetectedSpecs({});
    }
  }, [formData.instructions]);

  const gstCalc = calculateGST(formData.totalAmount, formData.gstRate, formData.isInterState);

  return (
    <div className="max-w-full mx-auto space-y-6">
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}

      <div className="flex items-center gap-4">
        <Link href="/dashboard/orders" className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 group min-w-[40px] min-h-[40px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-primary" />
        </Link>
        <div>
          <h1 className="text-2xl text-gray-900 font-bold">{t("New Order", "కొత్త ఆర్డర్")}</h1>
          <p className="text-gray-500 text-sm">{t("Create a new printing job for a customer", "కస్టమర్ కోసం కొత్త ప్రింటింగ్ పనిని సృష్టించండి")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-24">
        {formError && (
          <div role="alert" className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        
        {/* Customer Information Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-normal text-gray-900 uppercase tracking-wide text-sm">{t("Customer Details", "కస్టమర్ వివరాలు")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="text-xs text-gray-500 uppercase">{t("Phone Number", "ఫోన్ నంబర్")} <span className="text-red-500" aria-hidden="true">*</span></label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  required
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
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none font-bold"
                  placeholder={t("e.g. 9876543210", "ఉదా: 9876543210")}
                />
              </div>

              {showSuggestions && activeSearchField === 'phone' && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-2 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-2">
                    <Search className="w-3 h-3" />
                    {t("Existing Customers", "ఉన్న కస్టమర్లు")}
                  </div>
                  {suggestions.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors border-b border-gray-50 last:border-0 group"
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-gray-900 group-hover:text-primary transition-colors">{customer.name}</div>
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{customer.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1 relative">
              <label className="text-xs text-gray-500 uppercase">{t("Customer Name", "పేరు")} <span className="text-red-500" aria-hidden="true">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
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
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none font-bold"
                  placeholder={t("Enter full name", "పూర్తి పేరు నమోదు చేయండి")}
                />
              </div>

              {showSuggestions && activeSearchField === 'name' && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-2 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-2">
                    <Search className="w-3 h-3" />
                    {t("Existing Customers", "ఉన్న కస్టమర్లు")}
                  </div>
                  {suggestions.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors border-b border-gray-50 last:border-0 group"
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-gray-900 group-hover:text-primary transition-colors">{customer.name}</div>
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{customer.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {showSuggestions && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowSuggestions(false)} 
          />
        )}

        {/* Job Details Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-normal text-gray-900 uppercase tracking-wide text-sm">{t("Order Details", "ఆర్డర్ వివరాలు")}</h2>
          </div>

          {/* Product Selection (Chips) */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{t("Select Product", "ఉత్పత్తిని ఎంచుకోండి", "उत्पाद चुनें")}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {jobTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, jobType: type.id })}
                  className={cn(
                    "px-3 py-3 rounded-xl text-xs font-bold transition-all border text-center",
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
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 max-w-md">
                <input 
                  type="text"
                  required
                  placeholder={t("Enter product name...", "ఉత్పత్తి పేరు నమోదు చేయండి...", "उत्पाद का नाम दर्ज करें...")}
                  value={formData.customJobType}
                  onChange={(e) => setFormData({...formData, customJobType: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-primary/20 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold placeholder:font-normal"
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 uppercase">{t("Job Particulars & Instructions", "పని వివరాలు")}</label>
              <textarea
                rows={3}
                required
                value={formData.instructions}
                onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/10 outline-none resize-none font-medium"
                placeholder={t("e.g. 500 Cards, A4 size, 300GSM Matte...", "ఉదా: 500 విజిటింగ్ కార్డ్స్, A4 సైజు...")}
              />
              {detectedSpecs.jobType && (
                <div className="flex flex-wrap gap-2 mt-2">
                   {detectedSpecs.quantity && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded uppercase">Qty: {detectedSpecs.quantity}</span>}
                   {detectedSpecs.size && <span className="px-2 py-0.5 bg-orange/10 text-orange text-[10px] font-bold rounded uppercase">{detectedSpecs.size}</span>}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 uppercase">{t("Delivery Date", "డెలివరీ తేదీ")}</label>
                <CustomDatePicker
                  value={formData.deliveryDate}
                  onChange={(value) => setFormData({ ...formData, deliveryDate: value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 uppercase">{t("Design File", "ఫైల్")}</label>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.zip,.rar" />
                {!formData.file_url ? (
                  <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-200 rounded-xl text-xs text-gray-600 transition-all">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <><Upload className="w-4 h-4" />{t("Upload File", "ఫైల్ అప్‌లోడ్")}</>}
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
                    <div className="flex items-center gap-2 truncate"><FileIcon className="w-4 h-4 flex-shrink-0" /><span className="truncate">{fileName || t("File Uploaded", "ఫైల్ అప్‌లోడ్ చేయబడింది")}</span></div>
                    <button type="button" onClick={() => {setFormData(prev => ({ ...prev, file_url: "" })); setFileName("");}} className="p-1 hover:bg-green-100 rounded-full transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* GST Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <h2 className="font-normal text-gray-900 uppercase tracking-wide text-sm">{t("GST Configuration", "GST వివరాలు")}</h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 uppercase">{t("Apply GST", "GST వర్తింపజేయి")}</label>
              <input 
                type="checkbox" 
                checked={formData.applyGST}
                onChange={(e) => setFormData({...formData, applyGST: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>
          </div>

          {formData.applyGST && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 uppercase">{t("GST Rate", "GST శాతం")}</label>
                <CustomSelect
                  options={gstOptions}
                  value={formData.gstRate.toString()}
                  onChange={(value) => setFormData({...formData, gstRate: Number(value)})}
                />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input 
                  type="checkbox" 
                  id="interstate"
                  checked={formData.isInterState}
                  onChange={(e) => setFormData({...formData, isInterState: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="interstate" className="text-sm text-gray-700">{t("Inter-state Supply (IGST)", "అంతరాష్ట్ర సరఫరా (IGST)")}</label>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 uppercase">HSN Code</label>
                <input
                  type="text"
                  value={formData.hsnCode}
                  onChange={(e) => setFormData({...formData, hsnCode: e.target.value})}
                  placeholder="e.g. 4911"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          )}
        </section>

        {/* Pricing Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
            <IndianRupee className="w-5 h-5 text-primary" />
            <h2 className="text-gray-900 uppercase tracking-wide text-sm">{t("Pricing & Payment", "ధర మరియు చెల్లింపు")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 uppercase">{formData.applyGST ? t("Taxable Amount", "పన్ను విధించదగిన మొత్తం") : t("Total Amount", "మొత్తం ధర")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input
                  type="number"
                  required
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})}
                  className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            {formData.applyGST && (
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-2">
                <div className="flex justify-between text-[10px] uppercase text-gray-500">
                  <span>{formData.isInterState ? "IGST" : "CGST + SGST"} ({formData.gstRate}%)</span>
                  <span>₹ {formData.isInterState ? gstCalc.igst.toFixed(2) : (gstCalc.cgst + gstCalc.sgst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-normal text-sm text-primary">
                  <span>{t("Total with GST", "మొత్తం GST కలిపి")}</span>
                  <span>₹ {gstCalc.totalWithGST.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-gray-500 uppercase">{t("Advance Paid", "అడ్వాన్స్")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input
                  type="number"
                  value={formData.advancePaid}
                  onChange={(e) => setFormData({...formData, advancePaid: parseFloat(e.target.value) || 0})}
                  className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none text-green-600"
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col justify-center border border-gray-100">
               <p className="text-[10px] text-gray-400 uppercase">{t("Balance Due", "మిగిలిన మొత్తం")}</p>
               <p className="text-xl text-primary font-bold">₹ {formData.applyGST ? (gstCalc.totalWithGST - formData.advancePaid).toFixed(2) : (formData.totalAmount - formData.advancePaid).toFixed(2)}</p>
            </div>
          </div>
        </section>

        {/* Stock / Material Automation */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
            <Hash className="w-5 h-5 text-primary" />
            <h2 className="font-normal text-gray-900 uppercase tracking-wide text-sm">{t("Stock / Material Automation", "స్టాక్ / మెటీరియల్ ఆటోమేషన్")}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 uppercase">{t("Select Material from Inventory", "మెటీరియల్ ఎంచుకోండి")}</label>
              <CustomSelect
                options={[
                  { value: "", label: t("No Material (Manual Tracking)", "ఏదీ లేదు") },
                  ...inventoryItems.map(item => ({ 
                    value: item.id, 
                    label: `${item.name} (${item.quantity} ${item.unit} available)` 
                  }))
                ]}
                value={formData.inventory_id}
                onChange={(val) => setFormData({...formData, inventory_id: val})}
              />
            </div>

            {formData.inventory_id && (
              <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
                <label className="text-xs text-gray-500 uppercase">{t("Usage Per Unit", "యూనిట్‌కు వినియోగం")}</label>
                <div className="flex items-center gap-2">
                   <input
                    type="number"
                    step="0.0001"
                    value={formData.material_units_per_order}
                    onChange={(e) => setFormData({...formData, material_units_per_order: parseFloat(e.target.value) || 0})}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none font-bold"
                  />
                  <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">
                    {inventoryItems.find(i => i.id === formData.inventory_id)?.unit}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end gap-4 lg:relative lg:bg-transparent lg:border-none lg:px-0">
          <Link 
            href="/dashboard/orders"
            className="px-6 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 lg:bg-white"
          >
            {t("Cancel", "రద్దు")}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? t("Saving...", "సేవ్ అవుతోంది...") : t("Save Order", "ఆర్డర్ సేవ్ చేయండి")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
