import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Supabase Auth callback route.
 * Handles:
 *   1. OAuth code exchange (Google sign-in / account linking)
 *   2. OTP email redirect (if configured to redirect rather than token)
 *
 * We upsert the profiles row here as a reliable fallback — the database
 * trigger handle_new_user() may not fire in all Supabase hosted environments.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (!code) {
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
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
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

  // Ensure the profiles row exists. The DB trigger handle_new_user() should
  // have created it, but it can silently fail in Supabase hosted environments.
  // ignoreDuplicates: true means we never overwrite an existing profile.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        email: user.email ?? null,
        full_name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
  }

  return response;
}
