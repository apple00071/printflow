import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Eye, FileText, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the PrintFlow Privacy Policy, details on Google OAuth, and how we protect your print shop data.",
};

export default function PrivacyPolicy() {
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
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold uppercase tracking-tighter">PrintFlow Privacy</span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-20 space-y-16">
        <header className="space-y-4">
          <h1 className="text-5xl font-black tracking-tight text-gray-900 uppercase italic">Privacy Policy</h1>
          <p className="text-gray-400 text-sm font-medium uppercase tracking-[0.2em]">Last Updated: May 15, 2026</p>
        </header>

        <section className="prose prose-slate max-w-none space-y-12">
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-3 text-gray-900 uppercase tracking-wide">
              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                <Eye className="w-4 h-4" />
              </div>
              1. Information We Collect
            </h2>
            <p className="text-gray-600 leading-relaxed">
              PrintFlow collects information that you provide directly to us when you create an account, create an order, or communicate with us. This includes your name, business name, phone number, and email address.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-3 text-gray-900 uppercase tracking-wide">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                <Lock className="w-4 h-4" />
              </div>
              2. Google OAuth & Gmail Integration
            </h2>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
              <p className="text-sm text-gray-700 font-medium">
                Our application uses Google OAuth to provide Gmail integration features. To protect your data, we strictly adhere to the following:
              </p>
              <ul className="list-none space-y-3">
                {[
                  "We only access emails that are relevant to printing orders based on specific keywords and patterns.",
                  "We do not store your full inbox. We only process and store data related to specific order imports.",
                  "We do not share any data obtained through Google OAuth with third-party tools or for advertising purposes.",
                  "You can revoke access to your Gmail account at any time through the PrintFlow settings or your Google Account security settings."
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-xs text-gray-500">
                    <span className="text-primary font-bold">●</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-gray-400 italic">
                PrintFlow's use and transfer to any other app of information received from Google APIs will adhere to Google API Service User Data Policy, including the Limited Use requirements.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-3 text-gray-900 uppercase tracking-wide">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                <FileText className="w-4 h-4" />
              </div>
              3. How We Use Your Information
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We use the information we collect to provide, maintain, and improve our services, including processing orders, sending notifications via WhatsApp or email, and managing your business preferences.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">4. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">5. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at support@printflow.in
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-20 bg-gray-50/50">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">© 2026 PrintFlow Technologies. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-300">
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="text-primary">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
