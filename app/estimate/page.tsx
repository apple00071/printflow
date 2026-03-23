"use client";

import { useState, useEffect } from "react";
import { 
  Calculator, 
  ArrowLeft, 
  Info, 
  Tag,
  Save,
  User,
  Phone,
  CheckCircle2,
  Loader2,
  Edit2,
  Receipt
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils/format";
import { createQuotation } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const jobCategories = [
  { id: "visiting-cards", name: "Visiting Cards", telugu: "విజిటింగ్ కార్డ్స్", basePrice: 2, minQty: 100 },
  { id: "banners", name: "Banners", telugu: "బ్యానర్లు", basePrice: 15, minQty: 1, unit: "sq.ft" },
  { id: "wedding-cards", name: "Wedding Cards", telugu: "పెళ్లి శుభలేఖలు", basePrice: 25, minQty: 50 },
  { id: "pamphlets", name: "Pamphlets", telugu: "పాంప్లెట్స్", basePrice: 1.5, minQty: 1000 },
];

export default function QuotationBuilderPage() {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState(jobCategories[0]);
  const [quantity, setQuantity] = useState(jobCategories[0].minQty);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Custom Pricing
  const baseTotal = selectedJob.basePrice * quantity;
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  // Sync customPrice when job/qty changes, but only if not manual override
  useEffect(() => {
    if (!isEditingPrice) {
      setCustomPrice(Math.round(baseTotal * 1.1)); // Default 10% markup
    }
  }, [baseTotal, isEditingPrice]);

  // Customer details for saving
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: ""
  });

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/dashboard/quotations/new");
      }
      setIsLoggedIn(!!session);
    }
    checkAuth();
  }, [router]);

  const handleSaveQuotation = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      alert("Please enter customer details / దయచేసి వివరాలు నమోదు చేయండి");
      return;
    }

    setSaveLoading(true);
    try {
      await createQuotation({
        customerName: customerInfo.name,
        phone: customerInfo.phone,
        jobType: selectedJob.name,
        quantity: quantity,
        taxableAmount: customPrice,
        totalWithGST: customPrice, // Assuming inclusive or no GST for quick quote
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
      }, 2000);
    } catch (error) {
      console.error("Error saving quotation:", error);
      alert("Failed to save quotation / సేవ్ చేయడం విఫలమైంది");
    } finally {
      setSaveLoading(false);
    }
  };

  if (saveSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-4 border border-green-100">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-normal text-gray-900">Quotation Saved! / కొటేషన్ సేవ్ చేయబడింది!</h2>
          <p className="text-gray-500 text-sm">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-outfit">
      <header className="bg-white border-b border-gray-100 py-6 px-4 drop-shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <h1 className="text-xl font-normal text-primary uppercase tracking-tight">Quotation Builder / ధర కొటేషన్</h1>
          </div>
          <div className="hidden sm:block">
             <Link href="/order" className="text-sm font-medium text-orange hover:underline">Direct Order / నేరుగా ఆర్డర్</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-primary" />
              <h2 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">Select Job Type / పని రకం</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {jobCategories.map((job) => (
                <button
                  key={job.id}
                  onClick={() => {
                    setSelectedJob(job);
                    setQuantity(job.minQty);
                    setIsEditingPrice(false);
                  }}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    selectedJob.id === job.id 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                      : "bg-white text-gray-600 border-gray-100 hover:border-primary/20 hover:bg-gray-50/50"
                  )}
                >
                  <p className="text-sm font-medium">{job.name}</p>
                  <p className="text-[10px] opacity-60 font-normal">{job.telugu}</p>
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-normal text-gray-500 uppercase tracking-wider">Quantity / పరిమాణం</label>
                <span className="text-[10px] font-medium text-primary px-2 py-1 bg-primary/10 rounded-lg uppercase">Min: {selectedJob.minQty}</span>
              </div>
              <input
                type="number"
                min={selectedJob.minQty}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-normal outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-700">
                <div className="p-1 bg-blue-100 rounded-lg">
                  <Info className="w-4 h-4 flex-shrink-0" />
                </div>
                <p className="text-[10px] leading-relaxed italic">
                  Quotation is based on standard material. Special requirements may alter the final price.
                </p>
              </div>
            </div>
          </div>

          {/* Customer Profile Section (Only if logged in) */}
          {isLoggedIn && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">Customer Profile / కస్టమర్</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wide px-1">Full Name / పేరు</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wide px-1">Mobile Number / ఫోన్</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="tel"
                      placeholder="10-digit number"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleSaveQuotation}
                disabled={saveLoading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-white text-xs font-normal uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
              >
                {saveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Finalize Quotation & Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Quotation Result Section */}
        <div className="flex flex-col gap-6">
          <div className="bg-primary text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-orange/20 rounded-full blur-3xl group-hover:bg-orange/30 transition-all duration-700" />
            
            <div className="relative space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange" />
                  <h3 className="text-[10px] font-normal uppercase tracking-[0.2em] text-white/60">Final Quotation / కచ్చితమైన ధర</h3>
                </div>
                {isLoggedIn && !isEditingPrice && (
                  <button 
                    onClick={() => setIsEditingPrice(true)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                {isEditingPrice ? (
                  <div className="flex items-center gap-3 animate-in slide-in-from-right-2 duration-300">
                    <span className="text-3xl text-orange font-bold">₹</span>
                    <input
                      type="number"
                      autoFocus
                      value={customPrice}
                      onChange={(e) => setCustomPrice(parseInt(e.target.value) || 0)}
                      className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-3xl font-bold w-full outline-none focus:ring-2 focus:ring-orange/50"
                    />
                    <button 
                      onClick={() => setIsEditingPrice(false)}
                      className="px-4 py-2 bg-white text-primary text-[10px] font-bold uppercase tracking-widest rounded-lg"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <p className="text-5xl lg:text-6xl font-normal tracking-tighter flex items-baseline gap-2">
                    <span className="text-3xl text-orange font-bold">₹</span> 
                    {formatCurrency(customPrice).replace("₹", "")}
                  </p>
                )}
                <p className="text-white/40 text-[10px] font-normal uppercase tracking-[0.3em] pl-1">Confirmed price for today</p>
              </div>

              <div className="pt-8 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-normal uppercase tracking-widest text-white/50 border-b border-white/10 pb-2">
                  <span>Base Unit Cost</span>
                   <span>{formatCurrency(selectedJob.basePrice)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <p className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Job</p>
                      <p className="text-xs font-medium">{selectedJob.name}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Quantity</p>
                      <p className="text-xs font-medium">{quantity}</p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100">
             <div className="flex items-center gap-2 mb-4">
               <Tag className="w-4 h-4 text-primary" />
               <h2 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">Business Policy</h2>
             </div>
             <ul className="space-y-4">
                {[
                  { text: "50% advance for all orders", te: "అన్ని ఆర్డర్లకు 50% అడ్వాన్స్ తప్పనిసరి" },
                  { text: "Pricing valid for 7 days only", te: "ఈ ధర కేవలం 7 రోజులు మాత్రమే చెల్లుతుంది" },
                  { text: "GST will be added to the final bill", te: "చివరి బిల్లుకు GST అదనంగా చేర్చబడుతుంది" }
                ].map((item, idx) => (
                  <li key={idx} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-[11px] text-gray-700 font-medium">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-sm shadow-primary/20" />
                      {item.text}
                    </div>
                    <span className="text-[9px] text-gray-400 ml-4 italic">{item.te}</span>
                  </li>
                ))}
             </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
