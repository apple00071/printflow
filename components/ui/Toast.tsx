"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToastState } from "@/hooks/useToast";

interface ToastProps {
  toast: ToastState;
  onDismiss: () => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />,
    error: <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />,
  };

  const styles = {
    success: "border-green-200",
    error: "border-red-200",
    info: "border-blue-200",
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-4 py-3 rounded-xl bg-white border shadow-lg max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300",
        styles[toast.type]
      )}
    >
      {icons[toast.type]}
      <p className="text-sm text-gray-700 flex-1">{toast.message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="p-1 hover:bg-gray-100 rounded-full transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
      >
        <X className="w-3.5 h-3.5 text-gray-400" />
      </button>
    </div>
  );
}
