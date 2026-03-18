"use client";

import { 
  Settings, 
  User, 
  MapPin, 
  Phone, 
  Hash, 
  Printer, 
  Save,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";

import { useLanguage } from "@/lib/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import Script from "next/script";

export default function SettingsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("business");

  const tabs = [
    { id: "business", label: t("Business Details", "బిజినెస్ వివరాలు"), icon: Settings },
    { id: "subscription", label: t("Subscription", "సబ్‌స్క్రిప్షన్"), icon: Hash },
    { id: "profile", label: t("My Profile", "నా ప్రొఫైల్"), icon: User },
    { id: "print", label: t("Printing Config", "ప్రింటింగ్ కాన్ఫిగ్"), icon: Printer },
  ];

  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tenant, setTenant] = useState<any>(null); // Keeping any for now but could be Tenant type

  useEffect(() => {
    async function fetchSettings() {
      const supabase = createClient();
      const currentTenant = await getCurrentTenant(supabase);
      setTenant(currentTenant);
    }
    fetchSettings();
  }, []);

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
    } catch (err) {
      console.error(err);
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
            {activeTab === "business" && (
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                  <h2 className="text-xl  text-gray-900">{t("Business Details", "బిజినెస్ వివరాలు")}</h2>
                  <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2  hover:opacity-90 transition-all">
                     <Save className="w-4 h-4" /> {t("Save Changes", "మారపులను సేవ్ చేయండి")}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-xs  text-gray-500 uppercase flex items-center gap-1"><Printer className="w-3 h-3" /> {t("Business Name", "వ్యాపారం పేరు")}</label>
                      <input type="text" defaultValue={tenant?.name} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs  text-gray-500 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> {t("Address", "చిరునామా")}</label>
                      <input type="text" defaultValue={tenant?.city} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs  text-gray-500 uppercase flex items-center gap-1"><Phone className="w-3 h-3" /> {t("Contact Phone", "ఫోన్ నంబర్")}</label>
                      <input type="text" defaultValue={tenant?.phone} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs  text-gray-500 uppercase flex items-center gap-1"><Hash className="w-3 h-3" /> {t("GST Number", "GST నంబర్")}</label>
                      <input type="text" defaultValue={tenant?.gst_number || "Not Provided"} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" />
                   </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200">
                    <h3 className="text-sm  text-gray-900 mb-2">{t("Advance Options", "అడ్వాన్స్డ్ ఎంపికలు")}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">{t("Warning: Any changes made to these business details will be reflected on all new invoices and estimates generated by the system.", "హెచ్చరిక: ఈ వ్యాపార వివరాలలో చేసే ఏవైనా మార్పులు సిస్టమ్ ద్వారా రూపొందించబడిన అన్ని కొత్త ఇన్వాయిస్ మరియు ఎస్టిమేట్స్ పై కనిపిస్తాయి.")}</p>
                </div>
              </div>
            )}

            {activeTab === "subscription" && (
              <div className="p-8 space-y-8">
                 <Script src="https://checkout.razorpay.com/v1/checkout.js" />
                 <div className="border-b border-gray-100 pb-6">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{t("Subscription & Usage", "సబ్‌స్క్రిప్షన్ వివరాలు")}</h2>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">{t("Manage your plan and billing", "మీ ప్లాన్ మరియు బిల్లింగ్ వివరాలు")}</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Current Plan Card */}
                    <div className="bg-primary p-8 rounded-3xl text-white shadow-xl shadow-primary/20 space-y-6">
                       <div className="space-y-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 font-bold">{t("Current Plan", "ప్రస్తుత ప్లాన్")}</p>
                          <h3 className="text-3xl font-black italic tracking-tighter uppercase">{tenant?.plan || 'FREE'}</h3>
                       </div>
                       
                       <div className="space-y-4 pt-4">
                          <div className="flex justify-between items-end border-b border-white/10 pb-4">
                             <div className="space-y-1">
                                <p className="text-[10px] uppercase opacity-60">{t("Usage this month", "ఈ నెల వినియోగం")}</p>
                                <p className="text-xl font-bold">{tenant?.orders_this_month || 0} / {tenant?.plan === 'FREE' ? '50' : '∞'}</p>
                             </div>
                             {tenant?.plan === 'FREE' && (
                               <p className="text-[10px] bg-white/20 px-2 py-1 rounded font-bold uppercase tracking-widest leading-none">
                                  {Math.round(((tenant?.orders_this_month || 0) / 50) * 100)}%
                               </p>
                             )}
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                             <div 
                                className="h-full bg-white transition-all duration-1000" 
                                style={{ width: `${tenant?.plan === 'FREE' ? Math.min(((tenant?.orders_this_month || 0) / 50) * 100, 100) : 100}%` }}
                             />
                          </div>
                       </div>
                    </div>

                    {/* Upgrade Options */}
                    {tenant?.plan === 'FREE' ? (
                      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-6">
                         <div className="space-y-2">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{t("Unlock Pro", "ప్రీమియం పొందండి")}</h3>
                            <p className="text-xs text-gray-400 tracking-widest leading-relaxed">
                               {t("Get unlimited orders, professional GST reports, and advanced analytics.", "అపరిమిత ఆర్డర్లు మరియు అడ్వాన్స్డ్ ఫీచర్స్ కోసం అప్‌గ్రేడ్ చేయండి.")}
                            </p>
                         </div>
                         <div className="space-y-4">
                            <div className="flex items-baseline gap-1">
                               <span className="text-2xl font-black">₹999</span>
                               <span className="text-[10px] text-gray-400 uppercase">/ {t("Month", "నెల")}</span>
                            </div>
                            <button 
                               onClick={handleUpgrade}
                               disabled={loading}
                               className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                               {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t("Upgrade Now", "ఇప్పుడే అప్‌గ్రేడ్ చేయండి")}
                            </button>
                         </div>
                      </div>
                    ) : (
                      <div className="bg-green-50 p-8 rounded-3xl border border-green-100 flex flex-col items-center justify-center text-center space-y-4">
                         <div className="p-4 bg-green-500 rounded-full text-white">
                            <Save className="w-8 h-8" />
                         </div>
                         <h3 className="text-lg font-bold text-green-900 uppercase tracking-tight">{t("You are on Pro Plan", "మీరు ప్రో ప్లాన్ లో ఉన్నారు")}</h3>
                         <p className="text-xs text-green-600 tracking-widest">{t("Next billing: ", "తదుపరి బిల్లింగ్: ")} {tenant?.subscription_end_date ? new Date(tenant.subscription_end_date).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    )}
                 </div>
              </div>
            )}

            {activeTab !== "business" && (
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
