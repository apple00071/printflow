import type { Metadata } from "next";
import Link from "next/link";
import { Scale, CheckCircle2, AlertCircle, HelpCircle, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Terms of Service for using PrintFlow to manage your printing business.",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-primary/10">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-widest">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold uppercase tracking-tighter">PrintFlow Terms</span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-20 space-y-16">
        <header className="space-y-4">
          <h1 className="text-5xl font-black tracking-tight text-gray-900 uppercase italic">Terms of Service</h1>
          <p className="text-gray-400 text-sm font-medium uppercase tracking-[0.2em]">Last Updated: May 15, 2026</p>
        </header>

        <section className="prose prose-slate max-w-none space-y-12">
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-3 text-gray-900 uppercase tracking-wide">
              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using PrintFlow, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the application.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">2. Use of the Service</h2>
            <p className="text-gray-600 leading-relaxed">
              PrintFlow is a software-as-a-service platform designed for printing business management. You are responsible for maintaining the security of your account and for all activities that occur under your account.
            </p>
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-2">
              <p className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-3 h-3" /> Prohibited Use
              </p>
              <p className="text-xs text-blue-700 leading-relaxed">
                You may not use the service for any illegal or unauthorized purpose. You must not, in the use of the service, violate any laws in your jurisdiction.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">3. Subscription and Payments</h2>
            <p className="text-gray-600 leading-relaxed">
              Certain features of the service may require payment of fees. You agree to pay all applicable fees in connection with your use of the service. Fees are non-refundable except as required by law.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">4. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed italic">
              In no event shall PrintFlow be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, or other intangible losses.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-3 text-gray-900 uppercase tracking-wide">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
                <HelpCircle className="w-4 h-4" />
              </div>
              5. Changes to Terms
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-20 bg-gray-50/50">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">© 2026 PrintFlow Technologies. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-300">
            <Link href="/terms" className="text-primary">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
