"use client";

import { useState, useEffect } from "react";
import { X, Loader2, IndianRupee, CreditCard, Banknote, Landmark } from "lucide-react";
import { useLanguage } from "@/lib/context/LanguageContext";
import { addPayment } from "@/lib/supabase/actions";
import { formatCurrency } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";

interface AddPaymentModalProps {
  orderId?: string;
  balanceDue?: number;
  onSuccess: () => void;
  onClose: () => void;
}

export default function AddPaymentModal({ orderId, balanceDue, onSuccess, onClose }: AddPaymentModalProps) {
  const { t } = useLanguage();
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(orderId);
  const [currentBalance, setCurrentBalance] = useState<number>(balanceDue || 0);
  const [amount, setAmount] = useState<number>(balanceDue || 0);
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [fetchingOrders, setFetchingOrders] = useState(!orderId);
  interface OrderOption {
    id: string;
    friendly_id?: string;
    total_amount: number;
    advance_paid: number;
    balance: number;
    customers?: { name: string } | null;
  }
  const [availableOrders, setAvailableOrders] = useState<OrderOption[]>([]);

  useEffect(() => {
    if (!orderId) {
      const fetchOrders = async () => {
        const supabase = createClient();
        const tenant = await getCurrentTenant(supabase);
        
        const { data } = await supabase
          .from("orders")
          .select("id, friendly_id, total_amount, advance_paid, customers(name)")
          .eq("tenant_id", tenant?.id)
          .order("created_at", { ascending: false });
        
        const unpaid = (data || [])
          .map((o: { id: string; friendly_id?: string; total_amount: number; advance_paid: number; customers: unknown }) => ({
            id: o.id,
            friendly_id: o.friendly_id,
            total_amount: o.total_amount,
            advance_paid: o.advance_paid,
            balance: Number(o.total_amount || 0) - Number(o.advance_paid || 0),
            customers: Array.isArray(o.customers) ? o.customers[0] : o.customers
          }))
          .filter(o => o.balance > 0);
        
        setAvailableOrders(unpaid);
        setFetchingOrders(false);
      };
      fetchOrders();
    }
  }, [orderId]);

  const handleOrderChange = (id: string) => {
    const ord = availableOrders.find(o => o.id === id);
    if (ord) {
      setSelectedOrderId(id);
      setCurrentBalance(ord.balance);
      setAmount(ord.balance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || amount <= 0) return;
    
    setLoading(true);
    try {
      await addPayment(selectedOrderId, amount, method);
      onSuccess();
      onClose();
    } catch {
      console.error("Error adding payment");
      alert(t("Failed to add payment. Please try again.", "పేమెంట్ జోడించడం విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి."));
    } finally {
      setLoading(false);
    }
  };

  const methods = [
    { id: "cash", label: t("Cash", "నగదు"), icon: Banknote },
    { id: "upi", label: "UPI / PhonePe", icon: CreditCard },
    { id: "bank", label: t("Bank Transfer", "బ్యాంక్ బదిలీ"), icon: Landmark },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-medium text-gray-900">{t("Add Payment", "పేమెంట్ జోడించండి")}</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">{t("Record a new transaction", "కొత్త లావాదేవీని నమోదు చేయండి")}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {!orderId && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("Select Order", "ఆర్డర్ ఎంచుకోండి")}</label>
              <select
                required
                disabled={fetchingOrders}
                value={selectedOrderId || ""}
                onChange={(e) => handleOrderChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-xl text-sm font-medium text-gray-900 outline-none transition-all"
              >
                <option value="" disabled>{fetchingOrders ? t("Loading orders...", "ఆర్డర్లు లోడ్ అవుతున్నాయి...") : t("Choose an outstanding order", "బకాయి ఉన్న ఆర్డర్‌ను ఎంచుకోండి")}</option>
                {availableOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.friendly_id || o.id.split('-')[0]} - {o.customers?.name} (₹{o.balance})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("Amount to Pay", "చెల్లించాల్సిన మొత్తం")}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">₹</span>
              <input
                type="number"
                required
                autoFocus={!!orderId}
                max={currentBalance}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-xl text-xl font-medium text-gray-900 outline-none transition-all shadow-inner"
              />
            </div>
            {selectedOrderId && (
              <p className="text-[10px] text-gray-400 italic">
                {t("Balance Due", "మిగిలిన బకాయి")}: <span className="text-primary font-medium">{formatCurrency(currentBalance)}</span>
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("Payment Method", "పేమెంట్ విధానం")}</label>
            <div className="grid grid-cols-1 gap-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all group ${
                    method === m.id 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-gray-100 hover:border-gray-200 text-gray-600"
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    method === m.id ? "bg-primary text-white" : "bg-gray-100 text-gray-400 group-hover:text-gray-600"
                  }`}>
                    <m.icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm tracking-tight">{m.label}</span>
                  {method === m.id && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading || !selectedOrderId || amount <= 0}
              className="w-full py-3.5 bg-primary text-white font-medium uppercase tracking-wider rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <IndianRupee className="w-5 h-5" />
                  {t("Confirm Payment", "పేమెంట్ ధృవీకరించు")}
                </>
              )}
            </button>
            <p className="text-[9px] text-center text-gray-400 uppercase tracking-tighter">
              {t("This will update the order balance and record a revenue event", "ఇది ఆర్డర్ బకాయిని అప్‌డేట్ చేస్తుంది మరియు ఆదాయాన్ని నమోదు చేస్తుంది")}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
