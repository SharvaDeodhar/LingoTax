"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = getSupabaseBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = (user?.email ?? "U")[0].toUpperCase();

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0">
      <div />

      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {avatarUrl ? (
          <Link href="/settings">
            <Image
              src={avatarUrl}
              alt="Profile"
              width={32}
              height={32}
              className="rounded-full"
            />
          </Link>
        ) : (
          <Link
            href="/settings"
            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium"
          >
            {initials}
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
