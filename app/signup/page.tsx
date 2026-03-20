"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/context/LanguageContext";
import { slugify, generateRandomDigits } from "@/lib/utils";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function SignupPage() {
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            business_name: businessName,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");

      // 2. Create Tenant
      const slug = `${slugify(businessName)}-${generateRandomDigits()}`;
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          name: businessName,
          slug,
          plan: "PRO",
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          onboarding_complete: false,
          email: email
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 3. Update Profile (trigger creates it, so we upsert/update)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: authData.user.id,
          username: email.split("@")[0],
          name: businessName,
          role: "ADMIN",
          tenant_id: tenant.id
        });

      if (profileError) throw profileError;

      router.push("/onboarding");
    } catch (err: unknown) {
      console.error("Signup error details:", err);
      let message = "An unexpected error occurred";
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "object" && err !== null && "message" in err) {
        message = String((err as { message: unknown }).message);
      } else {
        message = String(err);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-5 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
        
        {/* Language Switcher */}
        <div className="self-end flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 mb-4 text-[10px] ">
          <button 
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-3 py-1 rounded-lg transition-all ${language === "en" ? "bg-white text-primary shadow-sm" : "text-gray-400"}`}
          >
            ENGLISH
          </button>
          <button 
            type="button"
            onClick={() => setLanguage("te")}
            className={`px-3 py-1 rounded-lg transition-all ${language === "te" ? "bg-primary text-white shadow-sm" : "text-gray-400"}`}
          >
            తెలుగు
          </button>
        </div>

        <div className="w-full">
          <div className="flex flex-col items-center mb-6">
            <Logo />
          </div>
          <h2 className="mt-6 text-center text-2xl text-gray-900 tracking-tight">
            {t("Create your account", "ఖాతాను సృష్టించండి")}
          </h2>
        </div>
        <form className="w-full space-y-4" onSubmit={handleSignup}>
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="businessName" className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                {t("Business Name", "వ్యాపారం పేరు")}
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={t("e.g. Royal Printers", "ఉదా: రాయల్ ప్రింటర్స్")}
                className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                {t("Email Address", "ఈమెయిల్ చిరునామా")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                {t("Password", "పాస్‌వర్డ్")}
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-12 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-primary px-4 py-3.5 text-sm font-normal text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
            >
              {loading ? t("Creating Account...", "ఖాతా సృష్టించబడుతోంది...") : t("Start Free Trial", "ఉచితంగా ప్రారంభించండి")}
            </button>
          </div>

          <div className="text-center text-xs text-gray-500">
            {t("Already have an account?", "ఇప్పటికే ఖాతా ఉందా?")} {" "}
            <Link href="/login" className="text-primary hover:underline">
              {t("Login here", "ఇక్కడ లాగిన్ అవ్వండి")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
