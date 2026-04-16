"use client";

import { 
  Settings, 
  User, 
  MapPin, 
  Phone, 
  Hash, 
  Printer,
  Save,
  Loader2,
  Users,
  Shield,
  Crown,
  QrCode,
  Download,
  ExternalLink,
  Store,
  Upload,
  Image as ImageIcon,
  X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { useLanguage } from "@/lib/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import { formatDate } from "@/lib/utils/format";
import Script from "next/script";
import { updateTenantDetails } from "@/lib/supabase/actions";

export default function SettingsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("business");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: "business", label: t("Business Details", "బిజినెస్ వివరాలు"), icon: Settings },
    { id: "qr", label: t("QR Storefront", "QR స్టోర్‌ఫ్రంట్"), icon: QrCode },
    { id: "subscription", label: t("Subscription", "సబ్‌స్క్రిప్షన్"), icon: Hash },
    { id: "profile", label: t("My Profile", "నా ప్రొఫైల్"), icon: User },
  ];

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  interface Tenant {
    id: string;
    name: string;
    slug: string;
    city?: string;
    phone?: string;
    gst_number?: string;
    logo_url?: string;
    id_prefix?: string;
    subscription_tier?: string;
    orders_this_month?: number;
    subscription_end_date?: string;
  }
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      const supabase = createClient();
      const currentTenant = await getCurrentTenant(supabase);
      setTenant(currentTenant);
    }
    fetchSettings();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const supabase = createClient();
      if (!tenant) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${tenant.id}/branding/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('printflow-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('printflow-files')
        .getPublicUrl(filePath);

      setTenant(prev => prev ? { ...prev, logo_url: publicUrl } : null);
    } catch (err) {
      console.error("Logo upload error:", err);
      alert("Failed to upload logo");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveBusinessDetails = async () => {
    if (!tenant) return;
    setSaveLoading(true);
    try {
      await updateTenantDetails({
        name: tenant.name,
        city: tenant.city,
        phone: tenant.phone,
        gst_number: tenant.gst_number,
        logo_url: tenant.logo_url,
        id_prefix: tenant.id_prefix
      });
      alert(t("Settings saved successfully!", "సెట్టింగ్‌లు విజయవంతంగా సేవ్ చేయబడ్డాయి!"));
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save settings");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/razorpay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro_monthly' }),
      });
      const data = await res.json();
      
      if (data.subscription_id) {
        const options = {
          key: data.key_id,
          subscription_id: data.subscription_id,
          name: "PrintFlow SaaS",
          description: "Pro Plan Subscription",
          handler: function () {
            alert("Payment successful! Your plan will be updated shortly.");
            window.location.reload();
          },
          theme: { color: "#1e3a5f" },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch {
      console.error("Upgrade error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row gap-8">
         {/* Sidebar Tabs */}
         <div className="w-full lg:w-64 space-y-2">
            {tabs.map((tab) => (
               <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all  ${
                    activeTab === tab.id 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
                  }`}
               >
                  <tab.icon className="w-5 h-5" />
                  <div className="text-left">
                     <p className="text-sm">{tab.label}</p>
                  </div>
               </button>
            ))}
         </div>

         {/* Settings Content Area */}
         <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {activeTab === "qr" && (
              <div className="p-8 space-y-10">
                 <div className="border-b border-gray-100 pb-6 flex items-center justify-between">
                    <div className="space-y-1">
                       <h2 className="text-xl font-normal text-gray-900 uppercase tracking-tighter">{t("Counter QR Storefront", "కౌంటర్ QR స్టోర్‌ఫ్రంట్")}</h2>
                       <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t("Let customers order by scanning a code", "ఖాతాదారులు కోడ్‌ని స్కాన్ చేయడం ద్వారా ఆర్డర్ చేయనివ్వండి")}</p>
                    </div>
                    <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                       <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
                    </div>
                 </div>

                 <div className="grid lg:grid-cols-2 gap-12 items-start">
                    {/* Visual QR Preview */}
                    <div className="space-y-6">
                       <div className="aspect-square max-w-[320px] mx-auto bg-white rounded-3xl border border-gray-100 shadow-2xl p-8 flex flex-col items-center justify-center relative group">
                          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                          <div className="relative z-10 w-full h-full">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/shop/${tenant?.slug || ''}` : '')}`} 
                                alt="Shop QR Code"
                                className="w-full h-full object-contain"
                             />
                          </div>
                       </div>
                       
                       <div className="flex flex-col gap-3">
                          <button 
                             onClick={() => {
                                const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`${window.location.origin}/shop/${tenant?.slug || ''}`)}`;
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `${tenant?.slug || 'shop'}-qr-code.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                             }}
                             className="w-full bg-primary text-white h-14 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95"
                          >
                             <Download className="w-4 h-4" /> {t("Download QR for Print", "ప్రింట్ కోసం QR డౌన్‌లోడ్ చేయండి")}
                          </button>
                          <a 
                             href={`/shop/${tenant?.slug}`} 
                             target="_blank"
                             className="w-full bg-white border border-gray-100 text-gray-500 h-14 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-gray-50 transition-all"
                          >
                             <ExternalLink className="w-4 h-4" /> {t("Test Storefront Link", "స్టోర్‌ఫ్రంట్ లింక్‌ను పరీక్షించండి")}
                          </a>
                       </div>
                    </div>

                    {/* How it works info */}
                    <div className="space-y-8">
                       <div className="space-y-4">
                          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t("How it works", "ఇది ఎలా పనిచేస్తుంది")}</h3>
                          <div className="space-y-6">
                             <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs shrink-0">1</div>
                                <div className="space-y-1">
                                   <p className="font-bold text-gray-900">{t("Print the QR Code", "QR కోడ్‌ను ప్రింట్ చేయండి")}</p>
                                   <p className="text-xs text-gray-500 leading-relaxed">{t("Place it on your billing counter where customers can easily scan it.", "ఖాతాదారులు సులభంగా స్కాన్ చేయగల మీ బిల్లింగ్ కౌంటర్‌లో దీన్ని ఉంచండి.")}</p>
                                </div>
                             </div>
                             <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-orange/10 flex items-center justify-center text-orange font-black text-xs shrink-0">2</div>
                                <div className="space-y-1">
                                   <p className="font-bold text-gray-900">{t("Customer Scans & Submits", "కస్టమర్ స్కాన్ చేసి సబ్మిట్ చేస్తారు")}</p>
                                   <p className="text-xs text-gray-500 leading-relaxed">{t("They enter their name, phone, and upload their design files directly from their phone.", "వారు తమ పేరు, ఫోన్ నంబర్ నమోదు చేసి, నేరుగా వారి ఫోన్ నుండి వారి డిజైన్ ఫైల్‌లను అప్‌లోడ్ చేస్తారు.")}</p>
                                </div>
                             </div>
                             <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-black text-xs shrink-0">3</div>
                                <div className="space-y-1">
                                   <p className="font-bold text-gray-900">{t("Immediate Order Alert", "తక్షణ ఆర్డర్ అలర్ట్")}</p>
                                   <p className="text-xs text-gray-500 leading-relaxed">{t("The order appears in your 'Orders' dashboard. You can then quote the price and start printing.", "ఆర్డర్ మీ 'ఆర్డర్లు' డాష్‌బోర్డ్‌లో కనిపిస్తుంది. మీరు అప్పుడు ధరను కోట్ చేసి ప్రింట్ చేయడం ప్రారంభించవచ్చు.")}</p>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="bg-[#1e3a5f] p-8 rounded-[32px] text-white space-y-4 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                             <Store className="w-32 h-32" />
                          </div>
                          <h4 className="text-sm font-black uppercase tracking-widest">{t("Storefront Link", "స్టోర్‌ఫ్రంట్ లింక్")}</h4>
                          <div className="bg-white/10 p-4 rounded-xl font-mono text-xs break-all border border-white/5">
                             {typeof window !== 'undefined' ? `${window.location.origin}/shop/${tenant?.slug}` : ''}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === "business" && (
              <div className="p-8 space-y-10">
                <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                  <div>
                    <h2 className="text-xl text-gray-900">{t("Business Details", "బిజినెస్ వివరాలు")}</h2>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Manage your shop&apos;s core identity</p>
                  </div>
                  <button 
                    onClick={handleSaveBusinessDetails}
                    disabled={saveLoading}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50"
                  >
                     {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     {t("Save Changes", "మారపులను సేవ్ చేయండి")}
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                   {/* Logo Upload Section */}
                   <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Shop Logo</label>
                      <div className="relative group">
                        <div className="aspect-square w-full max-w-[200px] bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 group-hover:bg-primary/5">
                           {tenant?.logo_url ? (
                             <img src={tenant.logo_url} alt="Shop Logo" className="w-full h-full object-contain p-4" />
                           ) : (
                             <div className="text-center p-6">
                                <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-[10px] text-gray-400 font-medium">No logo uploaded</p>
                             </div>
                           )}
                           
                           {logoUploading && (
                             <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                             </div>
                           )}
                        </div>
                        
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleLogoUpload}
                          className="hidden"
                          accept="image/*"
                        />
                        
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-2 right-2 bg-white shadow-lg border border-gray-100 p-2.5 rounded-2xl text-primary hover:scale-110 active:scale-95 transition-all"
                        >
                           <Upload className="w-4 h-4" />
                        </button>
                        
                        {tenant?.logo_url && (
                           <button 
                            onClick={() => setTenant(prev => prev ? { ...prev, logo_url: "" } : null)}
                            className="absolute top-2 right-2 bg-white shadow-lg border border-gray-100 p-2 rounded-xl text-red-500 hover:scale-110 active:scale-95 transition-all"
                           >
                            <X className="w-3 h-3" />
                           </button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed px-1 italic">
                        Recommended: Square PNG/JPG, min 400x400px. This logo will appear on your invoices and portal.
                      </p>
                   </div>

                   {/* Form Fields Section */}
                   <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><Printer className="w-3 h-3" /> {t("Business Name", "వ్యాపారం పేరు")}</label>
                          <input 
                            type="text" 
                            value={tenant?.name || ""} 
                            onChange={(e) => setTenant(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="w-full p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300" 
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {t("Address", "చిరునామా")}</label>
                          <input 
                            type="text" 
                            value={tenant?.city || ""} 
                            onChange={(e) => setTenant(prev => prev ? { ...prev, city: e.target.value } : null)}
                            className="w-full p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300" 
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><Phone className="w-3 h-3" /> {t("Contact Phone", "ఫోన్ నంబర్")}</label>
                          <input 
                            type="text" 
                            value={tenant?.phone || ""} 
                            onChange={(e) => setTenant(prev => prev ? { ...prev, phone: e.target.value } : null)}
                            className="w-full p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300" 
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><Hash className="w-3 h-3" /> {t("GST Number", "GST నంబర్")}</label>
                          <input 
                            type="text" 
                            value={tenant?.gst_number || ""} 
                            placeholder="Not Provided"
                            onChange={(e) => setTenant(prev => prev ? { ...prev, gst_number: e.target.value } : null)}
                            className="w-full p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300" 
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1"><Hash className="w-3 h-3" /> {t("Order ID Prefix", "ఆర్డర్ ID ప్రిఫిక్స్")}</label>
                          <input 
                            type="text" 
                            value={tenant?.id_prefix || ""} 
                            placeholder="e.g. AG"
                            onChange={(e) => setTenant(prev => prev ? { ...prev, id_prefix: e.target.value.toUpperCase() } : null)}
                            className="w-full p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300" 
                          />
                          <p className="text-[9px] text-gray-400 px-1 italic">{t("Used for simple order numbering (e.g. AG-001)", "సాధారణ ఆర్డర్ నంబరింగ్ కోసం ఉపయోగించబడుతుంది (ఉదా: AG-001)")}</p>
                      </div>
                      
                      <div className="md:col-span-2 bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50 mt-4">
                        <h3 className="text-[10px] font-bold text-blue-900 mb-2 uppercase tracking-widest">{t("Advance Options", "అడ్వాన్స్డ్ ఎంపికలు")}</h3>
                        <p className="text-[11px] text-blue-700/70 leading-relaxed italic">{t("Warning: Any changes made to these business details will be reflected on all new invoices and estimates generated by the system.", "హెచ్చరిక: ఈ వ్యాపార వివరాలలో చేసే ఏవైనా మార్పులు సిస్టమ్ ద్వారా రూపొందించబడిన అన్ని కొత్త ఇన్వాయిస్ మరియు ఎస్టిమేట్స్ పై కనిపిస్తాయి.")}</p>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === "subscription" && (
              <div className="p-8 space-y-8">
                 <Script src="https://checkout.razorpay.com/v1/checkout.js" />
                 <div className="border-b border-gray-100 pb-6">
                    <h2 className="text-xl font-normal text-gray-900 uppercase tracking-tighter">{t("Subscription & Usage", "సబ్‌స్క్రిప్షన్ వివరాలు")}</h2>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">{t("Manage your plan and billing", "మీ ప్లాన్ మరియు బిల్లింగ్ వివరాలు")}</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Current Plan Card */}
                    <div className="bg-primary p-8 rounded-3xl text-white shadow-xl shadow-primary/20 space-y-6">
                       <div className="space-y-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 font-normal">{t("Current Plan", "ప్రస్తుత ప్లాన్")}</p>
                          <h3 className="text-3xl font-normal italic tracking-tighter uppercase">{tenant?.subscription_tier || 'FREE'}</h3>
                       </div>
                       
                       <div className="space-y-4 pt-4">
                          <div className="flex justify-between items-end border-b border-white/10 pb-4">
                             <div className="space-y-1">
                                <p className="text-[10px] uppercase opacity-60">{t("Usage this month", "ఈ నెల వినియోగం")}</p>
                                <p className="text-xl font-normal">{tenant?.orders_this_month || 0} / {tenant?.subscription_tier === 'FREE' ? '50' : '∞'}</p>
                             </div>
                             {tenant?.subscription_tier === 'FREE' && (
                               <p className="text-[10px] bg-white/20 px-2 py-1 rounded font-normal uppercase tracking-widest leading-none">
                                  {Math.round(((tenant?.orders_this_month || 0) / 50) * 100)}%
                               </p>
                             )}
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                             <div 
                                className="h-full bg-white transition-all duration-1000" 
                                style={{ width: `${tenant?.subscription_tier === 'FREE' ? Math.min(((tenant?.orders_this_month || 0) / 50) * 100, 100) : 100}%` }}
                             />
                          </div>
                       </div>
                    </div>

                     {/* Upgrade Options */}
                     {tenant?.subscription_tier === 'FREE' ? (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
                             <div className="space-y-1">
                                <h3 className="text-lg font-normal text-gray-900 uppercase tracking-tighter">Pro Plan</h3>
                                <p className="text-[10px] text-gray-400 tracking-widest leading-relaxed">
                                   Unlimited orders & reports
                                </p>
                             </div>
                             <div className="space-y-3">
                                <div className="flex items-baseline gap-1">
                                   <span className="text-xl font-normal text-primary">₹499</span>
                                   <span className="text-[9px] text-gray-400 uppercase">/ month</span>
                                </div>
                                <button 
                                   onClick={handleUpgrade}
                                   disabled={loading}
                                   className="w-full bg-primary text-white py-3 rounded-xl font-normal uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                   {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Upgrade to Pro"}
                                </button>
                             </div>
                          </div>

                          <div className="bg-[#1e3a5f] p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col justify-between space-y-4">
                             <div className="space-y-1">
                                <h3 className="text-lg font-normal text-white uppercase tracking-tighter">Business</h3>
                                <p className="text-[10px] text-blue-200/60 tracking-widest leading-relaxed">
                                   Advanced scaling & support
                                </p>
                             </div>
                             <div className="space-y-3">
                                <div className="flex items-baseline gap-1">
                                   <span className="text-xl font-normal text-white">₹999</span>
                                   <span className="text-[9px] text-blue-200/40 uppercase">/ month</span>
                                </div>
                                <button 
                                   onClick={() => alert("Business plan upgrade via sales. Please contact support.")}
                                   className="w-full bg-white text-primary py-3 rounded-xl font-normal uppercase tracking-widest text-[10px] shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                   Contact Support
                                </button>
                             </div>
                          </div>
                       </div>
                    ) : (
                      <div className="bg-green-50 p-8 rounded-3xl border border-green-100 flex flex-col items-center justify-center text-center space-y-4">
                         <div className="p-4 bg-green-500 rounded-full text-white">
                            <Save className="w-8 h-8" />
                         </div>
                         <h3 className="text-lg font-normal text-green-900 uppercase tracking-tight">{t("You are on Pro Plan", "మీరు ప్రో ప్లాన్ లో ఉన్నారు")}</h3>
                         <p className="text-xs text-green-600 tracking-widest">{t("Next billing: ", "తదుపరి బిల్లింగ్: ")} {tenant?.subscription_end_date ? formatDate(tenant.subscription_end_date) : 'N/A'}</p>
                      </div>
                    )}
                 </div>
              </div>
            )}

            {activeTab === "team" && (
              <div className="p-8 space-y-8">
                 <div className="border-b border-gray-100 pb-6">
                    <h2 className="text-xl font-normal text-gray-900 uppercase tracking-tighter">{t("Team Management", "టీమ్ మేనేజ్‌మెంట్")}</h2>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">{t("Manage your team members and their permissions", "మీ టీమ్ సభ్యులు మరియు వారి అనుమతులను నిర్వహించండి")}</p>
                 </div>

                 <div className="space-y-6">
                    {/* Current User (Tenant Admin) */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                             <div className="bg-blue-500 p-3 rounded-full text-white">
                                <Crown className="w-6 h-6" />
                             </div>
                             <div>
                                <h3 className="font-normal text-gray-900">{t("Tenant Admin", "టెనంట్ అడ్మిన్")}</h3>
                                <p className="text-sm text-gray-600">{t("You have full access to all business settings", "మీకు అన్ని వ్యాపార సెట్టింగ్‌లకు పూర్తి ప్రాప్యం ఉంది")}</p>
                             </div>
                          </div>
                          <div className="bg-blue-100 px-3 py-1 rounded-full">
                             <span className="text-xs font-normal text-blue-800">{t("OWNER", "యజమాని")}</span>
                          </div>
                       </div>
                    </div>

                    {/* Add Team Members Section */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200">
                       <div className="flex items-center justify-between mb-4">
                          <h3 className="font-normal text-gray-900">{t("Team Members", "టీమ్ సభ్యులు")}</h3>
                          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                             {t("Add Member", "సభ్యుడిని జోడించండి")}
                          </button>
                       </div>
                       
                       <div className="text-center py-8 text-gray-500">
                          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p>{t("No additional team members yet", "ఇంకా అదనపు టీమ్ సభ్యులు లేరు")}</p>
                          <p className="text-sm text-gray-400 mt-2">{t("Add team members to help manage your printing business", "మీ ప్రింటింగ్ వ్యాపారాన్ని నిర్వహించడంలో సహాయం చేయడానికి టీమ్ సభ్యులను జోడించండి")}</p>
                       </div>
                    </div>

                    {/* Role Permissions Info */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200">
                       <h3 className="font-normal text-gray-900 mb-4">{t("Available Roles", "అందుబాటులో ఉన్న పాత్రలు")}</h3>
                       <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                             <div className="bg-blue-100 p-2 rounded-lg mt-1">
                                <Crown className="w-4 h-4 text-blue-600" />
                             </div>
                             <div className="flex-1">
                                <h4 className="font-normal text-gray-900">{t("Tenant Admin", "టెనంట్ అడ్మిన్")}</h4>
                                <p className="text-sm text-gray-600">{t("Full access to business settings, billing, and team management", "వ్యాపార సెట్టింగ్‌లు, బిల్లింగ్ మరియు టీమ్ మేనేజ్‌మెంట్‌కు పూర్తి ప్రాప్యం")}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-start space-x-3">
                             <div className="bg-green-100 p-2 rounded-lg mt-1">
                                <Shield className="w-4 h-4 text-green-600" />
                             </div>
                             <div className="flex-1">
                                <h4 className="font-normal text-gray-900">{t("Manager", "మేనేజర్")}</h4>
                                <p className="text-sm text-gray-600">{t("Can manage orders, customers, and view reports", "ఆర్డర్‌లు, కస్టమర్‌లను నిర్వహించగలరు మరియు నివేదికలను వీక్షించగలరు")}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-start space-x-3">
                             <div className="bg-gray-100 p-2 rounded-lg mt-1">
                                <User className="w-4 h-4 text-gray-600" />
                             </div>
                             <div className="flex-1">
                                <h4 className="font-normal text-gray-900">{t("Staff", "సిబ్బంది")}</h4>
                                <p className="text-sm text-gray-600">{t("Can manage orders and customers only", "ఆర్డర్‌లు మరియు కస్టమర్‌లను మాత్రమే నిర్వహించగలరు")}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === "profile" && (
               <ProfileSettings />
            )}

            {activeTab !== "business" && activeTab !== "subscription" && activeTab !== "profile" && (
               <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                  <div className="bg-gray-50 p-6 rounded-full">
                     <Settings className="w-12 h-12 text-gray-300 animate-spin-slow" />
                  </div>
                  <h2 className="text-lg  text-gray-900">{t("Module Under Development", "ఈ విభాగం ఇంకా తయారవుతోంది")}</h2>
                  <p className="text-sm text-gray-500 max-w-xs">{t("We are currently building this settings module. It will be available in the next version update.", "మేము ప్రస్తుతం ఈ సెట్టింగులను తయారు చేస్తున్నాము. ఇది తదుపరి వెర్షన్ లో అందుబాటులో ఉంటుంది.")}</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
