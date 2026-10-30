"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  CheckCheck, 
  Volume2, 
  VolumeX, 
  QrCode, 
  Package, 
  ChevronRight, 
  X, 
  ExternalLink,
  Sparkles,
  Inbox
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getNotifications } from "@/lib/supabase/actions";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  friendly_id?: string;
  job_type: string;
  quantity?: string;
  status: string;
  total_amount?: number;
  created_at: string;
  customers?: any;
}

function getCustomerName(customer: any): string {
  if (!customer) return "Storefront Customer";
  if (Array.isArray(customer)) {
    return customer[0]?.name || "Storefront Customer";
  }
  return customer.name || "Storefront Customer";
}

// Sound chime using Web Audio API synthesis (0 external asset dependencies)
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First note: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second note: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.warn("Audio chime prevented or unavailable:", err);
  }
}

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const [filter, setFilter] = useState<"ALL" | "RECEIVED">("ALL");
  const popoverRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownIdsRef = useRef<Set<string>>(new Set());

  // Load sound preference & read notification IDs from localStorage
  useEffect(() => {
    try {
      const storedSound = localStorage.getItem("printflow_sound_notifications");
      if (storedSound !== null) {
        setSoundEnabled(storedSound === "true");
      }
      const storedRead = localStorage.getItem("printflow_read_notifications");
      if (storedRead) {
        setReadIds(new Set(JSON.parse(storedRead)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Request browser notification permission gently if supported
  const requestDesktopPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore
      }
    }
  };

  const triggerToastAlert = useCallback((order: NotificationItem) => {
    setActiveToast(order);
    if (soundEnabled) {
      playNotificationChime();
    }
    // Desktop notification if permitted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("🎉 New Print Order Received!", {
          body: `${getCustomerName(order.customers)} submitted an order for ${order.job_type}`,
          icon: "/icon.png"
        });
      } catch {
        // Ignore
      }
    }

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 8000);
  }, [soundEnabled]);

  const loadNotifications = useCallback(async (isInitial = false) => {
    try {
      const data = await getNotifications();
      if (!Array.isArray(data)) return;

      const items = (data as unknown) as NotificationItem[];
      setNotifications(items);

      // Check for newly arrived orders
      const currentIds = new Set(items.map(o => o.id));
      if (!isInitial && lastKnownIdsRef.current.size > 0) {
        const newOrders = items.filter(o => !lastKnownIdsRef.current.has(o.id));
        if (newOrders.length > 0) {
          // Trigger alert on the newest order
          triggerToastAlert(newOrders[0]);
        }
      }

      lastKnownIdsRef.current = currentIds;
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, [triggerToastAlert]);

  // Initial load + Realtime channel subscription + Polling fallback
  useEffect(() => {
    loadNotifications(true);

    const supabase = createClient();
    const channel = supabase
      .channel("realtime-dashboard-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders"
        },
        () => {
          loadNotifications(false);
        }
      )
      .subscribe();

    // 15-second polling fallback guarantees updates in all environments
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications(false);
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [loadNotifications]);

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    try {
      localStorage.setItem("printflow_sound_notifications", String(nextState));
    } catch {
      // Ignore
    }
    if (nextState) {
      playNotificationChime();
    }
  };

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem("printflow_read_notifications", JSON.stringify(Array.from(allIds)));
    } catch {
      // Ignore
    }
  };

  const markAsRead = (id: string) => {
    setReadIds(prev => {
      const updated = new Set(prev);
      updated.add(id);
      try {
        localStorage.setItem("printflow_read_notifications", JSON.stringify(Array.from(updated)));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    setIsOpen(false);
    router.push("/dashboard/orders");
  };

  // Filter unread and display list
  const filteredNotifications = notifications.filter(item => {
    if (filter === "RECEIVED") return item.status === "RECEIVED";
    return true;
  });

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;
  const hasNewReceived = notifications.some(n => !readIds.has(n.id) && n.status === "RECEIVED");

  return (
    <>
      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => {
            setIsOpen(prev => !prev);
            requestDesktopPermission();
          }}
          aria-label="Notifications"
          className="relative p-2.5 text-slate-500 hover:text-[#1e3a5f] hover:bg-slate-100 rounded-full transition-all hover:scale-105 active:scale-95 group/bell focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        >
          <Bell className="w-5 h-5 transition-transform group-hover/bell:rotate-12" />

          {/* Unread badge / pulse */}
          {unreadCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center bg-[#f97316] text-[10px] font-black text-white rounded-full border-2 border-white shadow-sm animate-in zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : hasNewReceived ? (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-ping" />
          ) : null}
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-[#1e3a5f] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm tracking-wide">Order Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Sound Chime Toggle */}
                <button
                  onClick={toggleSound}
                  title={soundEnabled ? "Sound enabled (Click to mute)" : "Sound muted (Click to enable)"}
                  className={cn(
                    "p-1.5 rounded-lg text-xs transition-all",
                    soundEnabled ? "text-emerald-300 hover:bg-white/10" : "text-slate-400 hover:bg-white/10"
                  )}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {/* Mark All Read */}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    title="Mark all as read"
                    className="p-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold">
              <button
                onClick={() => setFilter("ALL")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all",
                  filter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                All Orders ({notifications.length})
              </button>
              <button
                onClick={() => setFilter("RECEIVED")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5",
                  filter === "RECEIVED" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                New Intake (QR)
              </button>
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs font-medium text-slate-600">No recent notifications</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    When customers place orders via your QR storefront, they will alert here instantly.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const isUnread = !readIds.has(item.id);
                  const isQRReceived = item.status === "RECEIVED";

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={cn(
                        "p-3.5 hover:bg-slate-50/80 transition-all cursor-pointer flex items-start gap-3 group relative",
                        isUnread ? "bg-blue-50/40" : "bg-white"
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "p-2 rounded-xl mt-0.5 shrink-0 transition-transform group-hover:scale-105",
                        isQRReceived 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-slate-100 text-slate-600"
                      )}>
                        {isQRReceived ? <QrCode className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {getCustomerName(item.customers)}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {timeAgo(item.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 truncate font-medium">
                          {item.job_type} {item.quantity ? `• Qty: ${item.quantity}` : ""}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {item.friendly_id || `#${item.id.slice(0, 6)}`}
                          </span>

                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                            isQRReceived 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-slate-50 text-slate-600"
                          )}>
                            {isQRReceived ? "QR Intake" : item.status}
                          </span>
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 self-center" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <Link
                href="/dashboard/orders"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#1e3a5f] hover:text-blue-700 transition-colors w-full py-1"
              >
                View all orders in Orders Dashboard
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Floating Animated Toast Banner for Incoming Orders */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 max-w-sm w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shrink-0 shadow-md animate-bounce">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  🎉 New QR Storefront Order!
                </span>
                <button
                  onClick={() => setActiveToast(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-sm font-bold text-slate-900 mt-1 truncate">
                {getCustomerName(activeToast.customers)}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 truncate">
                {activeToast.job_type} {activeToast.quantity ? `(Qty: ${activeToast.quantity})` : ""}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    markAsRead(activeToast.id);
                    setActiveToast(null);
                    router.push("/dashboard/orders");
                  }}
                  className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45] text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                >
                  <span>View Order</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setActiveToast(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
