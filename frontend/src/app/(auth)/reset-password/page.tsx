"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash (#access_token=...).
    // @supabase/ssr / supabase-js detects the hash and sets a recovery session.
    // We need to call getSession() to pick it up.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setError("Invalid or expired reset link. Please request a new one.");
      }
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Sign out and redirect to login so user can sign in with new password
    await supabase.auth.signOut();
    router.push("/login?reset=success");
  }

  if (!sessionReady && !error) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        Verifying reset link…
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-center mb-2">Set new password</h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Choose a strong password of at least 8 characters.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          {!sessionReady && (
            <div className="mt-2">
              <Link href="/forgot-password" className="text-blue-600 hover:underline">
                Request a new reset link
              </Link>
            </div>
          )}
        </div>
      )}

      {sessionReady && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your new password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Updating…" : "Set new password"}
          </button>
        </form>
      )}
    </div>
  );
}
