"use client";

import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getConnectedProviders,
  hasPassword,
  getPrimaryProvider,
} from "@/lib/supabase/auth-helpers";
import type { AuthProvider } from "@/types";

interface UserState {
  user: User | null;
  session: Session | null;
  connectedProviders: AuthProvider[];
  hasPasswordSet: boolean;
  primaryProvider: AuthProvider | null;
  loading: boolean;
}

/**
 * Reactive hook that exposes the current Supabase user session and
 * derived auth state (connected providers, hasPassword, etc.).
 * Subscribes to onAuthStateChange to stay in sync with login/logout.
 */
export function useUser(): UserState {
  const [state, setState] = useState<UserState>({
    user: null,
    session: null,
    connectedProviders: [],
    hasPasswordSet: false,
    primaryProvider: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setState({
        user,
        session,
        connectedProviders: getConnectedProviders(user),
        hasPasswordSet: hasPassword(user),
        primaryProvider: getPrimaryProvider(user),
        loading: false,
      });
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setState({
        user,
        session,
        connectedProviders: getConnectedProviders(user),
        hasPasswordSet: hasPassword(user),
        primaryProvider: getPrimaryProvider(user),
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
