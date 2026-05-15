"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Receipt, 
  Settings, 
  LogOut,
  Menu,
  FileText,
  Wallet,
  Package,
  Plus,
  Search,
  Bell,
  ChevronDown,
  Layers,
  Zap,
  Sparkles
} from "lucide-react";

import { Logo } from "@/components/Logo";
import { useLanguage } from "@/lib/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import CommandPalette from "./CommandPalette";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: "Dashboard", telugu: "డాష్బోర్డ్", hindi: "डैशबोर्ड", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", telugu: "ఆర్డర్లు", hindi: "ऑर्डर", href: "/dashboard/orders", icon: ClipboardList },
  { name: "Quotations", telugu: "కొటేషన్లు", hindi: "कोटेशन", href: "/dashboard/quotations", icon: FileText },
  { name: "Inventory", telugu: "ఇన్వెంటరీ", hindi: "इन्वेंटरी", href: "/dashboard/inventory", icon: Package },
  { name: "Expenses", telugu: "ఖర్చులు", hindi: "खर्चे", href: "/dashboard/expenses", icon: Wallet },
  { name: "Customers", telugu: "కస్టమర్లు", hindi: "ग्राहक", href: "/dashboard/customers", icon: Users },
  { name: "Billing", telugu: "బిల్లింగ్", hindi: "बिलिंग", href: "/dashboard/billing", icon: Receipt },
  { name: "Team", telugu: "టీమ్", hindi: "टीम", href: "/dashboard/team", icon: Users },
  { name: "Settings", telugu: "సెట్టింగులు", hindi: "सेटिंग्स", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const desktopQuickActionRef = useRef<HTMLDivElement>(null);
  const mobileQuickActionRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const supabase = createClient();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    const runSync = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: integration } = await supabase.from("tenant_integrations").select("id").eq("type", "GMAIL").eq("is_active", true).maybeSingle();
        if (!integration) return;
        fetch("/api/integrations/gmail/sync").catch(console.error);
      } catch (err) {
        console.error("Background sync failed:", err);
      }
    };
    runSync();
    intervalId = setInterval(runSync, 2 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isOutsideDesktop = desktopQuickActionRef.current && !desktopQuickActionRef.current.contains(event.target as Node);
      const isOutsideMobile = mobileQuickActionRef.current && !mobileQuickActionRef.current.contains(event.target as Node);
      if (isOutsideDesktop && isOutsideMobile) setIsQuickActionOpen(false);
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex font-sans selection:bg-slate-900 selection:text-white">
      <CommandPalette isOpen={isSearchOpen} setIsOpen={setIsSearchOpen} />

      {/* Floating Modern Sidebar */}
      <aside 
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        className={cn(
          "fixed inset-y-4 left-4 z-40 bg-slate-900 text-white rounded-[32px] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl overflow-hidden",
          isSidebarOpen ? "w-64" : "w-20 hidden lg:flex"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 mb-4">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                   <Zap className="w-5 h-5 text-slate-900 fill-slate-900" />
                </div>
                {isSidebarOpen && <span className="font-black uppercase tracking-[0.2em] text-sm animate-in fade-in duration-500">PrintFlow</span>}
             </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-500 group relative",
                    isActive 
                      ? "bg-white text-slate-900 shadow-xl" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0 transition-transform duration-500 group-hover:scale-110", isActive && "text-slate-900")} />
                  {isSidebarOpen && (
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] animate-in slide-in-from-left-2 duration-500">
                      {t(item.name, item.telugu, item.hindi)}
                    </span>
                  )}
                  {isActive && !isSidebarOpen && (
                    <div className="absolute right-0 w-1 h-4 bg-white rounded-l-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-6 border-t border-white/5">
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-4 w-full px-4 py-3.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all duration-300"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="text-[11px] font-black uppercase tracking-[0.15em]">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Perspective Container */}
      <div className={cn("flex-1 flex flex-col min-w-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]", isSidebarOpen ? "lg:ml-72" : "lg:ml-28")}>
        
        {/* Floating Glass Header */}
        <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-30 pointer-events-none">
          <div className="flex-1 max-w-xl pointer-events-auto">
             <div 
               onClick={() => setIsSearchOpen(true)}
               className="group flex items-center gap-4 px-6 py-3 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-[20px] shadow-sm cursor-pointer hover:shadow-md transition-all duration-500"
             >
                <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("Command Palette", "వెతకండి", "खोजें")}</span>
                <div className="ml-auto flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                   <kbd className="px-1.5 py-0.5 text-[9px] font-black border border-slate-200 rounded">⌘</kbd>
                   <kbd className="px-1.5 py-0.5 text-[9px] font-black border border-slate-200 rounded">K</kbd>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-6 pointer-events-auto">
             <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/40">
                {["en", "te", "hi"].map(lang => (
                   <button 
                      key={lang}
                      onClick={() => setLanguage(lang as any)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        language === lang ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                   >
                      {lang}
                   </button>
                ))}
             </div>

             <div className="h-10 w-10 bg-slate-900 rounded-[14px] flex items-center justify-center text-white shadow-xl shadow-slate-200 cursor-pointer hover:scale-110 transition-all duration-500">
                <Bell className="w-4 h-4" />
             </div>
          </div>
        </header>

        <main className="flex-1 p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Menu Trigger */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-8 left-8 z-[60] lg:hidden w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center animate-bounce"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Floating Action FAB */}
      <div className="fixed bottom-8 right-8 z-[60]">
         <Link 
           href="/dashboard/orders/new"
           className="w-16 h-16 bg-slate-900 text-white rounded-[24px] shadow-2xl flex items-center justify-center hover:scale-110 hover:rotate-12 transition-all duration-500 group"
         >
            <Plus className="w-8 h-8 group-hover:scale-125 transition-transform" />
         </Link>
      </div>
    </div>
  );
}
