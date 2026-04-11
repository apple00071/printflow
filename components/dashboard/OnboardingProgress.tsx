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

interface Task {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  href: string;
  isCompleted: boolean;
}

export default function OnboardingProgress() {
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
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Get Started</h2>
            <p className="text-xs text-gray-500">Complete these tasks to set up your shop.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
                <p className="text-xl font-bold text-primary">{Math.round(progress)}%</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Complete</p>
            </div>
            <button 
              onClick={handleDismiss}
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group"
              title="Dismiss Guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-gray-100 rounded-full mb-8 overflow-hidden">
           <div 
            className="h-full bg-primary transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
           />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <button
              key={task.id}
              disabled={task.isCompleted}
              onClick={() => router.push(task.href)}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                task.isCompleted 
                ? 'bg-gray-50 border-gray-100 grayscale' 
                : 'bg-white border-gray-100 hover:border-primary hover:shadow-md'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${task.isCompleted ? 'bg-gray-200 text-gray-400' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'} transition-all`}>
                <task.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{task.title}</p>
                <p className="text-[10px] text-gray-500">{task.subtitle}</p>
              </div>
              {task.isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5 text-gray-200 group-hover:text-primary transition-colors" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
