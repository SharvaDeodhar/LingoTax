"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProviderButton } from "@/components/auth/ProviderButton";

type Tab = "google" | "otp" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success, browser redirects to Google — no further action needed
  }

  async function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "google", label: "Google" },
    { key: "otp", label: "Email code" },
    { key: "password", label: "Password" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-center text-[#0F172A] mb-6">Sign in to LinguaTax</h2>

      {/* Tab selector */}
      <div className="flex rounded-xl border border-[#E2E8F0] mb-6 p-1 bg-[#F8FAFC] gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setError(null); }}
            className={`flex-1 py-2 text-sm font-semibold transition-all duration-200 ${
              tab === t.key
                ? "bg-gradient-to-r from-[#2F8AE5] to-[#7DB3E8] text-white rounded-lg shadow-ct-sm"
                : "bg-transparent text-[#64748B] hover:text-[#0F172A] rounded-lg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Google tab */}
      {tab === "google" && (
        <div className="space-y-4">
          <ProviderButton onClick={handleGoogle} disabled={loading}>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </ProviderButton>
          <p className="text-center text-sm text-[#64748B]">
            No account yet?{" "}
            <Link href="/signup" className="text-[#2F8AE5] font-semibold hover:underline">
              Sign up with email
            </Link>
          </p>
        </div>
      )}

      {/* Email OTP tab */}
      {tab === "otp" && (
        <form onSubmit={handleOtpRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-text"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email}
            className="ct-btn-primary w-full py-2.5 text-sm"
          >
            {loading ? "Sending…" : "Send 6-digit code"}
          </button>
          <p className="text-center text-sm text-[#64748B]">
            No account yet?{" "}
            <Link href="/signup" className="text-[#2F8AE5] font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      )}

      {/* Email + Password tab */}
      {tab === "password" && (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-text"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-text"
            />
          </div>
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-[#2F8AE5] font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="ct-btn-primary w-full py-2.5 text-sm"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}
    </div>
  );
}
