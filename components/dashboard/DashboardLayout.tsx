"use client";

import { useState } from "react";
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
  Printer,
  Crown
} from "lucide-react";
import { useLanguage } from "@/lib/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { PRESS_CONFIG } from "@/lib/config";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useEffect } from "react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  {
    name: "Dashboard",
    telugu: "డాష్బోర్డ్",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Orders",
    telugu: "ఆర్డర్లు",
    href: "/dashboard/orders",
    icon: ClipboardList,
  },
  {
    name: "Customers",
    telugu: "కస్టమర్లు",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    name: "Billing",
    telugu: "బిల్లింగ్",
    href: "/dashboard/billing",
    icon: Receipt,
  },
  {
    name: "Team",
    telugu: "టీమ్",
    href: "/dashboard/team",
    icon: Users,
  },
  {
    name: "Settings",
    telugu: "సెట్టింగులు",
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const supabase = createClient();

  // Check if user is super admin
  useEffect(() => {
    async function checkSuperAdmin() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single();
          
          // Super admin = ADMIN role + no tenant_id
          setIsSuperAdmin(profile?.role === 'ADMIN' && !profile?.tenant_id);
        }
      } catch (error) {
        console.error('Error checking super admin:', error);
        setIsSuperAdmin(false);
      }
    }
    
    checkSuperAdmin();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Dynamic Title Mapping
  const getPageTitle = () => {
    // Check for admin route first
    if (pathname === "/admin") return "Super Admin";
    
    const item = navItems.find(item => item.href === pathname);
    if (item) return t(item.name, item.telugu);
    
    // Sub-routes handling
    if (pathname.includes("/orders/new")) return t("New Order", "కొత్త ఆర్డర్");
    if (pathname.includes("/orders/edit/")) return t("Edit Order", "ఆర్డర్ సవరించండి");
    if (pathname.includes("/orders/")) return t("Order Details", "ఆర్డర్ వివరాలు");
    if (pathname.includes("/customers/")) return t("Customer Profile", "కస్టమర్ ప్రొఫైల్");
    if (pathname.includes("/billing/invoice/")) return t("Invoice", "ఇన్వాయిస్");
    
    return t("Dashboard", "డాష్బోర్డ్");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-primary text-white transition-all duration-300 ease-in-out transform lg:translate-x-0 lg:static lg:inset-0",
          "w-64", // Mobile width
          isSidebarOpen ? "translate-x-0 lg:w-64" : "-translate-x-full lg:w-20 lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="p-6 border-b border-white/10 flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <Printer className="w-8 h-8 text-orange shrink-0" />
            <div className={cn(
              "transition-all duration-300",
              isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
            )}>
              <h1 className=" text-lg leading-tight">{PRESS_CONFIG.name}</h1>
              <p className="text-[10px] text-white/60 tracking-wider">CHIRALA, AP</p>
            </div>
          </div>

          {/* Navigation */}
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
                      ? "bg-white text-primary  shadow-md" 
                      : "text-white/70 hover:bg-white/20 hover:text-white"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 shrink-0 transition-transform",
                    isActive ? "text-primary scale-110" : "text-white/50 group-hover:text-white group-hover:scale-110"
                  )} />
                  <div className={cn(
                    "flex flex-col transition-all duration-300",
                    isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
                  )}>
                    <span className="text-sm">{t(item.name, item.telugu)}</span>
                  </div>
                </Link>
              );
            })}

            {/* Super Admin Menu Item - Only show for super admin */}
            {isSuperAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-lg transition-all duration-200 group overflow-hidden whitespace-nowrap",
                  pathname === "/admin" 
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md" 
                    : "text-purple-200 hover:bg-purple-600/30 hover:text-white border border-purple-400/30"
                )}
              >
                <Crown className={cn(
                  "w-5 h-5 shrink-0 transition-transform",
                  pathname === "/admin" ? "text-white scale-110" : "text-purple-300 group-hover:text-white group-hover:scale-110"
                )} />
                <div className={cn(
                  "flex flex-col transition-all duration-300",
                  isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
                )}>
                  <span className="text-sm font-medium">Super Admin</span>
                  <span className="text-[10px] opacity-70">SaaS Management</span>
                </div>
              </Link>
            )}
          </nav>

          {/* User Profile / Logout */}
          <div className="p-4 border-t border-white/10">
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3.5 py-3 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200 overflow-hidden whitespace-nowrap"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <div className={cn(
                "flex flex-col items-start transition-all duration-300",
                isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
              )}>
                <span className="text-sm ">{t("Logout", "లాగ్అవుట్")}</span>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Global Selection */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 lg:hidden text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl  text-gray-900 tracking-tight uppercase">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
             <button 
               onClick={() => setLanguage("en")}
               className={cn(
                 "px-4 py-1.5 rounded-lg text-[10px]  transition-all",
                 language === "en" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"
               )}
             >
               ENGLISH
             </button>
             <button 
               onClick={() => setLanguage("te")}
               className={cn(
                 "px-4 py-1.5 rounded-lg text-[10px]  transition-all",
                 language === "te" ? "bg-primary text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
               )}
             >
               తెలుగు
             </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
