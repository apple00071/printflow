"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/context/LanguageContext";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { getInvitation, acceptInvitation } from "@/lib/supabase/actions";

function RegisterContent() {
  const { language, setLanguage, t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invitationValid, setInvitationValid] = useState<boolean | null>(null);

  // 1. Verify invitation on load if email is provided
  useEffect(() => {
    const checkInvitation = async () => {
      const inviteEmail = searchParams.get("email");
      if (!inviteEmail) return;

      const { data, error } = await getInvitation(inviteEmail);

      if (error || !data) {
        setInvitationValid(false);
      } else if (data.status === "ACCEPTED") {
        setError(t("You have already joined this team! Please login instead.", "మీరు ఇప్పటికే ఈ టీమ్‌లో చేరారు! దయచేసి లాగిన్ అవ్వండి."));
        setInvitationValid(true);
      } else {
        setInvitationValid(true);
        setName(data.name || "");
      }
    };

    checkInvitation();
  }, [searchParams, supabase, t]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Verify invitation again via server action
      const { data: invite, error: inviteError } = await getInvitation(email);

      if (inviteError || !invite || invite.status !== 'PENDING') {
        if (invite?.status === 'ACCEPTED') {
          throw new Error(t("You have already joined this team! Please login instead.", "మీరు ఇప్పటికే ఈ టీమ్‌లో చేరారు! దయచేసి లాగిన్ అవ్వండి."));
        }
        throw new Error(t("No valid invitation found for this email.", "ఈ ఈమెయిల్ కోసం చెల్లుబాటు అయ్యే ఆహ్వానం కనుగొనబడలేదు."));
      }

      // 2. Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Registration failed");

      // 3. Complete Registration (create profile & mark invite accepted) via server action
      const { error: completeError } = await acceptInvitation(email, authData.user.id, name);

      if (completeError) throw new Error(completeError);

      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (invitationValid === false && searchParams.get("email")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-red-100 flex flex-col items-center text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-2" />
          <h2 className="text-2xl font-bold text-gray-900">Invalid Invitation</h2>
          <p className="text-gray-600">
            This invitation has expired, been used, or does not exist. Please ask your administrator to send a new invitation.
          </p>
          <Link href="/signup" className="mt-4 text-primary font-medium hover:underline">
            Create a new business instead
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-5 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
        
        {/* Language Switcher */}
        <div className="self-end flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 mb-2 text-[10px] ">
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
            {t("Join your team", "మీ బృందంలో చేరండి")}
          </h2>
        </div>

        <form className="w-full space-y-4" onSubmit={handleRegister}>
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                {t("Full Name", "పూర్తి పేరు")}
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                {t("Email Address", "ఈమెయిల్ చిరునామా")}
              </label>
              <input
                id="email"
                type="email"
                required
                readOnly={!!searchParams.get("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all shadow-inner"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                {t("Create Password", "పాస్‌వర్డ్ సృష్టించండి")}
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
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
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t("Join Team", "టీమ్‌లో చేరండి")
              )}
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}
