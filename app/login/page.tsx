"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRESS_CONFIG } from "@/lib/config";
import { useLanguage } from "@/lib/context/LanguageContext";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let emailToUse = email;
      
      // If it doesn't look like an email, treat as username
      if (!email.includes("@")) {
        // Special handling for Apple super admin
        if (email.toLowerCase() === 'apple') {
          emailToUse = 'apple@admin.com';
        } else {
          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .ilike("username", email)
            .maybeSingle();

          if (profileError || !data) {
            throw new Error(t("Username not found", "యూజర్ నేమ్ కనుగొనబడలేదు"));
          }
          
          emailToUse = `${email.toLowerCase()}@applegraphics.local`;
        }
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (signInError) throw signInError;
      
      // Check user role to determine redirect
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, tenant_id')
          .eq('id', user.id)
          .single();
        
        // Redirect based on role
        if (profile?.role === 'ADMIN' && !profile?.tenant_id) {
          // Super admin - redirect to admin dashboard
          window.location.href = "/admin";
        } else {
          // Regular user/tenant - redirect to regular dashboard
          window.location.href = "/dashboard";
        }
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || t("Invalid credentials", "తప్పుడు వివరాలు"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
        
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
          <div className="text-center">
            <h1 className="text-4xl  tracking-tighter text-primary uppercase">
              {PRESS_CONFIG.name}
            </h1>
            <p className="mt-2 text-xs text-gray-500  uppercase tracking-widest">
              {t(PRESS_CONFIG.tagline, "ప్రింటింగ్ రంగంలో అత్యుత్తమ సంస్థ")}
            </p>
          </div>
          <h2 className="mt-8 text-center text-2xl  text-gray-900 tracking-tight">
            {t("Login", "లాగిన్")}
          </h2>
        </div>
        <form className="w-full space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-xs  text-red-700 border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[10px]  text-gray-500 uppercase tracking-wider mb-1">
                {t("Username", "యూజర్ నేమ్")}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("e.g. Apple", "ఉదా: Apple")}
                  className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-[10px]  text-gray-500 uppercase tracking-wider mb-1">
                {t("Password", "పాస్‌వర్డ్")}
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all"
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
              className="group relative flex w-full justify-center rounded-xl bg-orange px-4 py-4 text-sm  text-white hover:bg-orange/90 focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 disabled:opacity-50 transition-all shadow-lg shadow-orange/20"
            >
              {loading ? (t("Signing in...", "లాగిన్ అవుతోంది...")) : t("Login", "లాగిన్")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
