"use client";

import { useState } from "react";
import { 
  Calculator, 
  ArrowLeft, 
  Info, 
  IndianRupee,
  ChevronRight,
  TrendingUp,
  Tag
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";

const jobCategories = [
  { id: "visiting-cards", name: "Visiting Cards", telugu: "విజిటింగ్ కార్డ్స్", basePrice: 2, minQty: 100 },
  { id: "banners", name: "Banners", telugu: "బ్యానర్లు", basePrice: 15, minQty: 1, unit: "sq.ft" },
  { id: "wedding-cards", name: "Wedding Cards", telugu: "పెళ్లి శుభలేఖలు", basePrice: 25, minQty: 50 },
  { id: "pamphlets", name: "Pamphlets", telugu: "పాంప్లెట్స్", basePrice: 1.5, minQty: 1000 },
];

export default function PriceEstimatorPage() {
  const [selectedJob, setSelectedJob] = useState(jobCategories[0]);
  const [quantity, setQuantity] = useState(jobCategories[0].minQty);

  const estimate = (selectedJob.basePrice * quantity) * 1.1; // adding a small 10% buffer
  const rangeMin = Math.floor(estimate * 0.9);
  const rangeMax = Math.ceil(estimate * 1.1);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 py-6 px-4 drop-shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <h1 className="text-xl  text-primary uppercase tracking-tight">Price Estimator / ధర అంచనా</h1>
          </div>
          <div className="hidden sm:block">
             <Link href="/order" className="text-sm  text-orange hover:underline">Place Order / ఆర్డర్ చేయండి</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-primary" />
              <h2 className="text-sm  text-gray-400 uppercase tracking-widest">Select Job Type / పని రకం</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {jobCategories.map((job) => (
                <button
                  key={job.id}
                  onClick={() => {
                    setSelectedJob(job);
                    setQuantity(job.minQty);
                  }}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    selectedJob.id === job.id 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                      : "bg-white text-gray-600 border-gray-100 hover:border-primary/20 hover:bg-gray-50/50"
                  )}
                >
                  <p className="text-sm ">{job.name}</p>
                  <p className="text-[10px] opacity-60 ">{job.telugu}</p>
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <div className="flex items-center justify-between">
                <label className="text-xs  text-gray-500 uppercase">Quantity / పరిమాణం</label>
                <span className="text-xs  text-primary px-2 py-1 bg-primary/10 rounded-lg">Min: {selectedJob.minQty}</span>
              </div>
              <input
                type="number"
                min={selectedJob.minQty}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg  outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-700">
                <Info className="w-4 h-4 flex-shrink-0" />
                <p className="text-[10px] leading-relaxed">
                  Prices are based on standard material. Custom sizes and premium paper will affect the final cost.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="flex flex-col gap-6">
          <div className="bg-primary text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-orange/20 rounded-full blur-3xl group-hover:bg-orange/30 transition-all duration-700" />
            
            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange" />
                <h3 className="text-xs  uppercase tracking-[0.2em] text-white/60">Estimated Range / అంచనా ధర</h3>
              </div>
              <div className="space-y-1">
                <p className="text-4xl lg:text-5xl  tracking-tight flex items-baseline gap-1">
                  <span className="text-2xl text-orange">₹</span> 
                  {formatCurrency(rangeMin).replace("₹", "")} - {formatCurrency(rangeMax).replace("₹", "")}
                </p>
                <p className="text-white/40 text-[10px]  uppercase tracking-widest pl-1">Final price confirmed on call</p>
              </div>
              <div className="pt-8 space-y-3">
                <div className="flex justify-between items-center text-xs  text-white/50 border-b border-white/10 pb-2">
                  <span>Base Cost / ప్రాథమిక ధర</span>
                   <span>{formatCurrency(selectedJob.basePrice * quantity)}</span>
                </div>
                <div className="flex justify-between items-center text-xs  text-white/50">
                  <span>Includes / ఇందులో ఉన్నవి</span>
                  <span className="text-white/80">Design + Standard Print</span>
                </div>
              </div>
            </div>
          </div>

          <Link href="/order" className="group flex items-center justify-between p-6 bg-white border border-orange/20 rounded-2xl shadow-sm hover:shadow-md hover:border-orange transition-all">
            <div>
              <p className="text-xs  text-orange uppercase tracking-widest mb-1">Happy with this? / సరేనా?</p>
              <h4 className="text-lg  text-gray-900">Proceed to Order / ఆర్డర్ చేయండి</h4>
            </div>
            <div className="w-12 h-12 bg-orange text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <ChevronRight className="w-6 h-6" />
            </div>
          </Link>

          <div className="bg-white p-6 rounded-2xl border border-gray-100">
             <div className="flex items-center gap-2 mb-4">
               <Tag className="w-4 h-4 text-primary" />
               <h4 className="text-xs  text-gray-400 uppercase tracking-widest">Pricing Policy</h4>
             </div>
             <ul className="space-y-2">
                {["50% advance for all orders", "Bulk discounts for 5000+ qty", "GST extra where applicable"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-1 h-1 bg-primary rounded-full" />
                    {item}
                  </li>
                ))}
             </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
