import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

/**
 * Supabase Auth callback route.
 * Handles:
 *   1. OAuth code exchange (Google sign-in / account linking)
 *   2. OTP email redirect (if configured to redirect rather than token)
 *
 * The database trigger handle_new_user() is the SINGLE source of truth
 * for creating profiles rows — this route does NOT upsert profiles.
 * It only checks for profile existence in dev mode to catch trigger failures.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    // No code — might be an error redirect or hash-based flow
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieOptionsWithName[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  // In development, verify the trigger fired correctly.
  // Do NOT unconditionally upsert — the trigger is the source of truth.
  if (process.env.NODE_ENV === "development") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        console.error(
          "[auth/callback] Profile trigger did not fire for user:",
          user.id
        );
      }
    }
  }

  return response;
}
