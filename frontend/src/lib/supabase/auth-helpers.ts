import type { User } from "@supabase/supabase-js";
import type { AuthProvider } from "@/types";

/**
 * Returns all auth providers the user has linked.
 * Reads from user.identities which is populated by Supabase Auth.
 *
 * Examples:
 *   Google-only user → ["google"]
 *   Email+Password user → ["email"]
 *   Linked user → ["google", "email"]
 */
export function getConnectedProviders(user: User | null): AuthProvider[] {
  if (!user?.identities) return [];
  return user.identities.map((i) => i.provider as AuthProvider);
}

/**
 * Returns true if the user has an email+password identity linked.
 * An email identity means the user either signed up with email/password
 * or added a password after signing up with Google.
 */
export function hasPassword(user: User | null): boolean {
  if (!user?.identities) return false;
  return user.identities.some((i) => i.provider === "email");
}

/**
 * Returns the primary auth provider (the one used to first sign up).
 * Falls back to reading user.app_metadata.provider (set by Supabase on signup).
 */
export function getPrimaryProvider(user: User | null): AuthProvider | null {
  if (!user) return null;
  const provider = user.app_metadata?.provider as AuthProvider | undefined;
  return provider ?? null;
}

/**
 * Returns true if the user signed up via Google OAuth and has NOT yet
 * added an email+password identity.
 */
export function isGoogleOnly(user: User | null): boolean {
  const providers = getConnectedProviders(user);
  return providers.includes("google") && !providers.includes("email");
}

/**
 * Returns true if the user signed up via email (OTP or password) and
 * has NOT yet linked a Google account.
 */
export function isEmailOnly(user: User | null): boolean {
  const providers = getConnectedProviders(user);
  return providers.includes("email") && !providers.includes("google");
}
