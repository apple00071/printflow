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
import { createOrder } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { calculateGST } from "@/lib/gst";
import { useLanguage } from "@/lib/context/LanguageContext";
import { JOB_TYPE_DEFAULTS, DEFAULT_GST_RATES } from "@/lib/config";
import CustomSelect from "@/components/ui/CustomSelect";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

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
    jobType: "Business Cards",
    quantity: "1",
    paperType: "",
    size: "",
    instructions: "",
    deliveryDate: "",
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

  const [inventoryItems, setInventoryItems] = useState<{ id: string; name: string; unit: string; quantity: number }[]>([]);

  // Pre-fill from query params if coming from a quotation
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("quotation_id")) {
      setFormData(prev => ({
        ...prev,
        quotation_id: searchParams.get("quotation_id") || "",
        customerName: searchParams.get("customerName") || "",
        phone: searchParams.get("phone") || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jobType: searchParams.get("jobType") as any || "Business Cards",
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
        
        // Auto-set default rate
        const defaultRate = rates?.find(r => r.is_default);
        if (defaultRate) {
          setFormData(prev => ({ ...prev, gstRate: defaultRate.rate }));
        }

        // Fetch Inventory
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
    } catch {
      console.error("Upload error");
      alert(t("Failed to upload file", "ఫైల్ అప్‌లోడ్ విఫలమైంది"));
      setFileName("");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await createOrder(formData);
      router.push("/dashboard/orders");
    } catch {
      console.error("Error creating order");
      alert(t("Failed to create order. Please try again.", "ఆర్డర్ సృష్టించడం విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి."));
    } finally {
      setLoading(false);
    }
  };

  const gstCalc = calculateGST(formData.totalAmount, formData.gstRate, formData.isInterState);

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/orders" className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 group">
          <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-primary" />
        </Link>
        <div>
          <h1 className="text-2xl  text-gray-900">{t("New Order", "కొత్త ఆర్డర్")}</h1>
          <p className="text-gray-500 text-sm">{t("Create a new printing job for a customer", "కస్టమర్ కోసం కొత్త ప్రింటింగ్ పనిని సృష్టించండి")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        {/* Customer Information Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-normal text-gray-900 uppercase tracking-wide text-sm">{t("Customer Details", "కస్టమర్ వివరాలు")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs  text-gray-500 uppercase">{t("Customer Name", "పేరు")}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                  placeholder={t("Enter full name", "పూర్తి పేరు నమోదు చేయండి")}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs  text-gray-500 uppercase">{t("Phone Number", "ఫోన్ నంబర్")}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                  placeholder={t("e.g. 9876543210 (Optional)", "ఉదా: 9876543210 (ఐచ్ఛికం)")}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Job Details Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-normal text-gray-900 uppercase tracking-wide text-sm">{t("Job Details", "ఆర్డర్ వివరాలు")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs  text-gray-500 uppercase">{t("Job Type", "పని రకం")}</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  list="job-types"
                  type="text"
                  required
                  value={formData.jobType}
                  onChange={(e) => {
                    const newJobType = e.target.value;
                    const defaults = JOB_TYPE_DEFAULTS[newJobType];
                    setFormData(prev => ({
                      ...prev,
                      jobType: newJobType,
                      ...(defaults ? {
                        hsnCode: defaults.hsn,
                        applyGST: true,
                        gstRate: defaults.gst
                      } : {})
                    }));
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                  placeholder={t("e.g. Business Cards, Banners...", "ఉదా: విజిటింగ్ కార్డ్స్, బ్యానర్లు...")}
                />
                <datalist id="job-types">
                  {jobTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs  text-gray-500 uppercase">{t("Quantity", "పరిమాణం")}</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                  placeholder={t("e.g. 100 or 500+500", "ఉదా: 100 లేదా 500+500")}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs  text-gray-500 uppercase">{t("Delivery Date", "డెలివరీ తేదీ")}</label>
              <CustomDatePicker
                value={formData.deliveryDate}
                onChange={(value) => setFormData({ ...formData, deliveryDate: value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs  text-gray-500 uppercase">{t("Paper Type", "కాగితం రకం")}</label>
              <input
                type="text"
                placeholder={t("e.g. 300 GSM Matte", "ఉదా: 300 GSM Matte")}
                value={formData.paperType}
                onChange={(e) => setFormData({...formData, paperType: e.target.value})}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs  text-gray-500 uppercase">{t("Size", "సైజు")}</label>
              <input
                type="text"
                placeholder={t("e.g. A4, 10x15", "ఉదా: A4, 10x15")}
                value={formData.size}
                onChange={(e) => setFormData({...formData, size: e.target.value})}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs  text-gray-500 uppercase">{t("Printing Side", "ప్రింటింగ్ సైడ్")}</label>
              <CustomSelect
                options={[
                  { value: "Single Side", label: t("Single Side", "సింగిల్ సైడ్") },
                  { value: "Double Side", label: t("Double Side", "డబుల్ సైడ్") }
                ]}
                value={formData.printingSide}
                onChange={(val) => setFormData({...formData, printingSide: val as string})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs  text-gray-500 uppercase">{t("Lamination", "లామినేషన్")}</label>
              <CustomSelect
                options={[
                  { value: "None", label: t("None", "లేదు") },
                  { value: "Gloss", label: t("Gloss", "గ్లాస్") },
                  { value: "Matte", label: t("Matte", "మ్యాట్") },
                  { value: "Velvet", label: t("Velvet", "వెల్వెట్") }
                ]}
                value={formData.lamination}
                onChange={(val) => setFormData({...formData, lamination: val as string})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 uppercase">{t("Printing Date", "ప్రింటింగ్ తేదీ")}</label>
              <CustomDatePicker
                value={formData.printingDate}
                onChange={(value) => setFormData({ ...formData, printingDate: value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs  text-gray-500 uppercase">{t("Design File", "ఫైల్")}</label>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.zip,.rar"
              />
              {!formData.file_url ? (
                <button 
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600 transition-colors"
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      {t("Uploading...", "అప్‌లోడ్ అవుతోంది...")}
                    </div>
                  ) : (
                    <>
                      <Upload className="w-3 h-3" />
                      {t("Upload File", "ఫైల్ అప్‌లోడ్")}
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                  <div className="flex items-center gap-2 truncate">
                    <FileIcon className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{fileName || t("File Uploaded", "ఫైల్ అప్‌లోడ్ చేయబడింది")}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, file_url: "" }));
                      setFileName("");
                    }}
                    className="p-1 hover:bg-green-100 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs  text-gray-500 uppercase">{t("Special Instructions", "సూచనలు")}</label>
            <textarea
              rows={3}
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
              placeholder={t("e.g. Laminate after printing, edge cutting needed", "ఉదా: ప్రింటింగ్ తర్వాత లామినేట్ చేయండి")}
            />
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
            <h2 className=" text-gray-900 uppercase tracking-wide text-sm">{t("Pricing & Payment", "ధర మరియు చెల్లింపు")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs  text-gray-500 uppercase">{formData.applyGST ? t("Taxable Amount", "పన్ను విధించదగిన మొత్తం") : t("Total Amount", "మొత్తం ధర")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ">₹</span>
                <input
                  type="number"
                  required
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})}
                  className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none "
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
              <label className="text-xs  text-gray-500 uppercase">{t("Advance Paid", "అడ్వాన్స్")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ">₹</span>
                <input
                  type="number"
                  value={formData.advancePaid}
                  onChange={(e) => setFormData({...formData, advancePaid: parseFloat(e.target.value) || 0})}
                  className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none  text-green-600"
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col justify-center border border-gray-100">
               <p className="text-[10px]  text-gray-400 uppercase">{t("Balance Due", "మిగిలిన మొత్తం")}</p>
               <p className="text-xl  text-primary">₹ {formData.applyGST ? (gstCalc.totalWithGST - formData.advancePaid).toFixed(2) : (formData.totalAmount - formData.advancePaid).toFixed(2)}</p>
            </div>
          </div>
        </section>

        {/* Stock / Material Automation */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
            <Hash className="w-5 h-5 text-primary" />
            <h2 className="font-normal text-gray-900 uppercase tracking-wide text-sm">{t("Stock / Material Automation", "స్టాక్ / మెటీరియల్ ఆటోమేషన్", "स्टॉक / सामग्री स्वचालन")}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 uppercase">{t("Select Material from Inventory", "మెటీరియల్ ఎంచుకోండి", "इन्वेंट्री से सामग्री चुनें")}</label>
              <CustomSelect
                options={[
                  { value: "", label: t("No Material (Manual Tracking)", "ఏదీ లేదు (మ్యాన్యువల్)", "कोई सामग्री नहीं (मैनुअल ट्रैक)") },
                  ...inventoryItems.map(item => ({ 
                    value: item.id, 
                    label: `${item.name} (${item.quantity} ${item.unit} available)` 
                  }))
                ]}
                value={formData.inventory_id}
                onChange={(val) => setFormData({...formData, inventory_id: val})}
              />
              <p className="text-[10px] text-gray-400 italic">
                {t("Stock will be automatically deducted upon saving.", "సేవ్ చేసినప్పుడు స్టాక్ ఆటోమేటిక్‌గా తగ్గుతుంది.", "सहेजने पर स्टॉक अपने आप कम हो जाएगा।")}
              </p>
            </div>

            {formData.inventory_id && (
              <div className="space-y-1 animate-in fade-in slide-in-from-left-2 transition-all">
                <label className="text-xs text-gray-500 uppercase">{t("Usage Per Unit (e.g. Sheets per Card)", "యూనిట్‌కు వినియోగం", "प्रति इकाई उपयोग")}</label>
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
                <p className="text-[10px] text-primary font-bold">
                  {t("Total Deduction", "మొత్తం తగ్గింపు", "कुल कटौती")}: {(parseFloat(formData.quantity) * formData.material_units_per_order).toFixed(2)} {inventoryItems.find(i => i.id === formData.inventory_id)?.unit}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end gap-4 lg:relative lg:bg-transparent lg:border-none lg:px-0">
          <Link 
            href="/dashboard/orders"
            className="px-6 py-2 text-sm  text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 lg:bg-white"
          >
            {t("Cancel", "రద్దు")}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2 bg-orange text-white text-sm  rounded-lg shadow-lg shadow-orange/20 hover:bg-orange/90 active:scale-95 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? t("Saving...", "సేవ్ అవుతోంది...") : t("Save Order", "ఆర్డర్ సేవ్ చేయండి")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
