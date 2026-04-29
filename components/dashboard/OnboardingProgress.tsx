"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Users,
  ClipboardList,
  Wallet,
  Settings,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { markOnboardingComplete } from "@/lib/supabase/actions";
import { useLanguage } from "@/lib/context/LanguageContext";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  href: string;
  isCompleted: boolean;
}

export default function OnboardingProgress() {
  const { t } = useLanguage();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function checkProgress() {
      try {
        const tenant = await getCurrentTenant(supabase);
        if (!tenant) return;

        if (tenant.onboarding_complete) {
           setIsDismissed(true);
           setLoading(false);
           return;
        }

        const { count: customerCount } = await supabase
          .from("customers")
          .select("*", { count: 'exact', head: true })
          .eq('tenant_id', tenant.id);

        const { count: orderCount } = await supabase
          .from("orders")
          .select("*", { count: 'exact', head: true })
          .eq('tenant_id', tenant.id);

        const { count: expenseCount } = await supabase
          .from("expenses")
          .select("*", { count: 'exact', head: true })
          .eq('tenant_id', tenant.id);

        const onboardingTasks: Task[] = [
          {
            id: "shop-profile",
            title: "Complete Shop Profile",
            subtitle: "Add your logo and address",
            icon: Settings,
            href: "/dashboard/settings",
            isCompleted: !!tenant.logo_url && !!tenant.city
          },
          {
            id: "first-customer",
            title: "Add First Customer",
            subtitle: "Start building your database",
            icon: Users,
            href: "/dashboard/customers",
            isCompleted: (customerCount || 0) > 0
          },
          {
            id: "first-order",
            title: "Create First Order",
            subtitle: "Generate your first job card",
            icon: ClipboardList,
            href: "/dashboard/orders/new",
            isCompleted: (orderCount || 0) > 0
          },
          {
            id: "first-expense",
            title: "Record an Expense",
            subtitle: "Track your paper or ink costs",
            icon: Wallet,
            href: "/dashboard/expenses",
            isCompleted: (expenseCount || 0) > 0
          }
        ];

        setTasks(onboardingTasks);
        const completedCount = onboardingTasks.filter(t => t.isCompleted).length;
        setProgress((completedCount / onboardingTasks.length) * 100);
      } catch (err) {
        console.error("Progress check error:", err);
      } finally {
        setLoading(false);
      }
    }
    checkProgress();
  }, [supabase]);

  const handleDismiss = async () => {
     setIsDismissed(true);
     try {
        await markOnboardingComplete();
     } catch (err) {
        console.error("Failed to dismiss onboarding:", err);
     }
  };

  if (loading || isDismissed || progress === 100) return null;

  return (
    <div className="bg-[#f0f9f6] rounded-3xl border border-[#dcf2e9] p-8 overflow-hidden relative mb-8">
      {/* Decorative background element */}
      <div className="absolute right-0 top-0 w-64 h-64 bg-green-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">
            {t("Finish setting up your workspace", "మీ వర్క్‌స్పేస్‌ను సెటప్ చేయడం పూర్తి చేయండి", "अपना कार्यक्षेत्र सेट करना समाप्त करें")}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {t("A few quick items so job cards, statements, and WhatsApp messages use the right details.", "కొన్ని చిన్న పనులు చేయడం వల్ల జాబ్ కార్డ్‌లు మరియు వాట్సాప్ మెసేజ్‌లు సరైన వివరాలతో వెళ్తాయి.", "कुछ त्वरित चीज़ें ताकि जॉब कार्ड, स्टेटमेंट और व्हाट्सएप संदेश सही विवरण का उपयोग करें।")}
          </p>

          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {task.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className={cn(
                    "text-sm font-medium",
                    task.isCompleted ? "text-green-700" : "text-gray-600"
                  )}>
                    {task.title}
                  </span>
                  {task.isCompleted && (
                    <span className="text-[10px] text-green-600/70 font-semibold uppercase tracking-tighter">Done</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-4 mt-8">
            <button
              onClick={() => {
                const nextTask = tasks.find(t => !t.isCompleted);
                if (nextTask) router.push(nextTask.href);
              }}
              className="px-6 py-2.5 bg-[#10b981] text-white rounded-xl text-sm font-bold shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {t("Continue guided setup", "గైడెడ్ సెటప్ కొనసాగించండి", "निर्देशित सेटअप जारी रखें")}
            </button>
            <button 
              onClick={handleDismiss}
              className="px-6 py-2.5 bg-white text-gray-500 border border-gray-100 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
            >
              {t("Remind me in 7 days", "7 రోజుల తర్వాత గుర్తు చేయండి", "7 दिनों में मुझे याद दिलाएं")}
            </button>
          </div>
        </div>

        <div className="hidden lg:flex flex-col items-center justify-center p-6 bg-white/50 rounded-3xl border border-white/20 backdrop-blur-sm min-w-[150px]">
           <div className="relative w-20 h-20 flex items-center justify-center mb-2">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-100"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={226}
                  strokeDashoffset={226 - (226 * progress) / 100}
                  className="text-[#10b981] transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xl font-bold text-[#1e3a5f]">{Math.round(progress)}%</span>
           </div>
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Setup Progress</p>
        </div>
      </div>
    </div>
  );
}
