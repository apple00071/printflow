"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  ClipboardList, 
  Users, 
  Plus, 
  X,
  ArrowRight,
  Command as CommandIcon 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";

interface SearchResult {
  id: string;
  type: "order" | "customer";
  title: string;
  subtitle: string;
  href: string;
}

export default function CommandPalette({ 
  isOpen, 
  setIsOpen 
}: { 
  isOpen: boolean; 
  setIsOpen: (open: boolean) => void 
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const tenant = await getCurrentTenant(supabase);
      if (!tenant) return;

      // Search Orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, friendly_id, customers(name)")
        .eq("tenant_id", tenant.id)
        .or(`friendly_id.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`)
        .limit(3);

      // Search Customers
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone")
        .eq("tenant_id", tenant.id)
        .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(3);

      const combined: SearchResult[] = [
        ...(orders || []).map(o => ({
          id: o.id,
          type: "order" as const,
          title: o.friendly_id || `Order #${o.id.slice(0, 8)}`,
          subtitle: `Customer: ${Array.isArray(o.customers) ? (o.customers as unknown as Record<string, string>[])[0]?.name : (o.customers as unknown as Record<string, string>)?.name || "Unknown"}`,
          href: `/dashboard/orders/${o.id}`
        })),
        ...(customers || []).map(c => ({
          id: c.id,
          type: "customer" as const,
          title: c.name,
          subtitle: c.phone || "No phone",
          href: `/dashboard/customers/${c.id}`
        }))
      ];

      setResults(combined);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  // Handle Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400" />
          <input 
            autoFocus
            type="text"
            placeholder="Search orders, customers, or try 'New order'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-5 text-gray-900 outline-none placeholder:text-gray-400 text-lg"
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading && (
            <div className="p-4 text-center text-gray-400 animate-pulse">Searching...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-8 text-center text-gray-500">
               <p className="font-medium">No results found for &quot;{query}&quot;</p>
               <p className="text-sm mt-1">Try searching by Order ID, name, or phone number.</p>
            </div>
          )}

          {!query && (
            <div className="p-3">
               <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Quick Commands</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  <CommandItem 
                    icon={ClipboardList} 
                    title="View All Orders" 
                    subtitle="Open the order ledger"
                    onClick={() => { router.push("/dashboard/orders"); setIsOpen(false); }}
                  />
                  <CommandItem 
                    icon={Plus} 
                    title="Create New Order" 
                    subtitle="Start a new job portal"
                    onClick={() => { router.push("/dashboard/orders/new"); setIsOpen(false); }}
                  />
               </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2 space-y-1">
               {results.map((result) => (
                 <button
                   key={`${result.type}-${result.id}`}
                   onClick={() => { router.push(result.href); setIsOpen(false); }}
                   className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-primary/5 group transition-all text-left"
                 >
                   <div className={`p-2 rounded-lg ${result.type === 'order' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'} group-hover:scale-110 transition-transform`}>
                     {result.type === 'order' ? <ClipboardList className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                   </div>
                   <div className="flex-1">
                     <p className="text-sm font-bold text-gray-900">{result.title}</p>
                     <p className="text-xs text-gray-500">{result.subtitle}</p>
                   </div>
                   <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                 </button>
               ))}
            </div>
          )}
        </div>

        <div className="bg-gray-50/80 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                 <kbd className="px-1.5 py-0.5 text-[10px] font-sans font-semibold text-gray-400 bg-white border border-gray-200 rounded shadow-sm">Enter</kbd>
                 <span className="text-[10px] text-gray-400">to select</span>
              </div>
              <div className="flex items-center gap-1.5">
                 <kbd className="px-1.5 py-0.5 text-[10px] font-sans font-semibold text-gray-400 bg-white border border-gray-200 rounded shadow-sm">Esc</kbd>
                 <span className="text-[10px] text-gray-400">to close</span>
              </div>
           </div>
           <div className="flex items-center gap-1 text-[10px] font-bold text-primary/40 uppercase tracking-tighter">
              <CommandIcon className="w-3 h-3" /> QuickFind
           </div>
        </div>
      </div>
    </div>
  );
}

interface CommandItemProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
}

function CommandItem({ icon: Icon, title, subtitle, onClick }: CommandItemProps) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 group transition-all text-left"
    >
      <div className="p-2 bg-white border border-gray-100 rounded-lg group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-900">{title}</p>
        <p className="text-[10px] text-gray-400">{subtitle}</p>
      </div>
    </button>
  );
}
