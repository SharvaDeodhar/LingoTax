"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { AuthProvider } from "@/types";

interface ConnectedProvidersProps {
  connectedProviders: AuthProvider[];
  hasPassword: boolean;
  onAddPassword: () => void;
  onConnectGoogle: () => void;
  loading?: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  email: "Email + Password",
};

export function ConnectedProviders({
  connectedProviders,
  hasPassword,
  onAddPassword,
  onConnectGoogle,
  loading,
}: ConnectedProvidersProps) {
  const hasGoogle = connectedProviders.includes("google");

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Connected sign-in methods
      </h3>

      {/* Google row */}
      <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
        <div className="flex items-center gap-3">
          {hasGoogle ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300" />
          )}
          <div>
            <p className="text-sm font-medium">Google</p>
            <p className="text-xs text-muted-foreground">
              {hasGoogle ? "Connected" : "Not connected"}
            </p>
          </div>
        </div>
        {!hasGoogle && (
          <button
            onClick={onConnectGoogle}
            disabled={loading}
            className="text-xs text-blue-600 hover:underline disabled:opacity-50"
          >
            Connect
          </button>
        )}
      </div>

      {/* Email + Password row */}
      <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
        <div className="flex items-center gap-3">
          {hasPassword ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300" />
          )}
          <div>
            <p className="text-sm font-medium">Email + Password</p>
            <p className="text-xs text-muted-foreground">
              {hasPassword ? "Password set" : "No password — sign in with Google or email code"}
            </p>
          </div>
        </div>
        {!hasPassword && (
          <button
            onClick={onAddPassword}
            disabled={loading}
            className="text-xs text-blue-600 hover:underline disabled:opacity-50"
          >
            Add password
          </button>
        )}
      </div>
    </div>
  );
}
