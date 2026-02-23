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
    <header className="h-14 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-5 shrink-0">
      <div />

      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="p-1.5 text-[#64748B] hover:text-[#2F8AE5] hover:bg-[#2F8AE5]/8 rounded-lg transition-all duration-200"
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
              className="rounded-full shadow-ct-sm"
            />
          </Link>
        ) : (
          <Link
            href="/settings"
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2F8AE5] to-[#7DB3E8] text-white flex items-center justify-center text-sm font-semibold shadow-ct-sm"
          >
            {initials}
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="p-1.5 text-[#64748B] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
