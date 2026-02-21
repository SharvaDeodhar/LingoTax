"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ConnectedProviders } from "@/components/settings/ConnectedProviders";
import { AddPasswordForm } from "@/components/settings/AddPasswordForm";
import { LanguagePreference } from "@/components/settings/LanguagePreference";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

export default function SettingsPage() {
  const router = useRouter();
  const { user, connectedProviders, hasPasswordSet, loading } = useUser();
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<string>("en");
  const supabase = getSupabaseBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleConnectGoogle() {
    await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Loading settings…
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const langLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === (user.user_metadata?.preferred_language ?? "en"))?.label ?? "English";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Account info */}
      <div className="p-4 border rounded-lg space-y-1">
        <p className="text-sm font-medium">{user.email}</p>
        <p className="text-xs text-muted-foreground">User ID: {user.id}</p>
      </div>

      {/* Connected providers */}
      <ConnectedProviders
        connectedProviders={connectedProviders}
        hasPassword={hasPasswordSet}
        onAddPassword={() => setShowAddPassword(true)}
        onConnectGoogle={handleConnectGoogle}
      />

      {showAddPassword && (
        <AddPasswordForm
          userId={user.id}
          onSuccess={() => {
            setShowAddPassword(false);
          }}
          onCancel={() => setShowAddPassword(false)}
        />
      )}

      {/* Language preference */}
      <div className="border-t pt-6">
        <LanguagePreference
          userId={user.id}
          currentLanguage={preferredLanguage}
          onSaved={() => {}}
        />
      </div>

      {/* Logout */}
      <div className="border-t pt-6">
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
