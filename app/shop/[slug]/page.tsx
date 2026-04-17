"use client";

import { useState, useEffect, useRef } from "react";
import { 
  FileUp, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  User,
  LayoutGrid,
  FileBadge,
  MessageSquare,
  Layers,
  Maximize,
  Copy,
  Hash
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface TenantInfo {
  id: string;
  name: string;
  logo_url?: string;
  business_type?: string;
}

export default function ShopIntakePage({ params }: { params: { slug: string } }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobType, setJobType] = useState("");
  const [quantity, setQuantity] = useState("1000");
  const [paperType, setPaperType] = useState("");
  const [size, setSize] = useState("");
  const [printingSide, setPrintingSide] = useState("Single Side");
  const [lamination, setLamination] = useState("None");
  const [instructions, setInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Product autocomplete state
  const productOptions = [
    "Business Cards", "Visiting Cards", "Banners", "Flex Prints",
    "Letterheads", "Wedding Cards", "Pamphlets", "Flyers",
    "Bill Books", "Stickers", "ID Cards", "Calendars", "Brochures", "Other"
  ];
  const [productQuery, setProductQuery] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [highlightedProduct, setHighlightedProduct] = useState(-1);
  const productContainerRef = useRef<HTMLDivElement>(null);
  const filteredProducts = productQuery.length < 3
    ? productOptions
    : productOptions.filter(p => p.toLowerCase().includes(productQuery.toLowerCase()));

  const supabase = createClient();

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (productContainerRef.current && !productContainerRef.current.contains(e.target as Node)) {
        setShowProductSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    async function fetchShopInfo() {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, logo_url, business_type")
        .eq("slug", params.slug)
        .single();

      if (error || !data) {
        console.error("Shop not found");
      } else {
        setTenant(data);
      }
      setLoading(false);
    }
    fetchShopInfo();
  }, [params.slug, supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSubmitting(true);
    setError(null);

    try {
      let file_url = "";
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${tenant.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("printflow-files")
          .upload(`intake/${fileName}`, file);

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("printflow-files").getPublicUrl(`intake/${fileName}`);
        file_url = publicUrl;
      }

      const { data: customerData } = await supabase.from("customers").select("id").eq("phone", phone).eq("tenant_id", tenant.id).single();
      let customerId = customerData?.id;

      if (!customerId) {
        const { data: newCustomer, error: createError } = await supabase.from("customers").insert({ name, phone, tenant_id: tenant.id }).select("id").single();
        if (createError) throw createError;
        customerId = newCustomer.id;
      }

      const { error: orderError } = await supabase.from("orders").insert({
        tenant_id: tenant.id,
        customer_id: customerId,
        job_type: jobType,
        quantity: parseInt(quantity) || 1,
        paper_type: paperType,
        size: size,
        printing_side: printingSide,
        lamination: lamination,
        instructions: instructions,
        file_url: file_url,
        status: 'RECEIVED',
        total_amount: 0,
        advance_paid: 0
      });

      if (orderError) throw orderError;
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit order.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>;
  if (!tenant) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
           <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-6 h-6" />
           </div>
           <div className="space-y-3">
             <h2 className="text-xl font-semibold text-gray-900">Order Placed Successfully</h2>
             <p className="text-sm text-gray-500 leading-relaxed">Thank you, <span className="font-semibold">{name}</span>. Our team at <span className="text-gray-900 font-semibold">{tenant.name}</span> has received your order and will contact you shortly.</p>
           </div>
           <button onClick={() => window.location.reload()} className="h-11 px-8 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black transition-all">Submit Another Order</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      {/* SaaS Top Header */}
      <nav className="h-16 bg-white border-b border-gray-200 sticky top-0 z-50 px-6">
         <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                  <Logo size="sm" showText={false} />
                  <div className="w-px h-4 bg-gray-200 mx-2" />
                  <div className="flex items-center gap-2">
                     {tenant.logo_url && (
                        <div className="w-6 h-6 relative rounded overflow-hidden border">
                           <Image src={tenant.logo_url} alt={tenant.name} fill className="object-cover" />
                        </div>
                     )}
                     <span className="text-sm font-semibold text-gray-900">{tenant.name}</span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full border border-green-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-semibold text-green-700 uppercase tracking-tight">Active Counter</span>
               </div>
            </div>
         </div>
      </nav>

      <main className="flex-1 p-6 md:p-12">
         <div className="max-w-7xl mx-auto">
            <header className="mb-10">
               <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">Create New Order</h3>
               <p className="text-sm text-gray-500 mt-1">Provide customer information and job specifications below.</p>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
               {/* Left Column: Form Sections */}
               <div className="lg:col-span-8 space-y-6">
                  {/* Section 01: Customer Profile */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                     <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                           <User className="w-3.5 h-3.5" /> 01. Customer Profile
                        </h4>
                     </div>
                     <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight ml-0.5">Contact Name</label>
                           <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-900 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight ml-0.5">Mobile Number</label>
                           <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 border-r border-gray-200 pr-2">+91</span>
                              <input type="tel" required pattern="[0-9]{10}" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit primary phone" className="w-full pl-16 pr-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-900 transition-all text-sm font-medium" />
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Section 02: Job Configuration (Expanded) */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                     <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                           <LayoutGrid className="w-3.5 h-3.5" /> 02. Job Configuration
                        </h4>
                     </div>
                     <div className="p-8 space-y-10">
                        {/* Row 1: Category & Quantity */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2" ref={productContainerRef}>
                               <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight ml-0.5">Product</label>
                               <div className="relative">
                                 <input
                                   type="text"
                                   required
                                   autoComplete="off"
                                   value={productQuery || jobType}
                                   placeholder="e.g. Business Cards, Banners..."
                                   onChange={(e) => {
                                     setProductQuery(e.target.value);
                                     setJobType(e.target.value);
                                     setShowProductSuggestions(true);
                                     setHighlightedProduct(-1);
                                   }}
                                   onFocus={() => setShowProductSuggestions(true)}
                                   onKeyDown={(e) => {
                                     if (!showProductSuggestions) return;
                                     if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedProduct(i => Math.min(i + 1, filteredProducts.length - 1)); }
                                     else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedProduct(i => Math.max(i - 1, 0)); }
                                     else if (e.key === "Enter" && highlightedProduct >= 0) {
                                       e.preventDefault();
                                       const p = filteredProducts[highlightedProduct];
                                       setJobType(p); setProductQuery(p); setShowProductSuggestions(false);
                                     }
                                     else if (e.key === "Escape") setShowProductSuggestions(false);
                                   }}
                                   className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all"
                                 />
                                 {showProductSuggestions && filteredProducts.length > 0 && (
                                   <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                                     <div className="max-h-52 overflow-y-auto py-1">
                                       {filteredProducts.map((product, idx) => {
                                         const matchIdx = product.toLowerCase().indexOf(productQuery.toLowerCase());
                                         return (
                                           <button
                                             key={product}
                                             type="button"
                                             onMouseDown={(e) => {
                                               e.preventDefault();
                                               setJobType(product); setProductQuery(product); setShowProductSuggestions(false);
                                             }}
                                             onMouseEnter={() => setHighlightedProduct(idx)}
                                             className={cn(
                                               "w-full px-4 py-2.5 text-sm text-left transition-colors font-medium",
                                               idx === highlightedProduct ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"
                                             )}
                                           >
                                             {productQuery.length >= 3 && matchIdx !== -1 ? (
                                               <span>
                                                 {product.slice(0, matchIdx)}
                                                 <strong className={idx === highlightedProduct ? "text-white" : "text-gray-900"}>{product.slice(matchIdx, matchIdx + productQuery.length)}</strong>
                                                 {product.slice(matchIdx + productQuery.length)}
                                               </span>
                                             ) : product}
                                           </button>
                                         );
                                       })}
                                     </div>
                                   </div>
                                 )}
                                 {showProductSuggestions && productQuery.length >= 3 && filteredProducts.length === 0 && (
                                   <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3">
                                     <p className="text-xs text-gray-500">&quot;{productQuery}&quot; will be saved as the product name.</p>
                                   </div>
                                 )}
                               </div>
                            </div>
                           <div className="space-y-2">
                              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight ml-0.5 flex items-center gap-1.5"><Hash className="w-3 h-3" /> Quantity</label>
                              <input type="number" required value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="E.g. 1000" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-900 transition-all text-sm font-medium" />
                           </div>
                        </div>

                        {/* Row 2: Paper & Size */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-2">
                              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight ml-0.5 flex items-center gap-1.5"><Layers className="w-3 h-3" /> Paper Type / GSM</label>
                              <input type="text" value={paperType} onChange={(e) => setPaperType(e.target.value)} placeholder="E.g. 300 GSM Art Card" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-900 transition-all text-sm font-medium" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight ml-0.5 flex items-center gap-1.5"><Maximize className="w-3 h-3" /> Page Size</label>
                              <input type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="E.g. A4, 10x12 inches" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-900 transition-all text-sm font-medium" />
                           </div>
                        </div>

                        {/* Row 3: Sides & Lamination */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-2">
                              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight ml-0.5 flex items-center gap-1.5"><Copy className="w-3 h-3" /> Printing Side</label>
                              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 border border-gray-100 rounded-lg">
                                 {["Single Side", "Double Side"].map(side => (
                                    <button 
                                      key={side} type="button" 
                                      onClick={() => setPrintingSide(side)}
                                      className={cn("px-3 py-1.5 text-[11px] font-semibold rounded transition-all", printingSide === side ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600")}
                                    >
                                       {side.toUpperCase()}
                                    </button>
                                 ))}
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight ml-0.5">Lamination Requirement</label>
                              <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 border border-gray-100 rounded-lg">
                                 {["None", "Gloss", "Matt"].map(lam => (
                                    <button 
                                      key={lam} type="button" 
                                      onClick={() => setLamination(lam)}
                                      className={cn("px-2 py-1.5 text-[10px] font-semibold rounded transition-all", lamination === lam ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600")}
                                    >
                                       {lam.toUpperCase()}
                                    </button>
                                 ))}
                              </div>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight ml-0.5 flex items-center gap-1.5">
                              <MessageSquare className="w-3 h-3" /> Special Instructions
                           </label>
                           <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Any specific finishing instructions..." className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 min-h-[100px] transition-all" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right Column: Upload & Actions */}
               <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                     <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                           <FileBadge className="w-3.5 h-3.5" /> DESIGN FILE
                        </h4>
                     </div>
                     <div className="p-6">
                        <div className={cn(
                          "relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group mb-4",
                          file ? "bg-green-50/50 border-green-200" : "bg-gray-50/50 border-gray-200 hover:border-gray-400 hover:bg-white"
                        )}>
                           <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                           {file ? (
                              <div className="text-center space-y-3 animate-in slide-in-from-bottom-2">
                                 <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
                                 <p className="text-[13px] font-semibold text-green-900 truncate max-w-[200px]">{file.name}</p>
                              </div>
                           ) : (
                              <div className="text-center space-y-3">
                                 <FileUp className="w-6 h-6 text-gray-300 mx-auto" />
                                 <p className="text-xs font-semibold text-gray-900">Upload Artwork</p>
                                 <p className="text-[11px] text-gray-400 leading-tight">Drop design file here</p>
                              </div>
                           )}
                        </div>

                        {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-100 mb-4">{error}</div>}

                        <button 
                           type="submit" 
                           disabled={submitting}
                           className="w-full h-11 bg-gray-900 hover:bg-black text-white font-semibold text-sm rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                           {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Create Order</span><ArrowRight className="w-4 h-4" /></>}
                        </button>
                     </div>
                  </div>
                  
                  <div className="px-6 py-4 bg-white/50 border border-gray-100 rounded-xl flex items-center gap-3">
                     <ShieldCheck className="w-5 h-5 text-green-500" />
                     <p className="text-[10px] text-gray-400 font-medium leading-tight uppercase tracking-tight">Verified Secure submission powered by PrintFlow SaaS</p>
                  </div>
               </div>
            </form>
         </div>
      </main>
    </div>
  );
}
