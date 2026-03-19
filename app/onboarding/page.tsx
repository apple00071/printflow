"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateGSTIN, getStateFromGSTIN, GST_STATE_CODES } from "@/lib/gst";
import { getCurrentTenant } from "@/lib/tenant";

// STEPS removed as it was unused

const COMMON_JOB_TYPES = [
  { label: "Business Cards", hsn: "4901", price: 250 },
  { label: "Flex Banners", hsn: "4911", price: 50 },
  { label: "Stickers", hsn: "4821", price: 10 },
  { label: "Wedding Cards", hsn: "4909", price: 500 },
  { label: "Letterheads", hsn: "4901", price: 300 }
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  interface Tenant {
    id: string;
    name: string;
    phone?: string;
    state?: string;
  }
  const [tenant, setTenant] = useState<Tenant | null>(null);
  
  const [formData, setFormData] = useState({
    business_type: "",
    state: "",
    phone: "",
    upi_id: "",
    bank_details: "",
    gst_number: "",
    is_gst_registered: false,
    job_types: COMMON_JOB_TYPES.map(jt => ({ ...jt, selected: true }))
  });

  useEffect(() => {
    async function loadTenant() {
      const t = await getCurrentTenant(supabase);
      if (t) {
        setTenant(t);
        setFormData(prev => ({
          ...prev,
          phone: t.phone || "",
          state: t.state || ""
        }));
      }
    }
    loadTenant();
  }, [supabase]);

  const handleNext = async () => {
    if (step === 4) {
      await completeOnboarding();
      return;
    }
    setStep(s => s + 1);
  };

  const uploadLogo = async (file: File) => {
    if (!tenant) return;
    const ext = file.name.split(".").pop();
    const path = `${tenant.id}/logo.${ext}`;
    
    const { error } = await supabase.storage
      .from("printflow-files")
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("printflow-files")
      .getPublicUrl(path);

    await supabase
      .from("tenants")
      .update({ logo_url: publicUrl })
      .eq("id", tenant.id);
  };

  const completeOnboarding = async () => {
    setLoading(true);
    if (!tenant) return;
    try {
      // 1. Update Tenant
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          business_type: formData.business_type,
          state: formData.state,
          phone: formData.phone,
          upi_id: formData.upi_id,
          bank_details: formData.bank_details,
          gst_number: formData.is_gst_registered ? formData.gst_number : null,
          gst_state: formData.is_gst_registered ? formData.gst_number.substring(0, 2) : null,
          gst_state_name: formData.is_gst_registered ? getStateFromGSTIN(formData.gst_number) : null,
          onboarding_complete: true
        })
        .eq("id", tenant.id);

      if (tenantError) throw tenantError;

      // 2. Insert Job Types
      const selectedJobs = formData.job_types.filter(j => j.selected);
      if (selectedJobs.length > 0) {
        await supabase
          .from("price_table")
          .insert(selectedJobs.map(j => ({
            job_type: j.label,
            price_per_unit: j.price,
            min_qty: 1,
            max_qty: 100000,
            tenant_id: tenant.id
          })));
      }

      // 3. Insert Default GST Rates if registered
      if (formData.is_gst_registered) {
        await supabase
          .from("gst_rates")
          .insert([
            { tenant_id: tenant.id, label: "GST 5%", rate: 5 },
            { tenant_id: tenant.id, label: "GST 12%", rate: 12 },
            { tenant_id: tenant.id, label: "GST 18%", rate: 18, is_default: true },
            { tenant_id: tenant.id, label: "GST 28%", rate: 28 }
          ]);
      }

      router.push("/dashboard");
    } catch {
      console.error("Error completing onboarding");
      alert("Error completing onboarding");
    } finally {
      setLoading(false);
    }
  };

  if (!tenant) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        
        {/* Progress Bar */}
        <div className="bg-gray-50/50 border-b border-gray-100 px-8 py-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Welcome to PrintFlow</h1>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Step {step} of 4</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? "bg-primary" : "bg-gray-200"}`}
              />
            ))}
          </div>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 leading-tight">Tell us about your business</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Business Type</label>
                  <select 
                    value={formData.business_type} 
                    onChange={e => setFormData({...formData, business_type: e.target.value})}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="">Select Type</option>
                    <option value="Offset Printing">Offset Printing</option>
                    <option value="Digital Printing">Digital Printing</option>
                    <option value="Flex & Signage">Flex & Signage</option>
                    <option value="Screen Printing">Screen Printing</option>
                    <option value="Packaging">Packaging</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">State</label>
                  <select 
                    value={formData.state} 
                    onChange={e => setFormData({...formData, state: e.target.value})}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="">Select State</option>
                    {Object.entries(GST_STATE_CODES).map(([code, name]) => (
                      <option key={code} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="10 digit mobile number"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 leading-tight">Branding & Payments</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Business Logo</label>
                  <input 
                    type="file" 
                    onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">UPI ID for Payments</label>
                  <input 
                    value={formData.upi_id}
                    onChange={e => setFormData({...formData, upi_id: e.target.value})}
                    placeholder="yourname@upi"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Bank Details (Optional)</label>
                  <textarea 
                    value={formData.bank_details}
                    onChange={e => setFormData({...formData, bank_details: e.target.value})}
                    placeholder="Bank Name, A/C No, IFSC"
                    className="w-full h-24 rounded-xl border border-gray-200 px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 leading-tight">GST Setup</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <input 
                    type="checkbox" 
                    id="gst_reg"
                    checked={formData.is_gst_registered}
                    onChange={e => setFormData({...formData, is_gst_registered: e.target.checked})}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="gst_reg" className="text-sm font-medium text-gray-700">I am GST registered</label>
                </div>
                
                {formData.is_gst_registered && (
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">GSTIN</label>
                    <input 
                      value={formData.gst_number}
                      onChange={e => setFormData({...formData, gst_number: e.target.value.toUpperCase()})}
                      onBlur={() => {
                        if (formData.gst_number && !validateGSTIN(formData.gst_number)) {
                          alert("Invalid GSTIN format");
                        }
                      }}
                      placeholder="22AAAAA0000A1Z5"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                    <p className="mt-2 text-[10px] text-gray-400 italic">We&apos;ll automatically set your default tax rates: 5%, 12%, 18%, 28%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 leading-tight">Products & Pricing</h2>
              <div className="space-y-3">
                {formData.job_types.map((jt, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-primary/20 transition-all">
                    <input 
                      type="checkbox"
                      checked={jt.selected}
                      onChange={e => {
                        const newJobs = [...formData.job_types];
                        newJobs[idx].selected = e.target.checked;
                        setFormData({...formData, job_types: newJobs});
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{jt.label}</p>
                      <p className="text-[10px] text-gray-400">HSN: {jt.hsn}</p>
                    </div>
                    <div className="w-24">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                        <input 
                          type="number"
                          value={jt.price}
                          onChange={e => {
                            const newJobs = [...formData.job_types];
                            newJobs[idx].price = Number(e.target.value);
                            setFormData({...formData, job_types: newJobs});
                          }}
                          className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
          <button 
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1 || loading}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 disabled:opacity-0 transition-all"
          >
            Previous
          </button>
          <button 
            onClick={handleNext}
            disabled={loading}
            className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? "Saving..." : (step === 4 ? "Complete Setup" : "Continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
