"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Calculator, 
  ArrowLeft, 
  User, 
  CheckCircle2, 
  Loader2, 
  Edit2, 
  Search, 
  X,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Receipt
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils/format";
import { createQuotation } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { cn } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { useLanguage } from "@/lib/context/LanguageContext";
import { parseOrderText, ParsedJobDetails } from "@/lib/parser";
import { Sparkles, Settings2, FileText } from "lucide-react";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface Customer {
  id: string;
  name: string;
  phone: string;
}

const jobCategories = [
  { id: "visiting-cards", name: "Visiting Cards", telugu: "విజిటింగ్ కార్డ్స్", basePrice: 2, minQty: 100 },
  { id: "banners", name: "Banners", telugu: "బ్యానర్లు", basePrice: 15, minQty: 1, unit: "sq.ft" },
  { id: "wedding-cards", name: "Wedding Cards", telugu: "పెళ్లి శుభలేఖలు", basePrice: 25, minQty: 100 },
  { id: "pamphlets", name: "Pamphlets", telugu: "పాంప్లెట్స్", basePrice: 1.5, minQty: 1000 },
  { id: "other", name: "Other", telugu: "ఇతర పనులు", basePrice: 0, minQty: 1 },
];

export default function NewQuotationPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [selectedJob, setSelectedJob] = useState(jobCategories[4]); // Defaults to 'Other'
  const [customJobName, setCustomJobName] = useState("");
  const [quantity, setQuantity] = useState(jobCategories[0].minQty);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [size, setSize] = useState("");
  const [paperType, setPaperType] = useState("");
  const [printingSide, setPrintingSide] = useState("Single Side");
  const [lamination, setLamination] = useState("None");
  const [printingDate, setPrintingDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isDetailed, setIsDetailed] = useState(false);
  const [detectedSpecs, setDetectedSpecs] = useState<ParsedJobDetails>({});
  
  // Custom Pricing
  const baseTotal = selectedJob.basePrice * quantity;
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  // Sync customPrice when job/qty changes, but only if not manual override
  useEffect(() => {
    if (!isEditingPrice && selectedJob.id !== 'other') {
      const markup = quantity >= 1000 ? 1.05 : 1.15; // Lower markup for bulk
      setCustomPrice(Math.round(baseTotal * markup)); 
    }
  }, [baseTotal, isEditingPrice, selectedJob.id, quantity]);

  // Customer Management
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(true);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const { toast, showToast, dismissToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchCustomers() {
      if (!searchQuery && !isSearchDropdownOpen) return;
      
      const supabase = createClient();
      const tenant = await getCurrentTenant(supabase);
      
      let query = supabase
        .from("customers")
        .select("id, name, phone")
        .eq("tenant_id", tenant?.id)
        .order("name");
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }
      
      const { data } = await query.limit(5);
      setCustomers(data || []);
    }
    
    const timeoutId = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, isSearchDropdownOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveQuotation = async () => {
    const name = isAddingNewCustomer ? newCustomer.name : selectedCustomer?.name;
    const phone = isAddingNewCustomer ? newCustomer.phone : selectedCustomer?.phone;

    if (!name || !phone) {
      showToast(t("Please provide customer name and phone number.", "దయచేసి కస్టమర్ పేరు మరియు ఫోన్ నంబర్ అందించండి."), "error");
      return;
    }

    let finalJobType = selectedJob.id === 'other' ? customJobName : t(selectedJob.name, selectedJob.telugu);
    let finalQty = String(quantity);
    let finalSize = size;
    let finalPaper = paperType;
    let finalSide = printingSide;
    let finalLam = lamination;

    if (!isDetailed && instructions) {
      const parsed = parseOrderText(instructions);
      if (parsed.jobType) finalJobType = parsed.jobType;
      if (parsed.quantity) finalQty = parsed.quantity;
      if (parsed.size) finalSize = parsed.size;
      if (parsed.paperType) finalPaper = parsed.paperType;
      if (parsed.printingSide) finalSide = parsed.printingSide;
      if (parsed.lamination) finalLam = parsed.lamination;
    }

    try {
      await createQuotation({
        customerName: name,
        phone: phone,
        jobType: finalJobType,
        quantity: finalQty,
        size: finalSize,
        paperType: finalPaper,
        printingSide: finalSide,
        lamination: finalLam,
        printingDate: printingDate,
        instructions: instructions,
        taxableAmount: customPrice,
        totalWithGST: customPrice, 
        gstType: 'NONE',
        gstRate: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        status: 'DRAFT'
      });
      setSaveSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/quotations");
      }, 1500);
    } catch (error) {
      console.error("Error saving quotation:", error);
      showToast(t("Failed to save quotation. Please try again.", "కొటేషన్‌ను సేవ్ చేయడం విఫలమైంది. మళ్ళీ ప్రయత్నించండి."), "error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Live parsing
  useEffect(() => {
    if (!isDetailed && instructions) {
      const parsed = parseOrderText(instructions);
      setDetectedSpecs(parsed);
    } else {
      setDetectedSpecs({});
    }
  }, [instructions, isDetailed]);

  if (saveSuccess) {
    return (
      <div className="flex items-center justify-center p-20 animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-12 rounded-xl shadow-sm max-w-sm w-full text-center space-y-4 border border-green-100">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-medium text-gray-900">{t("Quotation Created!", "కొటేషన్ సృష్టించబడింది!")}</h2>
          <p className="text-gray-500 text-sm">{t("Redirecting to list...", "జాబితాకు వెళ్తోంది...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-6 pb-20 px-4">
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
      {/* Simple Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/quotations" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <h1 className="text-xl font-medium text-gray-900">{t("New Quotation", "కొత్త కొటేషన్")}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Section: Customer */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 text-sm">
            <h2 className="font-medium text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("Customer Details", "కస్టమర్ వివరాలు")}
            </h2>
            
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                 <div>
                    <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                    <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                 </div>
                 <button 
                   onClick={() => {
                     setSelectedCustomer(null);
                     setSearchQuery("");
                     setIsAddingNewCustomer(true);
                   }}
                   className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-red-500 transition-colors"
                 >
                   <X className="w-4 h-4" />
                 </button>
              </div>
            ) : isAddingNewCustomer ? (
              <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">{t("Name", "పేరు")}</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">{t("Phone", "ఫోన్")}</label>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none text-sm"
                      />
                    </div>
                 </div>
                 <div className="flex justify-start">
                    <button 
                      onClick={() => setIsAddingNewCustomer(false)} 
                      className="text-[11px] text-gray-400 hover:text-primary transition-colors flex items-center gap-1 group"
                    >
                      <Search className="w-3 h-3 group-hover:scale-110 transition-transform" />
                      {t("Search existing customer instead", "ముందు ఉన్న కస్టమర్ కోసం వెతకండి")}
                    </button>
                 </div>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("Search name or phone...", "పేరు లేదా ఫోన్ కోసం వెతకండి...")}
                    value={searchQuery}
                    onFocus={() => setIsSearchDropdownOpen(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchDropdownOpen(true);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none text-sm"
                  />
                </div>
                
                {isSearchDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 p-1 z-50">
                     {customers.length > 0 ? (
                       <div className="max-h-60 overflow-auto">
                         {customers.map(c => (
                           <button
                             key={c.id}
                             onClick={() => {
                               setSelectedCustomer(c);
                               setIsSearchDropdownOpen(false);
                             }}
                             className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors text-left"
                           >
                             <div>
                               <p className="text-sm font-medium text-gray-900">{c.name}</p>
                               <p className="text-[11px] text-gray-400">{c.phone}</p>
                             </div>
                             <ChevronRight className="w-4 h-4 text-gray-300" />
                           </button>
                         ))}
                       </div>
                     ) : (
                       <div className="p-4 text-center">
                          <p className="text-xs text-gray-400 mb-2">{t("No customers found", "కస్టమర్లు కనుగొనబడలేదు")}</p>
                          <button 
                            onClick={() => setIsAddingNewCustomer(true)}
                            className="px-3 py-1.5 bg-primary text-white rounded-md text-[11px] font-medium"
                          >
                            {t("Add New Lead", "కొత్త లీడ్ జోడించండి")}
                          </button>
                        </div>
                     )}
                     <div className="p-2 border-t border-gray-50 text-center">
                        <button 
                          onClick={() => setIsAddingNewCustomer(true)}
                          className="text-[10px] text-gray-400 hover:text-primary transition-colors"
                        >
                          {t("Cancel search, enter new lead details", "వెతకడం రద్దు చేయండి, కొత్త లీడ్ వివరాలను నమోదు చేయండి")}
                        </button>
                     </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Job Details */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <h2 className="font-medium text-gray-900 text-sm">{t("Job Specifications", "పని వివరాలు")}</h2>
              </div>
              
              <button
                type="button"
                onClick={() => setIsDetailed(!isDetailed)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 rounded-full transition-colors border border-primary/20"
              >
                {isDetailed ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    {t("Switch to Quick Note", "క్విక్ నోట్ కు మారండి")}
                  </>
                ) : (
                  <>
                    <Settings2 className="w-3.5 h-3.5" />
                    {t("Add Detailed Specs", "వివరాలు జోడించండి")}
                  </>
                )}
              </button>
            </div>

            {!isDetailed ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 uppercase">{t("Category", "పని రకం")}</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        readOnly
                        value={detectedSpecs.jobType || (selectedJob.id === 'other' ? customJobName : t(selectedJob.name, selectedJob.telugu))}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-500 uppercase">{t("Job Details (Type here)", "పని వివరాలు (ఇక్కడ రాయండి)")}</label>
                    <div className="flex flex-wrap gap-2">
                       {detectedSpecs.quantity && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded uppercase">Qty: {detectedSpecs.quantity}</span>}
                       {detectedSpecs.size && <span className="px-2 py-0.5 bg-orange/10 text-orange text-[10px] font-bold rounded uppercase">{detectedSpecs.size}</span>}
                       {detectedSpecs.paperType && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">{detectedSpecs.paperType}</span>}
                       {detectedSpecs.printingSide && <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded uppercase">{detectedSpecs.printingSide}</span>}
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-primary/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none font-medium min-h-[80px]"
                    placeholder={t("e.g. 500 Visiting cards, A4, 300GSM Matte, Double side...", "ఉదా: 500 విజిటింగ్ కార్డ్స్, A4, 300GSM మ్యాట్, రెండు వైపులా...")}
                  />
                  <p className="text-[10px] text-gray-400 italic mt-1">{t("Type details naturally, we will extract them automatically.", "వివరాలను సహజంగా టైప్ చేయండి, మేము వాటిని స్వయంచాలకంతిగా గుర్తిస్తాము.")}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
               <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">{t("Select Category", "పని రకాన్ని ఎంచుకోండి")}</label>
               <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {jobCategories.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => {
                        setSelectedJob(job);
                        setQuantity(job.minQty);
                        setIsEditingPrice(false);
                      }}
                      className={cn(
                        "p-3 rounded-xl border transition-all text-left group relative overflow-hidden",
                        selectedJob.id === job.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                          : "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200"
                      )}
                    >
                      <p className={cn(
                        "font-medium text-xs mb-0.5",
                        selectedJob.id === job.id ? "text-primary" : "text-gray-700"
                      )}>
                        {t(job.name, job.telugu)}
                      </p>
                      <p className="text-[9px] text-gray-400 line-clamp-1">{t(job.name, job.telugu)}</p>
                      {selectedJob.id === job.id && (
                        <div className="absolute top-1.5 right-1.5">
                           <CheckCircle2 className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
               </div>
            </div>

            {selectedJob.id === 'other' && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                 <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{t("Custom Job Name", "ఇతర పని పేరు")}</label>
                 <input
                   type="text"
                   placeholder="e.g. Spiral Binding, Lamination..."
                   value={customJobName}
                   onChange={(e) => setCustomJobName(e.target.value)}
                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none text-sm"
                 />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 pt-2">
              <div className="space-y-1">
                 <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{t("Quantity", "పరిమాణం")}</label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-gray-100 rounded-lg shadow-sm">
                       <TrendingUp className="w-3 h-3 text-primary" />
                    </div>
                    <input
                      type="number"
                      min={selectedJob.minQty}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      className="w-full pl-12 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none text-sm font-medium"
                    />
                 </div>
                 <p className="text-[10px] text-gray-400 italic">Min: {selectedJob.minQty}</p>
              </div>
              
              <div className="space-y-1">
                 <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{t("Size", "సైజు")}</label>
                 <input
                    type="text"
                    placeholder="e.g. 10x15, A4"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none text-sm"
                  />
              </div>

              <div className="space-y-1">
                 <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{t("Paper / GSM", "పేపర్ / GSM")}</label>
                 <input
                    type="text"
                    placeholder="e.g. 300 GSM"
                    value={paperType}
                    onChange={(e) => setPaperType(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none text-sm"
                  />
              </div>

              <div className="space-y-1">
                 <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{t("Side", "సైడ్")}</label>
                 <CustomSelect
                    options={[
                      { value: "Single Side", label: t("Single Side", "సింగిల్ సైడ్") },
                      { value: "Double Side", label: t("Double Side", "డబుల్ సైడ్") }
                    ]}
                    value={printingSide}
                    onChange={(val) => setPrintingSide(val as string)}
                 />
              </div>

              <div className="space-y-1">
                 <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{t("Lamination", "లామినేషన్")}</label>
                 <CustomSelect
                    options={[
                      { value: "None", label: t("None", "ఏమీ లేదు") },
                      { value: "Gloss", label: t("Gloss", "గ్లాస్") },
                      { value: "Matte", label: t("Matte", "మాట్టే") },
                      { value: "Velvet", label: t("Velvet", "వెల్వెట్") }
                    ]}
                    value={lamination}
                    onChange={(val) => setLamination(val as string)}
                 />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{t("Printing Date", "ప్రింటింగ్ తేదీ")}</label>
                <CustomDatePicker
                  value={printingDate}
                  onChange={(val) => setPrintingDate(val)}
                />
              </div>
              
                  <textarea
                    rows={1}
                    placeholder="Special instructions..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none text-sm resize-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Summary Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
               <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                 <Receipt className="w-4 h-4 text-primary" />
                 {t("Quotation Summary", "కొటేషన్ సారాంశం")}
               </h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                 <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{t("Base Estimate", "అంచనా మొత్తం")}</span>
                    {!isEditingPrice && (
                      <button 
                        onClick={() => setIsEditingPrice(true)}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                         <Edit2 className="w-3 h-3" />
                         {t("Override", "మార్చండి")}
                      </button>
                    )}
                 </div>
                 
                 {isEditingPrice ? (
                   <div className="space-y-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                        <input
                          type="number"
                          autoFocus
                          value={customPrice}
                          onChange={(e) => setCustomPrice(parseInt(e.target.value) || 0)}
                          className="w-full pl-8 pr-4 py-2 border border-primary/30 rounded-lg text-lg font-bold outline-none ring-2 ring-primary/5 shadow-inner"
                        />
                      </div>
                      <button 
                        onClick={() => setIsEditingPrice(false)}
                        className="w-full py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-black transition-colors"
                      >
                        {t("Apply Changes", "మార్పులను వర్తింపజేయండి")}
                      </button>
                   </div>
                 ) : (
                   <div className="text-4xl font-bold text-gray-900 tracking-tight">
                      {formatCurrency(customPrice)}
                   </div>
                 )}
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-50">
                 <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t("Job Type", "పని రకం")}</span>
                    <span className="font-medium text-gray-900">{selectedJob.id === 'other' ? (customJobName || t('Custom', 'కస్టమ్')) : t(selectedJob.name, selectedJob.telugu)}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t("Quantity", "పరిమాణం")}</span>
                    <span className="font-medium text-gray-900">{quantity} {t(selectedJob.unit || 'Units', 'యూనిట్లు')}</span>
                 </div>
                 {size && (
                   <div className="flex justify-between text-xs">
                       <span className="text-gray-500">{t("Size", "సైజు")}</span>
                       <span className="font-medium text-gray-900">{size}</span>
                   </div>
                 )}
                 {paperType && (
                   <div className="flex justify-between text-xs">
                       <span className="text-gray-500">{t("Paper / GSM", "పేపర్ / GSM")}</span>
                       <span className="font-medium text-gray-900">{paperType}</span>
                   </div>
                 )}
                 <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t("Side", "సైడ్")}</span>
                    <span className="font-medium text-gray-900">{printingSide}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t("Lamination", "లామినేషన్")}</span>
                    <span className="font-medium text-gray-900">{lamination}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-gray-500 uppercase tracking-widest text-[9px] opacity-60">{t("Avg. Unit Price", "సగటు యూనిట్ ధర")}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(selectedJob.basePrice)}/u</span>
                 </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                 <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{t("Guidelines", "మార్గదర్శకాలు")}</p>
                 <ul className="space-y-1.5">
                    <li className="text-[11px] text-gray-600 list-disc list-inside">{t("50% Advance Required", "50% అడ్వాన్స్ అవసరం")}</li>
                    <li className="text-[11px] text-gray-600 list-disc list-inside">{t("Validity: 7 Days", "చెల్లుబాటు: 7 రోజులు")}</li>
                 </ul>
              </div>

              <button
                onClick={handleSaveQuotation}
                disabled={saveLoading || (!selectedCustomer && !isAddingNewCustomer)}
                className="w-full py-3.5 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:pointer-events-none"
              >
                {saveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {t("Save Quotation", "కొటేషన్ సేవ్ చేయండి")}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
