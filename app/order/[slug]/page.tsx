"use client";

import { useState, useEffect } from "react";
import { 
  Printer, 
  Send, 
  User, 
  Layout, 
  CheckCircle2,
  ArrowRight,
  Loader2,
  Building2,
  MapPin,
  Phone
} from "lucide-react";
import Link from "next/link";
import { createOrder } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { getTenantBySlug } from "@/lib/tenant";

const jobTypes = [
  "Business Cards / విజిటింగ్ కార్డ్స్",
  "Banners / బ్యానర్లు",
  "Letterheads / లెటర్ హెడ్స్",
  "Wedding Cards / పెళ్లి శుభలేఖలు",
  "Pamphlets / పాంప్లెట్స్",
  "Stickers / స్టిక్కర్లు",
  "Flex Prints / ఫ్లెక్స్ ప్రింట్స్",
  "Other / ఇతరమైనవి",
];

interface Tenant {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
}

export default function TenantPublicOrderPage({ params }: { params: { slug: string } }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [fetchingTenant, setFetchingTenant] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    jobType: "Business Cards / విజిటింగ్ కార్డ్స్",
    quantity: 1,
    size: "",
    instructions: "",
    designFile: null as File | null,
  });

  useEffect(() => {
    async function loadTenant() {
      const supabase = createClient();
      const data = await getTenantBySlug(supabase, params.slug);
      setTenant(data);
      setFetchingTenant(false);
    }
    loadTenant();
  }, [params.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);

    try {
      const data = {
        ...formData,
        totalAmount: 0,
        advancePaid: 0,
        tenantId: tenant.id
      };
      const order = await createOrder(data);
      setOrderId(order.id);
      setSubmitted(true);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Something went wrong. Please try again or call us.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingTenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 font-normal">Loading press details...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <Building2 className="w-16 h-16 text-gray-200 mb-6" />
        <h1 className="text-2xl font-normal text-gray-900 mb-2">Press Not Found</h1>
        <p className="text-gray-500 font-normal mb-8 max-w-sm">The printing press you are looking for doesn&apos;t exist or has been deactivated.</p>
        <Link 
          href="/"
          className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all font-normal shadow-sm"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="relative mx-auto w-24 h-24 mb-4">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
            <div className="relative flex items-center justify-center w-full h-full bg-green-50 rounded-full text-green-600">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-normal text-gray-900 tracking-tight">Order Received!</h1>
            <p className="text-sm text-gray-500 font-normal italic">అందుకున్నాము!</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-1">
            <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest leading-none">Order Reference</p>
            <p className="text-2xl font-normal text-blue-600 tracking-tight">#{orderId.substring(0, 8).toUpperCase()}</p>
          </div>

          <p className="text-gray-600 text-sm leading-relaxed font-normal">
            Hi <strong>{formData.customerName}</strong>, we have received your request for <strong>{formData.jobType}</strong>. 
            We will call you on <strong>{formData.phone}</strong> shortly to confirm the price and details.
          </p>

          <div className="pt-4 border-t border-gray-50">
            <Link 
              href={`/order/${params.slug}`}
              onClick={() => setSubmitted(false)}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors py-2 px-4 rounded-xl hover:bg-blue-50 font-normal text-sm"
            >
              Place Another Order
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Branded Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-normal text-gray-900 tracking-tight leading-none mb-1">{tenant.name}</h1>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest">
                <MapPin className="w-2.5 h-2.5" />
                <span>{tenant.city}, {tenant.state}</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 font-normal bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <Phone className="w-3 h-3 text-blue-600" />
              <span>{tenant.phone || "Contact Press"}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-10">
        <div className="mb-8 text-center space-y-2">
          <h2 className="text-2xl font-normal text-gray-900 tracking-tight">New Order Request</h2>
          <p className="text-sm text-gray-500 font-normal italic">కొత్త ఆర్డర్ రిక్వెస్ట్</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden">
          <div className="p-6 md:p-10 space-y-8">
            {/* Customer Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                <User className="w-4 h-4 text-blue-600" />
                <h3 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest leading-none">Customer / కస్టమర్</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-normal text-gray-400 uppercase tracking-widest ml-1">Name / పేరు</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 outline-none transition-all font-normal text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-normal text-gray-400 uppercase tracking-widest ml-1">Phone / ఫోన్</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Your mobile number"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 outline-none transition-all font-normal text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                <Layout className="w-4 h-4 text-blue-600" />
                <h3 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest leading-none">Job Details / పని వివరాలు</h3>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-normal text-gray-400 uppercase tracking-widest ml-1">Job Type / పని రకం</label>
                  <select
                    value={formData.jobType}
                    onChange={(e) => setFormData({...formData, jobType: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none appearance-none font-normal text-sm"
                  >
                    {jobTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-[10px] font-normal text-gray-400 uppercase tracking-widest ml-1">Quantity / పరిమాణం</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none font-normal text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-normal text-gray-400 uppercase tracking-widest ml-1">Size / సైజు (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. A4, 10x12"
                      value={formData.size}
                      onChange={(e) => setFormData({...formData, size: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none font-normal text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-normal text-gray-400 uppercase tracking-widest ml-1">Instructions / సూచనలు (Optional)</label>
                  <textarea
                    rows={3}
                    value={formData.instructions}
                    onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                    placeholder="Tell us more about the paper, colors, etc."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 outline-none resize-none transition-all font-normal text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white text-base font-normal uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Order / పంపండి
                </>
              )}
            </button>
          </div>
          <div className="bg-gray-50/50 px-8 py-5 border-t border-gray-50 flex flex-col items-center justify-center gap-1.5">
            <p className="text-[10px] text-gray-400 font-normal uppercase tracking-[0.2em] leading-none">Powered by PrintFlow</p>
          </div>
        </form>
      </main>
    </div>
  );
}
