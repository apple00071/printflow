"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, Check, ArrowRight, Star, Quote, MessageCircle, FileText, Users, Package, Globe, BarChart, UserPlus, Settings, Rocket, ShieldCheck, Download, Languages, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { translations, Language } from "./translations";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [counters, setCounters] = useState({ shops: 0, orders: 0, years: 0 });
  const [lang, setLang] = useState<Language>('en');
  
  const t = translations[lang];
  
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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'DM Sans', 'Noto Sans Telugu', sans-serif;
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

        .glass-card {
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }

        .connector-line {
          background: linear-gradient(90deg, #f97316 0%, #1e3a5f 100%);
        }
      `}</style>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full bg-white border-b border-gray-200 z-50 transition-all ${scrollY > 10 ? 'shadow-sm' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Logo showText={true} />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">{t.nav.features}</a>
              <a href="#pricing" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">{t.nav.pricing}</a>
              <a href="#why-us" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">{t.nav.whyUs}</a>
              <Link href="/login" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">{t.nav.login}</Link>
              <Link href="/signup" className="bg-[#f97316] text-white px-6 py-2 rounded-lg hover:bg-[#ea580c] transition-colors">
                {t.nav.startFree}
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
                <a href="#features" className="text-gray-600 hover:text-[#1e3a5f] py-2">{t.nav.features}</a>
                <a href="#pricing" className="text-gray-600 hover:text-[#1e3a5f] py-2">{t.nav.pricing}</a>
                <a href="#why-us" className="text-gray-600 hover:text-[#1e3a5f] py-2">{t.nav.whyUs}</a>
                <Link href="/login" className="text-gray-600 hover:text-[#1e3a5f] py-2">{t.nav.login}</Link>
                <Link href="/signup" className="bg-[#f97316] text-white px-6 py-2 rounded-lg hover:bg-[#ea580c] transition-colors text-center">
                  {t.nav.startFree}
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
              <h1 className="text-4xl sm:text-5xl lg:text-3xl font-normal font-syne leading-tight mb-4">
                <span className="text-[#1e3a5f]">{t.hero.title1}</span><br />
                <span className="text-[#f97316] font-extrabold">{t.hero.title2}</span>
              </h1>
              
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                {t.hero.subtitle}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Link href="/signup" className="bg-[#f97316] text-white px-8 py-4 rounded-lg text-lg font-normal hover:bg-[#ea580c] transition-colors flex items-center justify-center">
                  {t.hero.ctaPrimary}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <button 
                  onClick={scrollToFeatures}
                  className="border-2 border-[#1e3a5f] text-[#1e3a5f] px-8 py-4 rounded-lg text-lg font-normal hover:bg-[#1e3a5f] hover:text-white transition-colors"
                >
                  {t.hero.ctaSecondary}
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-600">{t.hero.tags.free}</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-600">{t.hero.tags.gst}</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-600">{t.hero.tags.setup}</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-600">{t.hero.tags.mobile}</span>
                </div>
              </div>
            </div>
            
            {/* Phone Mockup */}
            <div className="relative floating">
              <div className="bg-gray-900 rounded-[3rem] p-2 max-w-sm mx-auto">
                <div className="bg-white rounded-[2.5rem] p-4">
                  {/* Phone Status Bar */}
                  <div className="flex justify-between items-center mb-4 text-xs">
                    <span className="font-normal">9:41</span>
                    <div className="flex space-x-1">
                      <div className="w-4 h-3 bg-gray-800 rounded-sm"></div>
                      <div className="w-4 h-3 bg-gray-800 rounded-sm"></div>
                      <div className="w-4 h-3 bg-gray-800 rounded-sm"></div>
                    </div>
                  </div>
                  
                  {/* App Header */}
                  <div className="bg-[#1e3a5f] text-white p-3 rounded-lg mb-3">
                    <div className="flex justify-between items-center">
                      <Logo variant="light" showText={true} className="scale-75 origin-left" />
                      <span className="text-xs">🇮🇳</span>
                    </div>
                  </div>
                  
                  {/* Order List */}
                  <div className="space-y-2">
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-normal text-sm">Visiting Cards</p>
                          <p className="text-xs text-gray-600">Ravi Kumar • 500 pcs</p>
                        </div>
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">Ready</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-normal">₹1,500</span>
                        <button className="bg-green-500 text-white text-xs px-3 py-1 rounded flex items-center">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          WhatsApp
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-normal text-sm">Wedding Cards</p>
                          <p className="text-xs text-gray-600">Suresh • 200 sets</p>
                        </div>
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">Printing</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-normal">₹5,000</span>
                        <span className="text-xs text-gray-500">Due tomorrow</span>
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-normal text-sm">Letterheads</p>
                          <p className="text-xs text-gray-600">Anand • 1000 pcs</p>
                        </div>
                        <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">Design</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-normal">₹800</span>
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
          <h2 className="text-4xl font-normal font-syne text-center mb-12 text-[#1e3a5f]">
            {t.painPoints.title}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {t.painPoints.items.map((item: any, idx: number) => (
              <div key={idx} className="bg-white p-6 rounded-xl border-l-4 border-[#f97316] shadow-sm hover-lift">
                <div className="text-4xl mb-4">{item.emoji}</div>
                <h3 className="text-xl font-normal mb-3 text-[#1e3a5f]">{item.title}</h3>
                <p className="text-gray-600">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-16 px-4 sm:px-6 lg:px-8 bg-[#fafaf8]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-normal font-syne text-center mb-4 text-[#1e3a5f]">
            {t.features.title}
          </h2>
          <p className="text-xl text-center text-gray-600 mb-12 max-w-3xl mx-auto">
            {t.features.subtitle}
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-[#1e3a5f]" />
              </div>
              <h3 className="text-xl font-normal mb-3 text-[#1e3a5f]">{t.features.items[0].title}</h3>
              <p className="text-gray-600">
                {t.features.items[0].desc}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-normal mb-3 text-[#1e3a5f]">{t.features.items[1].title}</h3>
              <p className="text-gray-600">
                {t.features.items[1].desc}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-normal mb-3 text-[#1e3a5f]">{t.features.items[2].title}</h3>
              <p className="text-gray-600">
                {t.features.items[2].desc}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[#f97316]" />
              </div>
              <h3 className="text-xl font-normal mb-3 text-[#1e3a5f]">{t.features.items[3].title}</h3>
              <p className="text-gray-600">
                {t.features.items[3].desc}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-normal mb-3 text-[#1e3a5f]">{t.features.items[4].title}</h3>
              <p className="text-gray-600">
                {t.features.items[4].desc}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover-lift animate-fade-up">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-normal mb-3 text-[#1e3a5f]">{t.features.items[5].title}</h3>
              <p className="text-gray-600">
                {t.features.items[5].desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0f172a] text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#f97316] rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1e3a5f] rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal font-syne mb-2">
              {t.howItWorks.title} <span className="text-[#f97316]">{t.howItWorks.time}</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {t.howItWorks.desc}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-[40%] left-[15%] right-[15%] h-0.5 connector-line z-0 opacity-20"></div>

            <div className="flex flex-col items-center text-center group translate-y-0 hover:-translate-y-2 transition-transform duration-300">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-[#1e3a5f] rounded-2xl flex items-center justify-center text-3xl font-normal border border-white/10 group-hover:border-[#f97316]/50 transition-colors">
                  <UserPlus className="w-10 h-10 text-[#f97316]" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#f97316] rounded-full flex items-center justify-center text-sm font-normal shadow-lg">1</div>
              </div>
              <h3 className="text-2xl font-normal mb-4 font-syne">{t.howItWorks.steps[0].title}</h3>
              <p className="text-gray-400 leading-relaxed">{t.howItWorks.steps[0].desc}</p>
            </div>
            
            <div className="flex flex-col items-center text-center group translate-y-0 hover:-translate-y-2 transition-transform duration-300">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-[#1e3a5f] rounded-2xl flex items-center justify-center text-3xl font-normal border border-white/10 group-hover:border-[#f97316]/50 transition-colors">
                  <Settings className="w-10 h-10 text-[#f97316]" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#f97316] rounded-full flex items-center justify-center text-sm font-normal shadow-lg">2</div>
              </div>
              <h3 className="text-2xl font-normal mb-4 font-syne">{t.howItWorks.steps[1].title}</h3>
              <p className="text-gray-400 leading-relaxed">{t.howItWorks.steps[1].desc}</p>
            </div>
            
            <div className="flex flex-col items-center text-center group translate-y-0 hover:-translate-y-2 transition-transform duration-300">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-[#1e3a5f] rounded-2xl flex items-center justify-center text-3xl font-normal border border-white/10 group-hover:border-[#f97316]/50 transition-colors">
                  <Rocket className="w-10 h-10 text-[#f97316]" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#f97316] rounded-full flex items-center justify-center text-sm font-normal shadow-lg">3</div>
              </div>
              <h3 className="text-2xl font-normal mb-4 font-syne">{t.howItWorks.steps[2].title}</h3>
              <p className="text-gray-400 leading-relaxed">{t.howItWorks.steps[2].desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* GST Callout */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white text-[#1e3a5f]">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card bg-[#1e3a5f] rounded-[2rem] p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <FileText className="w-64 h-64 -rotate-12" />
            </div>

            <div className="relative z-10">
              <div className="text-center mb-16">
                <span className="bg-[#f97316] text-white text-xs font-normal px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 inline-block">
                  Compliance Made Simple
                </span>
                <h2 className="text-3xl md:text-5xl font-normal font-syne mb-4">
                  GST invoices. Auto-calculated. Every time.
                </h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
                  <ShieldCheck className="w-12 h-12 text-[#f97316] mb-6" />
                  <div className="text-2xl font-normal mb-2 font-syne">CGST + SGST</div>
                  <p className="text-gray-400">Perfectly split for local intra-state orders across India.</p>
                </div>
                
                <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
                  <Globe className="w-12 h-12 text-[#f97316] mb-6" />
                  <div className="text-2xl font-normal mb-2 font-syne">IGST Support</div>
                  <p className="text-gray-400">Handle inter-state digital orders with correct IGST automatically.</p>
                </div>
                
                <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
                  <Download className="w-12 h-12 text-[#f97316] mb-6" />
                  <div className="text-2xl font-normal mb-2 font-syne">GSTR-1 Ready</div>
                  <p className="text-gray-400">Export clean CSV reports for your CA in seconds.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="why-us" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-normal font-syne text-center mb-12 text-[#1e3a5f]">
            Why small shops choose PrintFlow
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4">Paper/WhatsApp</th>
                  <th className="text-center py-3 px-4">eFlexo</th>
                  <th className="text-center py-3 px-4 bg-orange-50 text-orange-600 font-normal">PrintFlow</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 font-normal">Order tracking</td>
                  <td className="text-center py-3 px-4">❌ Manual</td>
                  <td className="text-center py-3 px-4">✅ Yes</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ Yes</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-normal">GST invoices</td>
                  <td className="text-center py-3 px-4">❌ Manual</td>
                  <td className="text-center py-3 px-4">✅ Yes</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ Yes</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-normal">Free plan</td>
                  <td className="text-center py-3 px-4">✅ Free</td>
                  <td className="text-center py-3 px-4">❌ ₹6,970/yr</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ Free forever</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-normal">Mobile-first</td>
                  <td className="text-center py-3 px-4">✅ WhatsApp</td>
                  <td className="text-center py-3 px-4">❌ Desktop only</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ Built for phone</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-normal">WhatsApp notify</td>
                  <td className="text-center py-3 px-4">❌ Manual</td>
                  <td className="text-center py-3 px-4">❌ SMS only</td>
                  <td className="text-center py-3 px-4 bg-orange-50">✅ One tap</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-normal">Languages</td>
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
          <h2 className="text-4xl font-normal font-syne text-center mb-4 text-[#1e3a5f]">
            {t.pricing.title}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-xl shadow-sm p-8 hover-lift">
              <h3 className="text-2xl font-normal text-[#1e3a5f] mb-2">{t.pricing.plans.free.name}</h3>
              <div className="text-3xl font-normal mb-4">
                {t.pricing.plans.free.price}<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600 mb-6">{t.pricing.plans.free.desc}</p>
              
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
              </ul>
              
              <Link href="/signup" className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg font-normal hover:bg-gray-200 transition-colors text-center block">
                {t.pricing.plans.free.cta}
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-[#f97316] p-8 hover-lift transform scale-105">
              <div className="bg-[#f97316] text-white text-sm font-normal py-1 px-3 rounded-full inline-block mb-4">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-normal text-[#1e3a5f] mb-2">{t.pricing.plans.pro.name}</h3>
              <div className="text-3xl font-normal mb-4">
                {t.pricing.plans.pro.price}<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600 mb-6">{t.pricing.plans.pro.desc}</p>
              
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
              </ul>
              
              <Link href="/signup" className="w-full bg-[#f97316] text-white py-3 rounded-lg font-normal hover:bg-[#ea580c] transition-colors text-center block">
                {t.pricing.plans.pro.cta}
              </Link>
            </div>

            {/* Business Plan */}
            <div className="bg-white rounded-xl shadow-sm p-8 hover-lift">
              <h3 className="text-2xl font-normal text-[#1e3a5f] mb-2">{t.pricing.plans.business.name}</h3>
              <div className="text-3xl font-normal mb-4">
                {t.pricing.plans.business.price}<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600 mb-6">{t.pricing.plans.business.desc}</p>
              
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
                  <span>Dedicated support</span>
                </li>
              </ul>
              
              <Link href="/signup" className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg font-normal hover:bg-gray-200 transition-colors text-center block">
                {t.pricing.plans.business.cta}
              </Link>
            </div>
          </div>
          <p className="text-center text-gray-600 mt-8">{t.pricing.gstIncluded}</p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-normal font-syne text-center mb-12 text-[#1e3a5f]">
            Trusted by print shops across India
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl">
              <Quote className="w-8 h-8 text-[#f97316] mb-4" />
              <p className="text-gray-700 mb-4 italic">
                &quot;Earlier I used to write 30 invoices a week by hand. Now PrintFlow generates them in seconds with GST.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center font-normal mr-3">RK</div>
                <div>
                  <p className="font-normal">Ravi Kumar</p>
                  <p className="text-sm text-gray-600">Sri Lakshmi Printers, Vijayawada</p>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                </div>
              </div>
            </div>
            {/* Add more testimonials if needed, or keep it concise */}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="py-16 px-4 sm:px-6 lg:px-8 bg-[#1e3a5f] text-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-5xl font-normal font-syne mb-2">{counters.shops}+</div>
              <p className="text-xl">Print shops across India</p>
            </div>
            <div>
              <div className="text-5xl font-normal font-syne mb-2">₹{counters.orders.toLocaleString()}+</div>
              <p className="text-xl">Orders managed monthly</p>
            </div>
            <div>
              <div className="text-5xl font-normal font-syne mb-2">{counters.years}+</div>
              <p className="text-xl">Years serving printers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1e3a5f] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-normal font-syne mb-6">
            Your print shop runs on hard work.<br />
            Let PrintFlow handle the paperwork.
          </h2>
          <p className="text-xl mb-8 text-gray-300">
            Join printing businesses across India who manage smarter with PrintFlow. Free to start, always.
          </p>
          <Link href="/signup" className="bg-[#f97316] text-white px-8 py-4 rounded-lg text-lg font-normal hover:bg-[#ea580c] transition-colors inline-flex items-center">
            Start Free Today
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4"><Logo /></div>
              <p className="text-gray-600 mb-4">Made in India 🇮🇳 for Indian print shops</p>
            </div>
            <div>
              <h4 className="font-normal mb-4">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#features" className="hover:text-[#1e3a5f]">Features</a></li>
                <li><a href="#pricing" className="hover:text-[#1e3a5f]">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-normal mb-4">Compare</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-[#1e3a5f]">vs eFlexo</a></li>
                <li><a href="#" className="hover:text-[#1e3a5f]">vs WhatsApp</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-normal mb-4">Support</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-[#1e3a5f]">WhatsApp Support</a></li>
                <li><a href="#" className="hover:text-[#1e3a5f]">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} PrintFlow. Made for Bharat 🇮🇳</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-[#1e3a5f] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[#1e3a5f] transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Widgets */}
      <div className="fixed bottom-6 left-6 z-[60] flex flex-col gap-3">
        <button
          onClick={() => setLang(lang === 'en' ? 'te' : 'en')}
          className="bg-white border border-gray-200 text-[#1e3a5f] p-3 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center group relative"
          title={lang === 'en' ? 'Switch to Telugu' : 'Switch to English'}
        >
          <Languages className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-medium whitespace-nowrap">
            {lang === 'en' ? 'తెలుగు' : 'English'}
          </span>
          <span className="absolute -top-2 -right-2 bg-[#f97316] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase">
            {lang.toUpperCase()}
          </span>
        </button>
      </div>

      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-4 items-end">
        <a
          href={`https://wa.me/918247494622?text=${encodeURIComponent(t.whatsapp.prefixedMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:shadow-green-500/20 hover:scale-110 transition-all flex items-center justify-center group relative ring-4 ring-white"
        >
          <div className="absolute -top-12 right-0 bg-white text-gray-800 text-sm px-4 py-2 rounded-xl shadow-xl border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {t.whatsapp.tooltip}
            <div className="absolute -bottom-1 right-5 w-2 h-2 bg-white rotate-45 border-r border-b border-gray-100"></div>
          </div>
          <Phone className="w-7 h-7 fill-current" />
          <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20"></div>
        </a>
      </div>
    </div>
  );
}
