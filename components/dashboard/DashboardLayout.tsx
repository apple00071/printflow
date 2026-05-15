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
  X
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
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardList },
  { name: "Quotations", href: "/dashboard/quotations", icon: FileText },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Expenses", href: "/dashboard/expenses", icon: Wallet },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Billing", href: "/dashboard/billing", icon: Receipt },
  { name: "Team", href: "/dashboard/team", icon: Users },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const supabase = createClient();

  useEffect(() => {
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
    const intervalId = setInterval(runSync, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex font-sans text-slate-900">
      <CommandPalette isOpen={isSearchOpen} setIsOpen={setIsSearchOpen} />

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Professional Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out transform lg:translate-x-0 lg:static",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
             <Logo variant="dark" size="sm" showText={true} />
             <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-auto p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
             </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-slate-100 text-slate-900" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-slate-900" : "text-slate-400")} />
                  {t(item.name, item.name)}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t("Sign Out", "లాగ్అవుట్")}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600">
              <Menu className="w-6 h-6" />
            </button>
            
            <div 
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors max-w-md w-full"
            >
              <Search className="w-4 h-4" />
              <span>Search everything...</span>
              <div className="ml-auto flex items-center gap-1 opacity-50">
                 <kbd className="px-1 py-0.5 text-[10px] bg-white border border-slate-200 rounded">⌘</kbd>
                 <kbd className="px-1 py-0.5 text-[10px] bg-white border border-slate-200 rounded">K</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                {["en", "te", "hi"].map(lang => (
                   <button 
                      key={lang}
                      onClick={() => setLanguage(lang as any)}
                      className={cn(
                        "px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                        language === lang ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                   >
                      {lang}
                   </button>
                ))}
             </div>

             <button className="relative p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-slate-900 rounded-full border-2 border-white"></span>
             </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
