"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, Check, ArrowRight, Star, Quote, MessageCircle, FileText, Users, Package, Globe, BarChart } from "lucide-react";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [counters, setCounters] = useState({ shops: 0, orders: 0, years: 0 });
  
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Animate counters
            animateCounter('shops', 1200, 2000);
            animateCounter('orders', 50000, 2500);
            animateCounter('years', 3, 1500);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const animateCounter = (key: string, target: number, duration: number) => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        start = target;
        clearInterval(timer);
      }
      setCounters(prev => ({ ...prev, [key]: Math.floor(start) }));
    }, 16);
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Google Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'DM Sans', sans-serif;
        }
        
        .font-syne {
          font-family: 'Syne', sans-serif;
        }
        
        .animate-fade-up {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .animate-fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        
        .floating {
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .dot-grid {
          background-image: radial-gradient(circle, #e5e7eb 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full bg-white border-b border-gray-200 z-50 transition-all ${scrollY > 10 ? 'shadow-sm' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <span className="text-2xl font-bold font-syne">
                <span className="text-[#1e3a5f]">Print</span>
                <span className="text-[#f97316]">Flow</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">Pricing</a>
              <a href="#why-us" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">Why Us</a>
              <Link href="/login" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">Login</Link>
              <Link href="/signup" className="bg-[#f97316] text-white px-6 py-2 rounded-lg hover:bg-[#ea580c] transition-colors">
                Start Free
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col space-y-3">
                <a href="#features" className="text-gray-600 hover:text-[#1e3a5f] py-2">Features</a>
                <a href="#pricing" className="text-gray-600 hover:text-[#1e3a5f] py-2">Pricing</a>
                <a href="#why-us" className="text-gray-600 hover:text-[#1e3a5f] py-2">Why Us</a>
                <Link href="/login" className="text-gray-600 hover:text-[#1e3a5f] py-2">Login</Link>
                <Link href="/signup" className="bg-[#f97316] text-white px-6 py-2 rounded-lg hover:bg-[#ea580c] transition-colors text-center">
                  Start Free
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 dot-grid">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-syne leading-tight mb-4">
                <span className="text-[#1e3a5f]">Your Print Shop Deserves</span><br />
                <span className="text-[#f97316]">Better Than WhatsApp Notes</span>
              </h1>
              
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                PrintFlow helps small printing businesses in India track orders, generate GST invoices, manage customers, and grow — all from your phone. Free to start.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Link href="/signup" className="bg-[#f97316] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#ea580c] transition-colors flex items-center justify-center">
                  Start Free — No Credit Card
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <button 
                  onClick={scrollToFeatures}
                  className="border-2 border-[#1e3a5f] text-[#1e3a5f] px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#1e3a5f] hover:text-white transition-colors"
                >
                  See How It Works
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-600">Free forever</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-600">GST invoices</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-600">Setup in 5 minutes</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-600">Works on any phone</span>
                </div>
              </div>
            </div>
            
            {/* Phone Mockup */}
            <div className="relative floating">
              <div className="bg-gray-900 rounded-[3rem] p-2 max-w-sm mx-auto">
                <div className="bg-white rounded-[2.5rem] p-4">
                  {/* Phone Status Bar */}
                  <div className="flex justify-between items-center mb-4 text-xs">
                    <span className="font-semibold">9:41</span>
                    <div className="flex space-x-1">
                      <div className="w-4 h-3 bg-gray-800 rounded-sm"></div>
                      <div className="w-4 h-3 bg-gray-800 rounded-sm"></div>
                      <div className="w-4 h-3 bg-gray-800 rounded-sm"></div>
                    </div>
                  </div>
                  
                  {/* App Header */}
                  <div className="bg-[#1e3a5f] text-white p-3 rounded-lg mb-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">PrintFlow</span>
                      <span className="text-xs">🇮🇳</span>
                    </div>
                  </div>
                  
                  {/* Order List */}
                  <div className="space-y-2">
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">Visiting Cards</p>
                          <p className="text-xs text-gray-600">Ravi Kumar • 500 pcs</p>
                        </div>
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">Ready</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-semibold">₹1,500</span>
                        <button className="bg-green-500 text-white text-xs px-3 py-1 rounded flex items-center">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          WhatsApp
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">Wedding Cards</p>
                          <p className="text-xs text-gray-600">Suresh • 200 sets</p>
                        </div>
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">Printing</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-semibold">₹5,000</span>
                        <span className="text-xs text-gray-500">Due tomorrow</span>
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">Letterheads</p>
                          <p className="text-xs text-gray-600">Anand • 1000 pcs</p>
                        </div>
                        <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">Design</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-semibold">₹800</span>
                        <span className="text-xs text-gray-500">Pending approval</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold font-syne text-center mb-12 text-[#1e3a5f]">
            Sound familiar?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border-l-4 border-[#f97316] shadow-sm hover-lift">
              <div className="text-4xl mb-4">😩</div>
              <h3 className="text-xl font-semibold mb-3 text-[#1e3a5f]">Orders lost in WhatsApp chats</h3>
              <p className="text-gray-600">
                You get 20 orders on WhatsApp. Three customers call asking where their job is. You have no idea which message to look for.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border-l-4 border-[#f97316] shadow-sm hover-lift">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-semibold mb-3 text-[#1e3a5f]">Writing invoices on paper</h3>
              <p className="text-gray-600">
                You spend 20 minutes writing each bill by hand. GST calculations are wrong sometimes. Customers want digital receipts but you can&apos;t send them.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border-l-4 border-[#f97316] shadow-sm hover-lift">
              <div className="text-4xl mb-4">💸</div>
              <h3 className="text-xl font-semibold mb-3 text-[#1e3a5f]">Customers who haven&apos;t paid</h3>
              <p className="text-gray-600">
                You finished the job. They said they&apos;ll pay later. Now you have ₹40,000 outstanding and no system to track who owes what.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-16 px-4 sm:px-6 lg:px-8 bg-[#fafaf8]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold font-syne text-center mb-4 text-[#1e3a5f]">
            Everything your print shop needs
          </h2>
          <p className="text-xl text-center text-gray-600 mb-12 max-w-3xl mx-auto">
            Built specifically for Indian printing businesses — not a generic tool adapted for you
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-[#1e3a5f]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#1e3a5f]">Order Tracking</h3>
              <p className="text-gray-600">
                Create and track every job from received to delivered. Never lose an order again.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#1e3a5f]">GST Invoices</h3>
              <p className="text-gray-600">
                Auto-generate GST-compliant invoices with CGST, SGST, and IGST. Sequential invoice numbers. Print or share instantly.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#1e3a5f]">WhatsApp Notifications</h3>
              <p className="text-gray-600">
                One tap sends your customer a message: &quot;Your order is ready. Balance due: ₹500.&quot; No typing needed.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[#f97316]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#1e3a5f]">Customer Ledger</h3>
              <p className="text-gray-600">
                See every customer&apos;s full order history and outstanding balance at a glance.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#1e3a5f]">Online Order Form</h3>
              <p className="text-gray-600">
                Share your own link — customers fill their order details and upload files. It lands directly in your dashboard.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#1e3a5f]">Business Dashboard</h3>
              <p className="text-gray-600">
                Today&apos;s orders, this month&apos;s revenue, pending jobs, top customers. Your business at a glance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#1e3a5f] text-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold font-syne text-center mb-12">
            Up and running in 5 minutes
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white text-[#1e3a5f] rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Sign up free</h3>
              <p className="text-gray-300">
                Enter your business name and email. No credit card. No demo call needed.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white text-[#1e3a5f] rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Set up your shop</h3>
              <p className="text-gray-300">
                Add your job types, prices, GST number, and UPI ID. Takes 3 minutes.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white text-[#1e3a5f] rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Start managing orders</h3>
              <p className="text-gray-300">
                Create your first order and share your online order form link with customers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GST Callout */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8e] text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold font-syne mb-8">
            GST invoices. Auto-calculated. Every time.
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-2xl font-bold mb-2">CGST + SGST</div>
              <p className="text-gray-300">for intra-state orders</p>
            </div>
            <div>
              <div className="text-2xl font-bold mb-2">IGST</div>
              <p className="text-gray-300">for inter-state orders</p>
            </div>
            <div>
              <div className="text-2xl font-bold mb-2">GSTR-1 Ready</div>
              <p className="text-gray-300">CSV export (Pro)</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-400 mt-8">
            Works for all print types — flex, digital, offset, screen, packaging
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold font-syne text-center mb-12 text-[#1e3a5f]">
            Why small shops choose PrintFlow
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4">Paper/WhatsApp</th>
                  <th className="text-center py-3 px-4">eFlexo</th>
                  <th className="text-center py-3 px-4 bg-orange-50 text-orange-600 font-semibold">PrintFlow</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Order tracking</td>
                  <td className="text-center py-3 px-4">❌ Manual</td>
                  <td className="text-center py-3 px-4">✅ Yes</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ Yes</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">GST invoices</td>
                  <td className="text-center py-3 px-4">❌ Manual</td>
                  <td className="text-center py-3 px-4">✅ Yes</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ Yes</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Free plan</td>
                  <td className="text-center py-3 px-4">✅ Free</td>
                  <td className="text-center py-3 px-4">❌ ₹6,970/yr</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ Free forever</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Mobile-first</td>
                  <td className="text-center py-3 px-4">✅ WhatsApp</td>
                  <td className="text-center py-3 px-4">❌ Desktop only</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ Built for phone</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">WhatsApp notify</td>
                  <td className="text-center py-3 px-4">❌ Manual</td>
                  <td className="text-center py-3 px-4">❌ SMS only</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ One tap</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Setup time</td>
                  <td className="text-center py-3 px-4">❌ None needed</td>
                  <td className="text-center py-3 px-4">❌ Book a demo</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ 5 minutes</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Telugu / Hindi</td>
                  <td className="text-center py-3 px-4">✅</td>
                  <td className="text-center py-3 px-4">❌ English only</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ EN+TE+HI</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 bg-[#fafaf8]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold font-syne text-center mb-4 text-[#1e3a5f]">
            Start free. Upgrade when you grow.
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-xl shadow-sm p-8 hover-lift">
              <h3 className="text-2xl font-bold text-[#1e3a5f] mb-2">FREE</h3>
              <div className="text-3xl font-bold mb-4">
                ₹0<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600 mb-6">Perfect for small shops just getting started</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>50 orders per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>1 staff account</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Order tracking</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>GST invoices</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>WhatsApp notifications</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Online order form</span>
                </li>
              </ul>
              
              <Link href="/signup" className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center block">
                Start Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-[#f97316] p-8 hover-lift transform scale-105">
              <div className="bg-[#f97316] text-white text-sm font-semibold py-1 px-3 rounded-full inline-block mb-4">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-bold text-[#1e3a5f] mb-2">PRO</h3>
              <div className="text-3xl font-bold mb-4">
                ₹499<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600 mb-6">For growing print shops</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Everything in Free, plus:</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Unlimited orders</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Up to 10 staff accounts</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>GST reports + GSTR-1 export</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Customer loyalty tracking</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Priority support</span>
                </li>
              </ul>
              
              <Link href="/signup" className="w-full bg-[#f97316] text-white py-3 rounded-lg font-semibold hover:bg-[#ea580c] transition-colors text-center block">
                Start Pro Trial
              </Link>
            </div>

            {/* Business Plan */}
            <div className="bg-white rounded-xl shadow-sm p-8 hover-lift">
              <h3 className="text-2xl font-bold text-[#1e3a5f] mb-2">BUSINESS</h3>
              <div className="text-3xl font-bold mb-4">
                ₹999<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600 mb-6">For large print shops and chains</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Everything in Pro, plus:</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Unlimited staff</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Reorder prediction alerts</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>API access</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Dedicated support</span>
                </li>
              </ul>
              
              <Link href="/signup" className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center block">
                Contact Us
              </Link>
            </div>
          </div>
          
          <p className="text-center text-gray-600 mt-8">
            All plans include GST invoicing. No setup fees. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold font-syne text-center mb-12 text-[#1e3a5f]">
            Trusted by print shops across India
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl">
              <Quote className="w-8 h-8 text-[#f97316] mb-4" />
              <p className="text-gray-700 mb-4 italic">
                &quot;Earlier I used to write 30 invoices a week by hand. Now PrintFlow generates them in seconds with GST.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center font-semibold mr-3">
                  RK
                </div>
                <div>
                  <p className="font-semibold">Ravi Kumar</p>
                  <p className="text-sm text-gray-600">Sri Lakshmi Printers, Vijayawada</p>
                  <div className="flex text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl">
              <Quote className="w-8 h-8 text-[#f97316] mb-4" />
              <p className="text-gray-700 mb-4 italic">
                &quot;My customers now track their own orders using the link I share. No more &apos;when is my order ready?&apos; calls.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center font-semibold mr-3">
                  SB
                </div>
                <div>
                  <p className="font-semibold">Suresh Babu</p>
                  <p className="text-sm text-gray-600">Flash Digital Prints, Hyderabad</p>
                  <div className="flex text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl">
              <Quote className="w-8 h-8 text-[#f97316] mb-4" />
              <p className="text-gray-700 mb-4 italic">
                &quot;Free plan is more than enough for my small shop. Finally software made for shops like mine.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center font-semibold mr-3">
                  AR
                </div>
                <div>
                  <p className="font-semibold">Anand Raj</p>
                  <p className="text-sm text-gray-600">Star Flex Prints, Chirala</p>
                  <div className="flex text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="py-16 px-4 sm:px-6 lg:px-8 bg-[#1e3a5f] text-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-5xl font-bold font-syne mb-2">
                {counters.shops}+
              </div>
              <p className="text-xl">Print shops across India</p>
            </div>
            <div>
              <div className="text-5xl font-bold font-syne mb-2">
                ₹{counters.orders.toLocaleString()}+
              </div>
              <p className="text-xl">Orders managed monthly</p>
            </div>
            <div>
              <div className="text-5xl font-bold font-syne mb-2">
                {counters.years}+
              </div>
              <p className="text-xl">Years serving printers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1e3a5f] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold font-syne mb-6">
            Your print shop runs on hard work.<br />
            Let PrintFlow handle the paperwork.
          </h2>
          <p className="text-xl mb-8 text-gray-300">
            Join printing businesses across India who manage smarter with PrintFlow. Free to start, always.
          </p>
          <Link href="/signup" className="bg-[#f97316] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#ea580c] transition-colors inline-flex items-center">
            Start Free Today
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            No credit card · No demo call · Setup in 5 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold font-syne mb-4">
                <span className="text-[#1e3a5f]">Print</span>
                <span className="text-[#f97316]">Flow</span>
              </div>
              <p className="text-gray-600 mb-4">Made in India 🇮🇳 for Indian print shops</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#features" className="hover:text-[#1e3a5f]">Features</a></li>
                <li><a href="#pricing" className="hover:text-[#1e3a5f]">Pricing</a></li>
                <li><a href="#" className="hover:text-[#1e3a5f]">How It Works</a></li>
                <li><a href="#" className="hover:text-[#1e3a5f]">Changelog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Compare</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-[#1e3a5f]">vs eFlexo</a></li>
                <li><a href="#" className="hover:text-[#1e3a5f]">vs Tally</a></li>
                <li><a href="#" className="hover:text-[#1e3a5f]">vs WhatsApp</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-[#1e3a5f]">Help Center</a></li>
                <li><a href="#" className="hover:text-[#1e3a5f]">WhatsApp Support</a></li>
                <li><a href="#" className="hover:text-[#1e3a5f]">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 mb-4 md:mb-0">
              © 2025 PrintFlow. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm text-gray-600">
              <a href="#" className="hover:text-[#1e3a5f]">Privacy Policy</a>
              <a href="#" className="hover:text-[#1e3a5f]">Terms of Service</a>
              <a href="#" className="hover:text-[#1e3a5f]">Refund Policy</a>
            </div>
            <div className="flex space-x-4 text-sm">
              <button className="text-gray-600 hover:text-[#1e3a5f]">English</button>
              <button className="text-gray-600 hover:text-[#1e3a5f]">తెలుగు</button>
              <button className="text-gray-600 hover:text-[#1e3a5f]">हिंदी</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
