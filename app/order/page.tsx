"use client";

import { useState } from "react";
import { 
  Printer, 
  Send, 
  User, 
  Layout, 
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { PRESS_CONFIG } from "@/lib/config";
import { createOrder } from "@/lib/supabase/actions";

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

export default function PublicOrderPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Direct call to action (simplified for public use)
      const data = {
        ...formData,
        totalAmount: 0, // Admin will update later
        advancePaid: 0,
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-green-100 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full text-green-600 mb-4 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl  text-gray-900 uppercase">Received / అందుకున్నాము!</h1>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="text-xs  text-gray-400 uppercase mb-1">Order Reference</p>
            <p className="text-lg  text-primary">#{orderId.substring(0, 8).toUpperCase()}</p>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Hi <strong>{formData.customerName}</strong>, we have received your request for <strong>{formData.jobType}</strong>. 
            We will call you on <strong>{formData.phone}</strong> shortly to confirm the price and details.
          </p>
          <div className="pt-6">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-primary  hover:underline"
            >
              Back to Home / హోమ్ పేజీ
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Public Header */}
      <header className="bg-primary text-white py-8 px-4 text-center shadow-lg">
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <Printer className="w-6 h-6 text-orange" />
            <h1 className="text-2xl  tracking-tight">{PRESS_CONFIG.name}</h1>
          </div>
          <h2 className="text-xl ">New Order Request / కొత్త ఆర్డర్ రిక్వెస్ట్</h2>
          <p className="text-white/60 text-sm">Chirala&apos;s Trusted Printing Partner</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {/* Customer Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                <User className="w-4 h-4 text-primary" />
                <h3 className="text-xs  text-gray-400 uppercase tracking-widest">Customer / కస్టమర్</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs  text-gray-700">Name / పేరు</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-gray-700">Phone / ఫోన్</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Your mobile number"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                <Layout className="w-4 h-4 text-primary" />
                <h3 className="text-xs  text-gray-400 uppercase tracking-widest">Job Details / పని వివరాలు</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs  text-gray-700">What do you want to print? / ఏం ప్రింట్ చేయాలి?</label>
                  <select
                    value={formData.jobType}
                    onChange={(e) => setFormData({...formData, jobType: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                  >
                    {jobTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-xs  text-gray-700">Quantity / పరిమాణం</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs  text-gray-700">Size / సైజు (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. A4, 10x12"
                      value={formData.size}
                      onChange={(e) => setFormData({...formData, size: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-gray-700">Design File / డిర్డ్ ప్ర్ (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.ai,.psd,.eps,.svg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({...formData, designFile: file});
                        console.log('Design file uploaded:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-gray-700">Instructions / సూచనలు (Optional)</label>
                  <textarea
                    rows={3}
                    value={formData.instructions}
                    onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                    placeholder="Tell us more about the paper, colors, etc."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-orange text-white text-lg  uppercase tracking-widest rounded-xl shadow-xl shadow-orange/20 hover:bg-orange/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Order / పంపండి
                </>
              )}
            </button>
          </div>
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex items-center justify-center gap-2">
            <span className="text-[10px] text-gray-400  uppercase">Located at Chirala, AP</span>
          </div>
        </form>
      </main>
    </div>
  );
}
