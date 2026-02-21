"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { OtpInput } from "@/components/auth/OtpInput";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabase = getSupabaseBrowserClient();

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function handleVerify() {
    if (otp.length < 6) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      setOtp("");
      return;
    }

    router.push("/dashboard");
  }

  async function handleResend() {
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      setError(error.message);
      return;
    }
    // Start 60s cooldown
    setResendCooldown(60);
    timerRef.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-2">Check your email</h2>
      <p className="text-sm text-muted-foreground mb-1">
        We sent a 6-digit code to
      </p>
      <p className="text-sm font-medium text-gray-900 mb-6">{email}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <OtpInput
        value={otp}
        onChange={setOtp}
        disabled={loading}
      />

      <button
        onClick={handleVerify}
        disabled={otp.length < 6 || loading}
        className="mt-6 w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Verifying…" : "Verify code"}
      </button>

      <div className="mt-4 text-sm text-muted-foreground">
        Didn&apos;t receive it?{" "}
        {resendCooldown > 0 ? (
          <span>Resend in {resendCooldown}s</span>
        ) : (
          <button
            onClick={handleResend}
            className="text-blue-600 hover:underline"
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );
}
