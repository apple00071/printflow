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
  Layers
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
  {
    name: "Dashboard",
    telugu: "డాష్బోర్డ్",
    hindi: "डैशबोर्ड",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Orders",
    telugu: "ఆర్డర్లు",
    hindi: "ऑर्डर",
    href: "/dashboard/orders",
    icon: ClipboardList,
  },
  {
    name: "Quotations",
    telugu: "కొటేషన్లు",
    hindi: "कोटेशन",
    href: "/dashboard/quotations",
    icon: FileText,
  },
  {
    name: "Inventory",
    telugu: "ఇన్వెంటరీ",
    hindi: "इन्वेंटरी",
    href: "/dashboard/inventory",
    icon: Package,
  },
  {
    name: "Expenses",
    telugu: "ఖర్చులు",
    hindi: "खर्चे",
    href: "/dashboard/expenses",
    icon: Wallet,
  },
  {
    name: "Customers",
    telugu: "కస్టమర్లు",
    hindi: "ग्राहक",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    name: "Billing",
    telugu: "బిల్లింగ్",
    hindi: "बिलिंग",
    href: "/dashboard/billing",
    icon: Receipt,
  },
  {
    name: "Team",
    telugu: "టీమ్",
    hindi: "टीम",
    href: "/dashboard/team",
    icon: Users,
  },
  {
    name: "PDF Imposer",
    telugu: "పిడిఎఫ్ ఇంపొజర్",
    hindi: "पीडीएफ इम्पोजर",
    href: "/dashboard/tools/imposer",
    icon: Layers,
  },
  {
    name: "Settings",
    telugu: "సెట్టింగులు",
    hindi: "सेटिंग्स",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    function handleClickOutside(event: MouseEvent) {
      const isOutsideDesktop = desktopQuickActionRef.current && !desktopQuickActionRef.current.contains(event.target as Node);
      const isOutsideMobile = mobileQuickActionRef.current && !mobileQuickActionRef.current.contains(event.target as Node);
      
      if (isOutsideDesktop && isOutsideMobile) {
        setIsQuickActionOpen(false);
      }
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getPageTitle = () => {
    if (pathname === "/admin") return "Super Admin";
    
    const item = navItems.find(item => item.href === pathname);
    if (item) return t(item.name, item.telugu, item.hindi);
    
    // Sub-routes
    if (pathname.includes("/inventory")) return t("Inventory", "ఇన్వెంటరీ", "इन्वेंटरी");
    if (pathname.includes("/expenses")) return t("Expenses", "ఖర్చులు", "खर्चे");
    if (pathname.includes("/orders/new")) return t("New Order", "కొత్త ఆర్డర్", "नया ऑर्डर");
    if (pathname.includes("/orders/")) return t("Order Details", "ఆర్డర్ వివరాలు", "ऑर्डर विवरण");
    if (pathname.includes("/customers/")) return t("Customer Profile", "కస్టమర్ ప్రొఫైల్", "ग्राहक प्रोफाईल");
    
    return t("Dashboard", "డాష్బోర్డ్", "डैशबोर्ड");
  };

  const quickActions = [
    { label: t("New Order", "కొత్త ఆర్డర్", "नया ऑर्डर"), href: "/dashboard/orders/new", icon: ClipboardList },
    { label: t("New Quotation", "కొత్త కొటేషన్", "नया कोटेशन"), href: "/dashboard/quotations/new", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Search Palette Overlay */}
      <CommandPalette isOpen={isSearchOpen} setIsOpen={setIsSearchOpen} />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-primary text-white transition-all duration-300 ease-in-out transform",
          "w-48",
          isSidebarOpen ? "translate-x-0 lg:w-48" : "-translate-x-full lg:w-20 lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-start overflow-hidden whitespace-nowrap">
             <Logo variant="light" showText={isSidebarOpen} size="sm" className={cn("transition-all duration-300", !isSidebarOpen && "scale-110 ml-1")} />
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 rounded-lg transition-all duration-200 group overflow-hidden whitespace-nowrap",
                    isActive 
                      ? "bg-white text-primary shadow-md" 
                      : "text-white/70 hover:bg-white/20 hover:text-white"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 shrink-0 transition-transform",
                    isActive ? "text-primary scale-110" : "text-white/50 group-hover:text-white group-hover:scale-110"
                  )} />
                  <div className={cn("flex flex-col transition-all duration-300", isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none")}>
                    <span className="text-sm font-medium">{t(item.name, item.telugu, item.hindi)}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3.5 py-3 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200 overflow-hidden whitespace-nowrap"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <div className={cn("flex flex-col items-start transition-all duration-300", isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none")}>
                <span className="text-sm font-medium">{t("Logout", "లాగ్అవుట్", "लॉगआउट")}</span>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn("flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out", isSidebarOpen ? "lg:ml-48" : "lg:ml-20")}>
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-6 flex-1">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden text-gray-600 hover:bg-gray-100 rounded-md">
                <Menu className="w-6 h-6" />
              </button>
              {/* Page heading removed as requested - page title is handled inside the page component for more control */}
            </div>

            {/* Global Search Interface */}
            <div className="hidden sm:flex items-center flex-1 max-w-md relative group cursor-pointer" onClick={() => setIsSearchOpen(true)}>
              <Search className="absolute left-3 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                readOnly
                placeholder={t("Search orders, customers...", "ఆర్డర్లు, కస్టమర్ల కోసం వెతకండి...", "ऑर्डर, ग्राहकों को खोजें...")}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none transition-all group-hover:bg-white cursor-pointer"
              />
              <div className="absolute right-3 hidden lg:flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-sans font-semibold text-gray-400 bg-white border border-gray-200 rounded">Ctrl</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-sans font-semibold text-gray-400 bg-white border border-gray-200 rounded">K</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Actions (Desktop) */}
            <div className="relative hidden sm:block" ref={desktopQuickActionRef}>
              <button 
                onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{t("Quick Action", "త్వరిత చర్య", "त्वरित कार्रवाई")}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", isQuickActionOpen && "rotate-180")} />
              </button>

              {isQuickActionOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("Create New", "కొత్తది సృష్టించు", "नया बनाएँ")}</p>
                  </div>
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setIsQuickActionOpen(false);
                        router.push(action.href);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors"
                    >
                      <action.icon className="w-4 h-4" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions (Mobile FAB) */}
            <div className="fixed bottom-6 right-6 z-[60] sm:hidden" ref={mobileQuickActionRef}>
               <button 
                  onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                  className="w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all outline-none"
               >
                  <Plus className={cn("w-7 h-7 transition-transform duration-300", isQuickActionOpen && "rotate-45")} />
               </button>

                {isQuickActionOpen && (
                 <div className="absolute bottom-16 right-0 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 mb-2 animate-in slide-in-from-bottom-5 fade-in">
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t("Create New", "కొత్తది సృష్టించు", "नया बनाएँ")}</p>
                    </div>
                    {quickActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setIsQuickActionOpen(false);
                          router.push(action.href);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-600 active:bg-gray-100 transition-colors"
                      >
                        <action.icon className="w-5 h-5 text-primary" />
                        {action.label}
                      </button>
                    ))}
                 </div>
               )}
            </div>

            <button className="p-2 text-gray-400 hover:text-primary relative group">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange rounded-full border-2 border-white"></span>
            </button>

            <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
               <button onClick={() => setLanguage("en")} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all", language === "en" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600")}>EN</button>
               <button onClick={() => setLanguage("te")} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all", language === "te" ? "bg-primary text-white shadow-sm" : "text-gray-400 hover:text-gray-600")}>తె</button>
               <button onClick={() => setLanguage("hi")} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all", language === "hi" ? "bg-orange text-white shadow-sm" : "text-gray-400 hover:text-gray-600")}>हि</button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
